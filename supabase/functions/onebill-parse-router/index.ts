import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { attachmentUrl } = await req.json();

    if (!attachmentUrl) {
      return new Response(
        JSON.stringify({ error: 'attachmentUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Router: Fetching attachment to detect MIME type:', attachmentUrl);

    // Fetch the file to determine MIME type
    const fileResponse = await fetch(attachmentUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch attachment: ${fileResponse.statusText}`);
    }

    const contentType = fileResponse.headers.get('content-type') || '';
    const blob = await fileResponse.blob();
    const fileSize = blob.size;

    console.log('Router: Detected content-type:', contentType, 'size:', fileSize);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let routerDecision = '';
    let parseResult;

    // Route based on content type
    if (contentType.includes('image/') && !contentType.includes('heic')) {
      // Images (jpeg, png, webp) -> use existing parse-attachment-onebill (Lovable AI/Gemini)
      console.log('Router: Routing to parse-attachment-onebill (Gemini for images)');
      routerDecision = 'gemini-image';

      const response = await supabase.functions.invoke('parse-attachment-onebill', {
        body: { attachmentUrl }
      });

      if (response.error) {
        throw new Error(`Gemini parse failed: ${response.error.message}`);
      }

      parseResult = response.data;

    } else {
      // PDFs, Office docs, CSV, HEIC -> use OpenAI Files API
      console.log('Router: Routing to onebill-parse-openai-files (OpenAI for documents)');
      routerDecision = 'openai-files';

      const response = await supabase.functions.invoke('onebill-parse-openai-files', {
        body: { 
          attachmentUrl,
          contentType,
          fileSize 
        }
      });

      if (response.error) {
        throw new Error(`OpenAI parse failed: ${response.error.message}`);
      }

      parseResult = response.data;
    }

    // Add router metadata to result
    const result = {
      ...parseResult,
      _router: {
        decision: routerDecision,
        contentType,
        fileSize
      }
    };

    console.log('Router: Parse successful via', routerDecision);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Router error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        parse_source: 'router_error',
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
