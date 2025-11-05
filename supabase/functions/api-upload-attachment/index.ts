import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key is required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Validate API key
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('*, businesses(*)')
      .eq('key_hash', apiKey)
      .eq('is_active', true)
      .single();

    if (apiKeyError || !apiKeyData) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last_used_at
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyData.id);

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const message_id = formData.get('message_id') as string;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'File is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size (max 20MB)
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({ error: 'File size exceeds 20MB limit' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const business_id = apiKeyData.business_id;
    const fileExt = file.name.split('.').pop();
    const fileName = `${business_id}/${crypto.randomUUID()}.${fileExt}`;

    // Upload to customer_media bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('customer_media')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('customer_media')
      .getPublicUrl(fileName);

    const attachmentData = {
      id: crypto.randomUUID(),
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      file_url: urlData.publicUrl,
      storage_path: fileName
    };

    // If message_id is provided, link the attachment to the message
    if (message_id) {
      const { error: attachError } = await supabase
        .from('message_attachments')
        .insert({
          message_id,
          ...attachmentData
        });

      if (attachError) {
        console.error('Error linking attachment:', attachError);
      }

      // Only trigger auto-parse for images (PDFs need client-side conversion first)
      if (file.type.startsWith('image/')) {
        console.log(`Triggering router for image: ${file.type}`);
        
        supabase.functions.invoke('onebill-parse-router', {
          body: { attachmentUrl: urlData.publicUrl }
        }).catch(err => console.error('Failed to trigger parse router:', err));
      } else if (file.type === 'application/pdf') {
        // Insert pending_conversion status for PDFs - client must convert first
        console.log('PDF uploaded, awaiting client-side conversion');
        
        supabase
          .from('attachment_parse_results')
          .insert({
            attachment_id: attachmentData.id,
            parse_status: 'pending',
            parse_source: 'awaiting_client_conversion',
            parsed_data: { message: 'PDF requires conversion to image. Open attachment and click Parse.' }
          })
          .then(({ error }) => {
            if (error) console.error('Error inserting parse status:', error);
          });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        attachment: attachmentData
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in upload-attachment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});