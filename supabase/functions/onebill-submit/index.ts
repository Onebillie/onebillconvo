import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ONEBILL_ENDPOINTS = {
  meter: {
    url: 'https://api.onebill.ie/api/meter-file',
    required: ['file', 'phone', 'url'],
  },
  gas: {
    url: 'https://api.onebill.ie/api/gas-file',
    required: ['file', 'phone', 'gprn'],
  },
  electricity: {
    url: 'https://api.onebill.ie/api/electricity-file',
    required: ['file', 'phone', 'mprn', 'mcc_type', 'dg_type'],
  },
};

async function submitWithRetry(endpoint: string, formData: FormData, apiKey: string, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt + 1} to ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }

      if (response.ok) {
        console.log('OneBill submission successful:', responseData);
        return { 
          success: true, 
          status: response.status,
          data: responseData 
        };
      }

      // Retry on rate limit or server errors
      if (response.status === 429 || response.status >= 500) {
        const backoff = Math.pow(2, attempt) * 1000;
        console.log(`Retrying after ${backoff}ms due to status ${response.status}`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }

      // Don't retry on client errors
      console.error('OneBill API error:', response.status, responseData);
      return { 
        success: false, 
        status: response.status,
        error: responseData.message || responseData.error || responseText 
      };

    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      if (attempt === maxRetries - 1) {
        return { 
          success: false, 
          status: 0,
          error: error.message 
        };
      }
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  return { 
    success: false, 
    status: 0,
    error: 'Max retries exceeded' 
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      submissionId,
      businessId, 
      customerId,
      documentType, 
      fields, 
      fileUrl,
      fileName 
    } = await req.json();

    console.log('OneBill submission request:', { submissionId, businessId, documentType });

    // Validate required fields
    if (!submissionId || !businessId || !documentType || !fields || !fileUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const oneBillApiKey = Deno.env.get('ONEBILL_API_KEY');
    if (!oneBillApiKey) {
      throw new Error('ONEBILL_API_KEY not configured');
    }

    // Get endpoint configuration
    const endpointConfig = ONEBILL_ENDPOINTS[documentType as keyof typeof ONEBILL_ENDPOINTS];
    if (!endpointConfig) {
      throw new Error(`Invalid document type: ${documentType}`);
    }

    // Validate required fields for document type
    const missingFields = endpointConfig.required.filter(field => {
      if (field === 'file') return false; // We'll add the file separately
      return !fields[field];
    });

    if (missingFields.length > 0) {
      await supabase
        .from('onebill_submissions')
        .update({
          submission_status: 'failed',
          error_message: `Missing required fields: ${missingFields.join(', ')}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', submissionId);

      return new Response(
        JSON.stringify({ error: `Missing required fields: ${missingFields.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the file
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
    }

    const fileBlob = await fileResponse.blob();

    // Prepare FormData
    const formData = new FormData();
    formData.append('file', fileBlob, fileName);
    formData.append('phone', fields.phone);

    // Add document-specific fields
    if (documentType === 'meter') {
      formData.append('url', fields.url || fileUrl);
    } else if (documentType === 'gas') {
      formData.append('gprn', fields.gprn);
    } else if (documentType === 'electricity') {
      formData.append('mprn', fields.mprn);
      formData.append('mcc_type', fields.mcc_type);
      formData.append('dg_type', fields.dg_type);
    }

    console.log('Submitting to OneBill:', endpointConfig.url);

    // Update status to retrying
    await supabase
      .from('onebill_submissions')
      .update({
        submission_status: 'retrying',
        updated_at: new Date().toISOString(),
      })
      .eq('id', submissionId);

    // Submit to OneBill with retry logic
    const result = await submitWithRetry(endpointConfig.url, formData, oneBillApiKey);

    // Update submission record
    const updateData: any = {
      http_status: result.status,
      onebill_response: result.data || { error: result.error },
      submission_status: result.success ? 'success' : 'failed',
      updated_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
    };

    if (!result.success) {
      updateData.error_message = result.error;
      updateData.retry_count = 3; // Mark as max retries
    }

    await supabase
      .from('onebill_submissions')
      .update(updateData)
      .eq('id', submissionId);

    // Trigger webhook if configured
    const { data: config } = await supabase
      .from('onebill_tenant_config')
      .select('webhook_url, webhook_secret, webhook_enabled')
      .eq('business_id', businessId)
      .single();

    if (config?.webhook_enabled && config.webhook_url) {
      const webhookPayload = {
        event: result.success ? 'onebill.submission.success' : 'onebill.submission.failed',
        submission_id: submissionId,
        document_type: documentType,
        status: result.success ? 'success' : 'failed',
        http_status: result.status,
        timestamp: new Date().toISOString(),
      };

      try {
        await fetch(config.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': config.webhook_secret || '',
          },
          body: JSON.stringify(webhookPayload),
        });
      } catch (webhookError) {
        console.error('Webhook delivery failed:', webhookError);
      }
    }

    return new Response(
      JSON.stringify({
        success: result.success,
        submission_id: submissionId,
        http_status: result.status,
        message: result.success ? 'Submission successful' : result.error,
      }),
      { 
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in onebill-submit:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
