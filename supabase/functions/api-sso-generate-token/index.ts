import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    // Validate API key
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('id, business_id, permissions')
      .eq('key_hash', apiKey)
      .eq('is_active', true)
      .maybeSingle();
    
    if (keyError || !keyData) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update last_used_at
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyData.id);

    const body = await req.json();
    const { customer_id, scope = 'conversation', expires_in_minutes = 60, metadata = {} } = body;

    // Validate scope
    if (!['conversation', 'inbox'].includes(scope)) {
      return new Response(
        JSON.stringify({ error: 'Invalid scope. Must be "conversation" or "inbox"' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // If scope is conversation, customer_id is required
    if (scope === 'conversation' && !customer_id) {
      return new Response(
        JSON.stringify({ error: 'customer_id is required for conversation scope' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify customer belongs to business if customer_id provided
    if (customer_id) {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('id', customer_id)
        .eq('business_id', keyData.business_id)
        .maybeSingle();

      if (customerError || !customer) {
        return new Response(
          JSON.stringify({ error: 'Customer not found or does not belong to this business' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Generate secure token
    const token = crypto.randomUUID() + '-' + crypto.randomUUID();
    const expiresAt = new Date(Date.now() + expires_in_minutes * 60 * 1000).toISOString();

    // Create SSO token
    const { data: ssoToken, error: tokenError } = await supabase
      .from('sso_tokens')
      .insert({
        token,
        business_id: keyData.business_id,
        api_key_id: keyData.id,
        customer_id: customer_id || null,
        scope,
        expires_at: expiresAt,
        metadata,
      })
      .select()
      .single();

    if (tokenError) throw tokenError;

    // Generate embed URL
    const baseUrl = `${new URL(req.url).origin}`;
    const embedUrl = scope === 'conversation' 
      ? `${baseUrl}/embed/conversation?token=${token}`
      : `${baseUrl}/embed/inbox?token=${token}`;

    return new Response(
      JSON.stringify({
        token,
        embed_url: embedUrl,
        expires_at: expiresAt,
        scope,
        customer_id: customer_id || null,
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in api-sso-generate-token:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
