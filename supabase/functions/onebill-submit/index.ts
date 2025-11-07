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
    
    const { attachmentId, businessId } = requestBody;
    console.log('OneBill submit called:', { attachmentId, businessId });

    if (!attachmentId) {
      console.error('Missing attachmentId in request:', requestBody);
      return new Response(
        JSON.stringify({ error: 'Missing required field: attachmentId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get parsed data from attachment
    const { data: attachment, error: attachmentError } = await supabaseClient
      .from('message_attachments')
      .select('id, parsed_data, url, filename, message_id')
      .eq('id', attachmentId)
      .single();

    if (attachmentError || !attachment?.parsed_data) {
      console.error('Attachment or parsed data not found:', attachmentError);
      return new Response(
        JSON.stringify({ error: 'Attachment or parsed data not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsedData = attachment.parsed_data;
    console.log('Parsed data:', JSON.stringify(parsedData, null, 2));

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

    console.log('Detected services:', { hasElectricity, hasGas });

    // Prepare API calls based on detected services
    const apiCalls: Array<{ endpoint: string; type: string }> = [];

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

    if (apiCalls.length === 0) {
      console.log('No electricity or gas services detected in parsed data');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'No electricity or gas services detected in parsed data'
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
          
          // Transform parsedData to lowercase keys and add file field
          const requestPayload: Record<string, any> = {
            file: attachment.url
          };
          
          // Add fields based on service type
          if (type === 'electricity' && parsedData?.bills?.electricity?.[0]) {
            const elecData = parsedData.bills.electricity[0];
            if (elecData.phone) requestPayload.phone = elecData.phone;
            if (elecData.mprn) requestPayload.mprn = elecData.mprn;
            if (elecData.mcc_type) requestPayload.mcc = elecData.mcc_type;
            if (elecData.dg_type) requestPayload.dg = elecData.dg_type;
          } else if (type === 'gas' && parsedData?.bills?.gas?.[0]) {
            const gasData = parsedData.bills.gas[0];
            if (gasData.phone) requestPayload.phone = gasData.phone;
            if (gasData.gprn) requestPayload.gprn = gasData.gprn;
          }
          
          console.log(`Payload for ${type}:`, JSON.stringify(requestPayload, null, 2));
          
          // THIS IS THE ACTUAL API CALL
          const apiResponse = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${ONEBILL_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(requestPayload)
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
        attachment_id: attachmentId,
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
