import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { businessId, fileName, filePath, fileSize, fileType } = await req.json();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('ai-knowledge-base')
      .download(filePath);

    if (downloadError) throw downloadError;

    // Convert to text based on file type
    let content = '';
    if (fileType === 'text/plain' || fileType === 'text/html' || fileType === 'text/csv') {
      content = await fileData.text();
    } else if (fileType === 'application/pdf' || fileType.includes('word') || fileType.includes('spreadsheet')) {
      // For production, use a proper document parsing library
      // For now, store a placeholder and suggest manual entry
      content = `[Document content from ${fileName}. Please use the Lovable document parsing feature to extract text from PDFs and Office documents.]`;
    }

    // Create document record
    const { data: doc, error: docError } = await supabase
      .from('ai_knowledge_documents')
      .insert({
        business_id: businessId,
        title: fileName,
        content: content,
        file_name: fileName,
        file_path: filePath,
        file_size: fileSize,
        file_type: fileType,
      })
      .select()
      .single();

    if (docError) throw docError;

    // Chunk the content (simple chunking by paragraphs/sentences)
    const chunks = chunkText(content, 500); // 500 chars per chunk
    const chunkInserts = chunks.map((chunk, index) => ({
      document_id: doc.id,
      business_id: businessId,
      chunk_text: chunk,
      chunk_index: index,
    }));

    // Insert chunks
    const { error: chunkError } = await supabase
      .from('ai_document_chunks')
      .insert(chunkInserts);

    if (chunkError) throw chunkError;

    // Update document with chunk count
    await supabase
      .from('ai_knowledge_documents')
      .update({ chunk_count: chunks.length })
      .eq('id', doc.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        documentId: doc.id, 
        chunks: chunks.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Document processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function chunkText(text: string, maxChunkSize: number): string[] {
  const chunks: string[] = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  let currentChunk = '';
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkSize) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks.filter(c => c.length > 0);
}
