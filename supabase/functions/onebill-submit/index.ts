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
    const ONEBILL_API_KEY = Deno.env.get('ONEBILL_API_KEY') ?? '';

    if (!ONEBILL_API_KEY) {
      console.error('ONEBILL_API_KEY not configured');
      await supabaseClient
        .from('onebill_submissions')
        .update({ 
          submission_status: 'failed',
          error_message: 'OneBill API key not configured'
        })
        .eq('id', submissionId);
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'OneBill API not configured'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build OneBill API URL based on document type
    let apiEndpoint = '';

    switch (documentType) {
      case 'electricity':
        apiEndpoint = 'https://api.onebill.ie/api/electricity-file';
        break;

      case 'gas':
        apiEndpoint = 'https://api.onebill.ie/api/gas-file';
        break;

      case 'meter':
        apiEndpoint = 'https://api.onebill.ie/api/meter-file';
        break;

      default:
        throw new Error(`Unknown document type: ${documentType}`);
    }

    console.log('Submitting to OneBill:', { apiEndpoint, documentType, fileUrl });

    // Update submission status to submitting
    await supabaseClient
      .from('onebill_submissions')
      .update({ submission_status: 'submitting' })
      .eq('id', submissionId);

    // Best-effort: ensure the file URL is publicly reachable before posting to OneBill
    const waitForUrl = async (url: string, attempts = 6, delayMs = 700) => {
      for (let i = 0; i < attempts; i++) {
        try {
          const head = await fetch(url, { method: 'HEAD', redirect: 'follow' });
          if (head.ok) return true;
        } catch (e) {
          // ignore and retry
        }
        await new Promise((r) => setTimeout(r, delayMs));
      }
      return false;
    };

    const fileReady = await waitForUrl(fileUrl);
    if (!fileReady) {
      console.warn('File not reachable before OneBill submit', { fileUrl });
    }

    // Build request based on document type
    let response: Response;

    if (documentType === 'electricity' || documentType === 'gas') {
      // For electricity and gas: send JSON payload (matching working project)
      console.log('Sending JSON payload to OneBill for', documentType);
      
      const jsonPayload: any = {
        phone: fields.phone || '',
      };

      if (documentType === 'electricity') {
        jsonPayload.mprn = fields.mprn || '';
        // Handle both mcc/dg and mcc_type/dg_type
        jsonPayload.mcc = (fields as any).mcc ?? (fields as any).mcc_type ?? '';
        jsonPayload.dg = (fields as any).dg ?? (fields as any).dg_type ?? '';
      } else if (documentType === 'gas') {
        jsonPayload.gprn = fields.gprn || '';
      }

      // Include any additional fields that were extracted
      Object.keys(fields).forEach(key => {
        if (!['phone', 'mprn', 'gprn', 'mcc', 'dg', 'mcc_type', 'dg_type'].includes(key)) {
          const value = (fields as any)[key];
          if (value != null) {
            jsonPayload[key] = value;
          }
        }
      });

      console.log('JSON payload:', JSON.stringify(jsonPayload, null, 2));

      response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${ONEBILL_API_KEY}`,
        },
        body: JSON.stringify(jsonPayload),
      });
    } else {
      // For meter: use multipart/form-data with file upload
      console.log('Sending multipart/form-data to OneBill for meter reading');
      
      const form = new FormData();
      
      try {
        const fileResp = await fetch(fileUrl, { redirect: 'follow' });
        if (!fileResp.ok) {
          const errorMsg = `Failed to fetch file: HTTP ${fileResp.status}`;
          console.error(errorMsg, { fileUrl, status: fileResp.status });
          await supabaseClient
            .from('onebill_submissions')
            .update({ 
              submission_status: 'failed',
              error_message: errorMsg
            })
            .eq('id', submissionId);
          
          return new Response(
            JSON.stringify({ 
              success: false,
              error: errorMsg
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const contentType = fileResp.headers.get('content-type') || 'application/octet-stream';
        const buf = new Uint8Array(await fileResp.arrayBuffer());
        const blob = new Blob([buf], { type: contentType });
        form.append('file', blob, fileName || 'upload');
      } catch (e) {
        const errorMsg = `Error fetching file: ${e instanceof Error ? e.message : 'Unknown error'}`;
        console.error(errorMsg, { fileUrl, error: e });
        await supabaseClient
          .from('onebill_submissions')
          .update({ 
            submission_status: 'failed',
            error_message: errorMsg
          })
          .eq('id', submissionId);
        
        return new Response(
          JSON.stringify({ 
            success: false,
            error: errorMsg
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Append fields for meter reading
      if (fields.phone) form.append('phone', String(fields.phone));
      if (fields.utility) form.append('utility', String(fields.utility));
      if (fields.read_value) form.append('read_value', String(fields.read_value));
      if (fields.unit) form.append('unit', String(fields.unit));
      if (fields.meter_make) form.append('meter_make', String(fields.meter_make));
      if (fields.meter_model) form.append('meter_model', String(fields.meter_model));

      response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${ONEBILL_API_KEY}`,
        },
        body: form,
      });
    }

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
