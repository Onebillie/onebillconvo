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
    const { attachmentId, pdfUrl, storagePath, messageId } = await req.json();

    if (!attachmentId || !pdfUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting PDF conversion:', { attachmentId, pdfUrl });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Update status to processing
    await supabase
      .from('attachment_parse_results')
      .upsert({
        attachment_id: attachmentId,
        parse_status: 'processing',
        parse_source: 'pdf_conversion',
        parsed_data: { message: 'Converting PDF to image...' }
      });

    // Fetch PDF from URL
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to fetch PDF: ${pdfResponse.statusText}`);
    }

    const pdfArrayBuffer = await pdfResponse.arrayBuffer();
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfArrayBuffer)));

    // Use CloudConvert API for conversion
    const cloudConvertApiKey = Deno.env.get('CLOUDCONVERT_API_KEY');
    
    if (!cloudConvertApiKey) {
      // Fallback to client-side conversion notification
      console.log('CloudConvert API key not configured, flagging for client conversion');
      
      await supabase
        .from('attachment_parse_results')
        .upsert({
          attachment_id: attachmentId,
          parse_status: 'pending',
          parse_source: 'awaiting_client_conversion',
          parsed_data: { 
            message: 'CloudConvert API not configured. Please click Parse button or configure CLOUDCONVERT_API_KEY.'
          }
        });

      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'CloudConvert API key not configured. Please add CLOUDCONVERT_API_KEY secret.' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create CloudConvert job
    const createJobResponse = await fetch('https://api.cloudconvert.com/v2/jobs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cloudConvertApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tasks: {
          'import-pdf': {
            operation: 'import/base64',
            file: pdfBase64,
            filename: 'document.pdf'
          },
          'convert-to-png': {
            operation: 'convert',
            input: 'import-pdf',
            output_format: 'png',
            engine: 'imagemagick',
            density: 300,
            quality: 100
          },
          'export-png': {
            operation: 'export/url',
            input: 'convert-to-png'
          }
        },
        tag: 'onebill-pdf-conversion'
      })
    });

    if (!createJobResponse.ok) {
      const errorText = await createJobResponse.text();
      throw new Error(`CloudConvert job creation failed: ${errorText}`);
    }

    const jobData = await createJobResponse.json();
    console.log('CloudConvert job created:', jobData.data.id);

    // Wait for job completion (poll every 2 seconds, max 30 seconds)
    let jobCompleted = false;
    let attempts = 0;
    const maxAttempts = 15;

    while (!jobCompleted && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;

      const statusResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobData.data.id}`, {
        headers: {
          'Authorization': `Bearer ${cloudConvertApiKey}`,
        }
      });

      const statusData = await statusResponse.json();
      
      if (statusData.data.status === 'finished') {
        jobCompleted = true;
        
        // Get the export task to find the PNG URL
        const exportTask = statusData.data.tasks.find((t: any) => t.name === 'export-png');
        if (exportTask && exportTask.result && exportTask.result.files && exportTask.result.files[0]) {
          const pngUrl = exportTask.result.files[0].url;
          
          // Download the converted PNG
          const pngResponse = await fetch(pngUrl);
          const pngBlob = await pngResponse.blob();
          
          // Upload to Supabase Storage
          const business_id = storagePath.split('/')[0];
          const pngFileName = `${business_id}/${crypto.randomUUID()}.png`;
          
          const { error: uploadError } = await supabase.storage
            .from('customer_media')
            .upload(pngFileName, pngBlob, {
              contentType: 'image/png',
              upsert: false
            });

          if (uploadError) {
            throw new Error(`Failed to upload PNG: ${uploadError.message}`);
          }

          const { data: urlData } = supabase.storage
            .from('customer_media')
            .getPublicUrl(pngFileName);

          console.log('PNG uploaded, triggering parse router:', urlData.publicUrl);

          // Trigger parse router for the converted image
          const { error: parseError } = await supabase.functions.invoke('onebill-parse-router', {
            body: { 
              attachmentUrl: urlData.publicUrl,
              originalAttachmentId: attachmentId
            }
          });

          if (parseError) {
            console.error('Failed to trigger parse router:', parseError);
          }

          // Update attachment record with converted image
          await supabase
            .from('message_attachments')
            .update({
              file_url: urlData.publicUrl,
              storage_path: pngFileName,
              file_type: 'image/png'
            })
            .eq('id', attachmentId);

          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'PDF converted and parsing initiated',
              convertedUrl: urlData.publicUrl
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else if (statusData.data.status === 'error') {
        throw new Error(`CloudConvert job failed: ${JSON.stringify(statusData.data)}`);
      }
    }

    if (!jobCompleted) {
      throw new Error('PDF conversion timeout');
    }

  } catch (error) {
    console.error('Error in convert-pdf-to-png:', error);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    try {
      const { attachmentId } = await req.json();
      if (attachmentId) {
        await supabase
          .from('attachment_parse_results')
          .upsert({
            attachment_id: attachmentId,
            parse_status: 'failed',
            parse_source: 'pdf_conversion',
            parsed_data: { 
              error: error.message,
              message: 'PDF conversion failed. Please use manual parse button or configure CloudConvert API.' 
            }
          });
      }
    } catch (e) {
      console.error('Failed to update error status:', e);
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});