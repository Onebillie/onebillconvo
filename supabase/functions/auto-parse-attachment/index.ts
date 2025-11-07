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

  let attachmentId: string | undefined;
  let messageId: string | undefined;
  
  try {
    const body = await req.json();
    attachmentId = body.attachmentId;
    messageId = body.messageId;
    const attachmentUrl = body.attachmentUrl;
    const attachmentType = body.attachmentType;
    const businessId = body.businessId;
    const forceReparse = body.forceReparse;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Auto-parse request for attachment ${attachmentId}, force: ${forceReparse}`);

    // Check if already parsed (unless force_reparse is true)
    if (!forceReparse) {
      const { data: existing } = await supabase
        .from('message_attachments')
        .select('parsed_data, parse_status')
        .eq('id', attachmentId)
        .single();

      if (existing?.parsed_data && existing.parse_status === 'success') {
        console.log(`Attachment ${attachmentId} already parsed, skipping`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            skipped: true,
            message: 'Already parsed',
            parsed_data: existing.parsed_data 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Mark as pending
    await supabase
      .from('message_attachments')
      .update({ parse_status: 'pending' })
      .eq('id', attachmentId);

    await supabase.from('attachment_parse_results').insert({
      message_id: messageId,
      attachment_id: attachmentId,
      parse_status: 'pending'
    });

    // Call onebill-parse-router to parse with AI
    const parseResponse = await supabase.functions.invoke('onebill-parse-router', {
      body: { attachmentUrl }
    });

    if (parseResponse.error) {
      throw new Error(`Parse failed: ${parseResponse.error.message}`);
    }

    const parsedData = parseResponse.data;
    console.log(`Parsed attachment ${attachmentId}:`, JSON.stringify(parsedData).substring(0, 200));

    // Determine document type from parsed data
    let documentType = parsedData?.document_type || null;
    
    // Try to classify from services if available
    if (!documentType && parsedData?.services) {
      if (parsedData.services.electricity) documentType = 'electricity_bill';
      else if (parsedData.services.gas) documentType = 'gas_bill';
      else if (parsedData.services.broadband) documentType = 'broadband_bill';
      else if (parsedData.services.phone) documentType = 'phone_bill';
    }

    const parseStatus = parsedData ? 'success' : 'failed';

    // Store parsed data in message_attachments (primary location)
    const { error: updateError } = await supabase
      .from('message_attachments')
      .update({
        parsed_data: parsedData,
        parsed_at: new Date().toISOString(),
        parse_status: parseStatus
      })
      .eq('id', attachmentId);

    if (updateError) {
      console.error('Failed to update message_attachments:', updateError);
    }

    // Also store in attachment_parse_results for history/audit
    await supabase
      .from('attachment_parse_results')
      .update({
        parse_status: parseStatus,
        document_type: documentType,
        parsed_data: parsedData,
        updated_at: new Date().toISOString()
      })
      .eq('message_id', messageId)
      .eq('attachment_id', attachmentId);

    return new Response(
      JSON.stringify({ 
        success: true,
        document_type: documentType,
        parse_status: parseStatus,
        parsed_data: parsedData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Auto-parse error:', error);
    
    if (attachmentId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase
        .from('message_attachments')
        .update({
          parse_status: 'failed',
          parsed_at: new Date().toISOString()
        })
        .eq('id', attachmentId);

      if (messageId) {
        await supabase
          .from('attachment_parse_results')
          .update({
            parse_status: 'failed',
            error_message: error.message,
            updated_at: new Date().toISOString()
          })
          .eq('message_id', messageId)
          .eq('attachment_id', attachmentId);
      }
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
