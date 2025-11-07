import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  event: string;
  timestamp: string;
  business_id: string;
  data: {
    customer: any;
    conversation?: any;
    deduplication_check: {
      email?: string;
      phone?: string;
      external_id?: string;
    };
  };
}

async function sendWebhook(
  url: string,
  payload: WebhookPayload,
  secret: string
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    // Create HMAC signature
    const timestamp = new Date().toISOString();
    const signaturePayload = timestamp + JSON.stringify(payload);
    
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(signaturePayload);
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, messageData);
    const signatureHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signatureHex,
        'X-Webhook-Timestamp': timestamp,
        'User-Agent': 'AlacarteChat-Webhook/1.0',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    return {
      success: response.ok,
      status: response.status,
    };
  } catch (error) {
    console.error('Webhook send error:', error);
    return {
      success: false,
      error: error.message,
    };
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

    const { event_type, customer_id, business_id } = await req.json();

    console.log('Processing customer lifecycle event:', { event_type, customer_id, business_id });

    // Get webhook configuration
    const { data: settings, error: settingsError } = await supabase
      .from('business_settings')
      .select('customer_webhook_url, customer_webhook_enabled, customer_webhook_secret')
      .eq('business_id', business_id)
      .single();

    if (settingsError || !settings) {
      console.log('No settings found for business:', business_id);
      return new Response(
        JSON.stringify({ success: false, message: 'No webhook configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!settings.customer_webhook_enabled || !settings.customer_webhook_url) {
      console.log('Webhook not enabled or URL not configured');
      return new Response(
        JSON.stringify({ success: false, message: 'Webhook not enabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get customer data
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customer_id)
      .single();

    if (customerError || !customer) {
      throw new Error('Customer not found');
    }

    // Get active conversation for this customer
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id, status, created_at, updated_at')
      .eq('customer_id', customer_id)
      .eq('status', 'open')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Build webhook payload
    const payload: WebhookPayload = {
      event: event_type,
      timestamp: new Date().toISOString(),
      business_id: business_id,
      data: {
        customer: {
          id: customer.id,
          external_id: customer.external_id,
          name: customer.name,
          first_name: customer.first_name,
          last_name: customer.last_name,
          email: customer.email,
          phone: customer.phone,
          whatsapp_phone: customer.whatsapp_phone,
          address: customer.address,
          notes: customer.notes,
          custom_fields: customer.custom_fields,
          created_at: customer.created_at,
          updated_at: customer.updated_at,
        },
        conversation: conversation || undefined,
        deduplication_check: {
          email: customer.email,
          phone: customer.phone,
          external_id: customer.external_id,
        },
      },
    };

    // Send webhook
    const result = await sendWebhook(
      settings.customer_webhook_url,
      payload,
      settings.customer_webhook_secret || ''
    );

    // Log delivery
    await supabase.from('webhook_deliveries').insert({
      business_id: business_id,
      webhook_url: settings.customer_webhook_url,
      event_type: event_type,
      payload: payload,
      response_status: result.status,
      success: result.success,
      error_message: result.error,
    });

    console.log('Webhook sent:', result);

    return new Response(
      JSON.stringify({ success: true, result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in webhook-customer-lifecycle:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
