import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { submissionId, businessId, customerId, documentType: bodyDocumentType, fields: bodyFields, fileUrl: bodyFileUrl, fileName: bodyFileName } = await req.json();

    console.log('OneBill submit called:', { submissionId, documentType: bodyDocumentType });

    if (!submissionId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: submissionId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Load submission from DB to build payload if fields were not provided
    const { data: submission, error: submissionError } = await supabaseClient
      .from('onebill_submissions')
      .select('id, document_type, phone, mprn, gprn, mcc_type, dg_type, utility, read_value, unit, meter_make, meter_model, raw_text, file_url, file_name')
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      console.error('Submission not found:', submissionError);
      return new Response(
        JSON.stringify({ error: 'Submission not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const documentType = bodyDocumentType || submission.document_type;
    const fileUrl = bodyFileUrl || submission.file_url;
    const fileName = bodyFileName || submission.file_name;

    // Merge fields: prefer body values, fall back to DB columns
    const fields = bodyFields || {
      phone: submission.phone,
      mprn: submission.mprn,
      gprn: submission.gprn,
      mcc_type: submission.mcc_type,
      dg_type: submission.dg_type,
      utility: submission.utility,
      read_value: submission.read_value,
      unit: submission.unit,
      meter_make: submission.meter_make,
      meter_model: submission.meter_model,
      raw_text: submission.raw_text,
    };

    // Get OneBill API configuration
    const ONEBILL_API_KEY = Deno.env.get('ONEBILL_API_KEY');

    if (!ONEBILL_API_KEY) {
      console.warn('ONEBILL_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'OneBill API not configured'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build OneBill API URL and payload based on document type
    let apiEndpoint = '';
    let payload: any = {};

    switch (documentType) {
      case 'electricity':
        apiEndpoint = 'https://api.onebill.ie/v1/bill_forms/electricity';
        payload = {
          phone: fields.phone,
          mprn: fields.mprn,
          mcc_type: fields.mcc_type,
          dg_type: fields.dg_type,
          file_url: fileUrl,
          file_name: fileName,
        };
        break;

      case 'gas':
        apiEndpoint = 'https://api.onebill.ie/v1/bill_forms/gas';
        payload = {
          phone: fields.phone,
          gprn: fields.gprn,
          file_url: fileUrl,
          file_name: fileName,
        };
        break;

      case 'meter':
        apiEndpoint = 'https://api.onebill.ie/v1/meter_reads';
        payload = {
          phone: fields.phone,
          utility: fields.utility || 'gas',
          read_value: fields.read_value,
          unit: fields.unit || 'm3',
          meter_make: fields.meter_make,
          meter_model: fields.meter_model,
          raw_text: fields.raw_text,
          confidence: fields.confidence || 0.9,
          file_url: fileUrl,
          file_name: fileName,
        };
        break;

      default:
        throw new Error(`Unknown document type: ${documentType}`);
    }

    console.log('Submitting to OneBill:', { apiEndpoint, payload });

    // Update submission status to submitting
    await supabaseClient
      .from('onebill_submissions')
      .update({ submission_status: 'submitting' })
      .eq('id', submissionId);

    // Send to OneBill API
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ONEBILL_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json().catch(() => ({}));
    console.log('OneBill response:', { status: response.status, data: responseData });

    if (!response.ok) {
      console.error('OneBill API error:', response.status, responseData);
      
      // Update submission with error
      await supabaseClient
        .from('onebill_submissions')
        .update({ 
          submission_status: 'failed',
          onebill_response: responseData,
          http_status: response.status,
          onebill_endpoint: apiEndpoint,
          error_message: `API returned ${response.status}: ${JSON.stringify(responseData)}`
        })
        .eq('id', submissionId);

      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'OneBill API request failed',
          status: response.status,
          details: responseData 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update submission with success
    await supabaseClient
      .from('onebill_submissions')
      .update({ 
        submission_status: 'completed',
        onebill_response: responseData,
        http_status: response.status,
        onebill_endpoint: apiEndpoint,
        submitted_at: new Date().toISOString()
      })
      .eq('id', submissionId);

    console.log('Successfully submitted to OneBill');

    return new Response(
      JSON.stringify({ 
        success: true,
        onebillResponse: responseData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in onebill-submit:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
