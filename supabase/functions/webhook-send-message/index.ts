import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendWebhook(
  url: string,
  payload: any,
  secret: string,
  timeout = 10000
): Promise<{ success: boolean; status?: number; response?: string; error?: string }> {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const signaturePayload = `${timestamp}.${JSON.stringify(payload)}`;
    const signature = createHmac('sha256', secret)
      .update(signaturePayload)
      .digest('hex');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': timestamp.toString(),
        'User-Agent': 'AlaCarte-Webhook/1.0'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const responseText = await response.text();

    return {
      success: response.ok,
      status: response.status,
      response: responseText
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { message_id, business_id } = await req.json();

    if (!message_id || !business_id) {
      return new Response(
        JSON.stringify({ error: 'message_id and business_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing webhook for message ${message_id}`);

    // Get webhook configuration
    const { data: settings, error: settingsError } = await supabase
      .from('business_settings')
      .select('message_webhook_url, message_webhook_enabled, message_webhook_secret')
      .eq('business_id', business_id)
      .single();

    if (settingsError || !settings?.message_webhook_enabled || !settings.message_webhook_url) {
      console.log('Webhook not configured or disabled');
      return new Response(
        JSON.stringify({ message: 'Webhook not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get message with related data
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select(`
        id,
        conversation_id,
        customer_id,
        content,
        platform,
        channel,
        direction,
        created_at,
        status,
        conversations!inner(id, business_id),
        customers!inner(id, name, email, phone, external_id, custom_fields)
      `)
      .eq('id', message_id)
      .single();

    if (messageError || !message) {
      console.error('Message not found:', messageError);
      return new Response(
        JSON.stringify({ error: 'Message not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get attachments
    const { data: attachments } = await supabase
      .from('message_attachments')
      .select('id, filename, type, size, url')
      .eq('message_id', message_id);

    // Build webhook payload
    const webhookPayload = {
      event: 'message.received',
      timestamp: new Date().toISOString(),
      business_id: business_id,
      data: {
        message: {
          id: message.id,
          conversation_id: message.conversation_id,
          customer_id: message.customer_id,
          content: message.content,
          platform: message.platform,
          channel: message.channel,
          direction: message.direction,
          created_at: message.created_at,
          status: message.status
        },
        customer: {
          id: message.customers.id,
          name: message.customers.name,
          email: message.customers.email,
          phone: message.customers.phone,
          external_id: message.customers.external_id,
          custom_fields: message.customers.custom_fields
        },
        attachments: attachments?.map(att => ({
          id: att.id,
          filename: att.filename,
          type: att.type,
          size: att.size,
          url: att.url,
          download_url: `${supabaseUrl}/functions/v1/api-download-media?id=${att.id}`
        })) || []
      }
    };

    // Send webhook with retry logic
    let lastError = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`Webhook attempt ${attempt}/${maxRetries}`);

      const result = await sendWebhook(
        settings.message_webhook_url,
        webhookPayload,
        settings.message_webhook_secret || 'default-secret',
        10000
      );

      // Log delivery
      await supabase.from('webhook_deliveries').insert({
        webhook_config_id: null, // We're not using webhook_configs for this
        event_type: 'message.received',
        payload: webhookPayload,
        response_status: result.status,
        response_body: result.response,
        delivered_at: result.success ? new Date().toISOString() : null,
        error_message: result.error,
        retry_count: attempt - 1
      });

      if (result.success) {
        console.log('Webhook delivered successfully');
        return new Response(
          JSON.stringify({ success: true, attempt }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      lastError = result.error || `HTTP ${result.status}`;

      // Don't retry on 4xx errors (except 429)
      if (result.status && result.status >= 400 && result.status < 500 && result.status !== 429) {
        console.log(`Not retrying due to ${result.status} status`);
        break;
      }

      // Exponential backoff
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Waiting ${delay}ms before retry`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.error('All webhook attempts failed:', lastError);
    return new Response(
      JSON.stringify({ error: 'Webhook delivery failed', details: lastError }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in webhook-send-message:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
