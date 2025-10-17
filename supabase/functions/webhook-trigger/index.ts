import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendWebhook(url: string, payload: any, secret: string, timeoutSeconds: number) {
  const timestamp = Date.now().toString();
  const signature = createHmac('sha256', secret)
    .update(`${timestamp}.${JSON.stringify(payload)}`)
    .digest('hex');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': timestamp,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    return {
      status: response.status,
      body: await response.text(),
      success: response.ok,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { business_id, event_type, payload } = await req.json();

    if (!business_id || !event_type || !payload) {
      return new Response(
        JSON.stringify({ error: 'business_id, event_type, and payload are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get active webhooks for this business and event type
    const { data: webhooks, error: webhooksError } = await supabase
      .from('webhook_configs')
      .select('*')
      .eq('business_id', business_id)
      .eq('is_active', true)
      .contains('events', [event_type]);

    if (webhooksError) throw webhooksError;

    if (!webhooks || webhooks.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active webhooks found for this event' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const results = [];

    for (const webhook of webhooks) {
      let attempt = 0;
      let delivered = false;
      let lastError = null;
      let responseStatus = null;
      let responseBody = null;

      // Create delivery log
      const { data: delivery, error: deliveryError } = await supabase
        .from('webhook_deliveries')
        .insert({
          webhook_config_id: webhook.id,
          event_type,
          payload,
          status: 'pending',
        })
        .select()
        .single();

      if (deliveryError) {
        console.error('Failed to create delivery log:', deliveryError);
        continue;
      }

      // Retry logic
      while (attempt < webhook.retry_count && !delivered) {
        attempt++;

        try {
          const result = await sendWebhook(
            webhook.url,
            {
              event: event_type,
              data: payload,
              business_id,
              timestamp: new Date().toISOString(),
            },
            webhook.secret,
            webhook.timeout_seconds
          );

          responseStatus = result.status;
          responseBody = result.body;
          delivered = result.success;

          if (delivered) {
            await supabase
              .from('webhook_deliveries')
              .update({
                status: 'delivered',
                response_status: responseStatus,
                response_body: responseBody,
                attempt_count: attempt,
                delivered_at: new Date().toISOString(),
              })
              .eq('id', delivery.id);
          }
        } catch (error) {
          lastError = error.message;
          console.error(`Webhook delivery attempt ${attempt} failed:`, error);
        }

        if (!delivered && attempt < webhook.retry_count) {
          // Exponential backoff: 1s, 2s, 4s, etc.
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }

      if (!delivered) {
        await supabase
          .from('webhook_deliveries')
          .update({
            status: 'failed',
            error_message: lastError,
            response_status: responseStatus,
            response_body: responseBody,
            attempt_count: attempt,
          })
          .eq('id', delivery.id);
      }

      results.push({
        webhook_id: webhook.id,
        delivered,
        attempts: attempt,
        error: lastError,
      });
    }

    return new Response(
      JSON.stringify({
        triggered: webhooks.length,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in webhook-trigger:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});