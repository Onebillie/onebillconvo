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
    const requestBody = await req.json();
    console.log('Request body received:', JSON.stringify(requestBody, null, 2));
    
    const { attachmentId, businessId, documentType, fields, fileUrl, fileName } = requestBody;
    console.log('OneBill submit called:', { attachmentId, businessId, documentType, hasFileUrl: !!fileUrl });

    if (!attachmentId && !(fileUrl && documentType)) {
      console.error('Missing required identifiers in request:', requestBody);
      return new Response(
        JSON.stringify({ error: 'Missing required field: attachmentId or (fileUrl and documentType)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get parsed data from attachment when provided
    let attachment: any = null;
    let parsedData: any = null;
    if (attachmentId) {
      const { data, error: attachmentError } = await supabaseClient
        .from('message_attachments')
        .select('id, parsed_data, url, filename, message_id')
        .eq('id', attachmentId)
        .maybeSingle();

      if (attachmentError || !data?.parsed_data) {
        console.error('Attachment or parsed data not found:', attachmentError);
        return new Response(
          JSON.stringify({ error: 'Attachment or parsed data not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      attachment = data;
      parsedData = data.parsed_data;
    }

    if (parsedData) {
      console.log('Parsed data:', JSON.stringify(parsedData, null, 2));
    }

    // Get OneBill API configuration
    const ONEBILL_API_KEY = Deno.env.get('ONEBILL_API_KEY') ?? '';

    if (!ONEBILL_API_KEY) {
      console.error('ONEBILL_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'OneBill API not configured'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Detect which services are present in parsed data
    const hasElectricity = parsedData?.bills?.electricity?.length > 0;
    const hasGas = parsedData?.bills?.gas?.length > 0;
    const hasMeterReading = parsedData?.bills?.meter_reading?.read_value;

    console.log('Detected services:', { hasElectricity, hasGas, hasMeterReading });

    // Prepare API calls based on detected services
    const apiCalls: Array<{ endpoint: string; type: string }> = [];

    if (hasMeterReading) {
      apiCalls.push({
        endpoint: "https://api.onebill.ie/api/meter-file",
        type: "meter"
      });
    }

    if (hasElectricity) {
      apiCalls.push({
        endpoint: "https://api.onebill.ie/api/electricity-file",
        type: "electricity"
      });
    }

    if (hasGas) {
      apiCalls.push({
        endpoint: "https://api.onebill.ie/api/gas-file",
        type: "gas"
      });
    }

    // If called with a specific document type and fileUrl (resend/override path)
    if (!attachmentId && documentType && fileUrl) {
      let endpoint = '';
      if (documentType === 'meter') endpoint = 'https://api.onebill.ie/api/meter-file';
      else if (documentType === 'electricity') endpoint = 'https://api.onebill.ie/api/electricity-file';
      else if (documentType === 'gas') endpoint = 'https://api.onebill.ie/api/gas-file';
      else {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid documentType' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      apiCalls.push({ endpoint, type: documentType });
    }

    if (apiCalls.length === 0) {
      console.log('No electricity, gas, or meter reading detected in parsed data');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'No electricity, gas, or meter reading detected in parsed data'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Making ${apiCalls.length} API call(s):`, apiCalls.map(c => c.type));

    // Make API calls in parallel
    const MAX_ERROR_LENGTH = 5000;
    const apiResults = await Promise.all(
      apiCalls.map(async ({ endpoint, type }) => {
        try {
          console.log(`Calling ${type} API:`, endpoint);
          
          // Pick file source (attachment or provided fileUrl)
          const sourceUrl = attachment?.url ?? fileUrl;
          if (!sourceUrl) {
            throw new Error('No file URL provided');
          }
          // Download the file
          const fileResponse = await fetch(sourceUrl);
          if (!fileResponse.ok) {
            throw new Error(`Failed to download file: ${fileResponse.statusText}`);
          }
          const fileBlob = await fileResponse.blob();
          
          // Create FormData for multipart/form-data request
          const formData = new FormData();
          const sourceName = attachment?.filename ?? fileName ?? 'upload';
          formData.append('file', fileBlob, sourceName);
          
          // Add fields based on service type
          if (type === 'meter') {
            if (parsedData?.bills?.meter_reading) {
              const meterData = parsedData.bills.meter_reading;
              formData.append('url', attachment.url);
              if (meterData.phone) formData.append('phone', meterData.phone);
            } else {
              formData.append('url', sourceUrl);
              if (fields?.phone) formData.append('phone', fields.phone);
            }
          } else if (type === 'electricity') {
            if (parsedData?.bills?.electricity?.[0]) {
              const elecData = parsedData.bills.electricity[0];
              if (elecData.phone) formData.append('phone', elecData.phone);
              if (elecData.mprn) formData.append('mprn', elecData.mprn);
              if (elecData.mcc_type) formData.append('mcc_type', elecData.mcc_type);
              if (elecData.dg_type) formData.append('dg_type', elecData.dg_type);
            } else {
              if (fields?.phone) formData.append('phone', fields.phone);
              if (fields?.mprn) formData.append('mprn', fields.mprn);
              if (fields?.mcc_type) formData.append('mcc_type', fields.mcc_type);
              if (fields?.dg_type) formData.append('dg_type', fields.dg_type);
            }
          } else if (type === 'gas') {
            if (parsedData?.bills?.gas?.[0]) {
              const gasData = parsedData.bills.gas[0];
              if (gasData.phone) formData.append('phone', gasData.phone);
              if (gasData.gprn) formData.append('gprn', gasData.gprn);
            } else {
              if (fields?.phone) formData.append('phone', fields.phone);
              if (fields?.gprn) formData.append('gprn', fields.gprn);
            }
          }
          
          console.log(`Sending ${type} with form fields`);
          
          // THIS IS THE ACTUAL API CALL - multipart/form-data
          const apiResponse = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${ONEBILL_API_KEY}`,
              // Don't set Content-Type - FormData sets it automatically with boundary
            },
            body: formData
          });

          let responseText = "";
          try {
            responseText = await apiResponse.text();
          } catch (e) {
            responseText = "Failed to read response body";
          }

          // Truncate error responses
          const truncatedResponse = responseText.slice(0, MAX_ERROR_LENGTH);
          
          console.log(`${type} API response:`, apiResponse.status, truncatedResponse.slice(0, 200));

          return {
            type,
            endpoint,
            status: apiResponse.status,
            ok: apiResponse.ok,
            response: truncatedResponse
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          console.error(`Error calling ${type} API:`, errorMessage);
          
          return {
            type,
            endpoint,
            status: 500,
            ok: false,
            error: errorMessage.slice(0, MAX_ERROR_LENGTH)
          };
        }
      })
    );

    // Log all results
    console.log('API Results:', JSON.stringify(apiResults, null, 2));

    // Check if all calls succeeded
    const allSucceeded = apiResults.every(result => result.ok);
    const anySucceeded = apiResults.some(result => result.ok);

    // Create submission records for each API call
    for (const result of apiResults) {
      const submissionData = {
        business_id: businessId,
        attachment_id: attachmentId ?? null,
        document_type: result.type,
        submission_status: result.ok ? 'completed' : 'failed',
        onebill_endpoint: result.endpoint,
        http_status: result.status,
        onebill_response: result.response ? { response: result.response } : null,
        error_message: result.ok ? null : (result.error || `API returned ${result.status}`),
        submitted_at: new Date().toISOString(),
        retry_count: 0,
        max_retries: 3
      };

      const { error: insertError } = await supabaseClient
        .from('onebill_submissions')
        .insert(submissionData);

      if (insertError) {
        console.error(`Error creating submission record for ${result.type}:`, insertError);
      }
    }

    if (allSucceeded) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: `Successfully submitted ${apiResults.length} service(s)`,
          results: apiResults
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (anySucceeded) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Some submissions failed',
          results: apiResults
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'All submissions failed',
          results: apiResults
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
