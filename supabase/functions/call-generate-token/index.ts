import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization') || '',
          },
        },
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get business for user to verify they have access
    const { data: businessUser, error: businessError } = await supabase
      .from('business_users')
      .select('business_id')
      .eq('user_id', user.id)
      .single();

    if (businessError || !businessUser) {
      return new Response(JSON.stringify({ error: 'No business found for user' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get or create agent availability record
    const { data: agent } = await supabase
      .from('agent_availability')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!agent) {
      await supabase
        .from('agent_availability')
        .insert({
          agent_id: user.id,
          business_id: businessUser.business_id,
          status: 'offline',
          device_type: 'browser'
        });
    }

    let accountSid, apiKey, apiSecret, twimlAppSid;

    // Try to get credentials from call_settings first
    const { data: settings } = await supabase
      .from('call_settings')
      .select('twilio_account_sid, twilio_api_key, twilio_api_secret, twilio_twiml_app_sid')
      .eq('business_id', businessUser.business_id)
      .single();

    if (settings?.twilio_account_sid) {
      accountSid = settings.twilio_account_sid;
      apiKey = settings.twilio_api_key;
      apiSecret = settings.twilio_api_secret;
      twimlAppSid = settings.twilio_twiml_app_sid;
    }

    // Fallback to environment variables
    if (!accountSid) {
      accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      apiKey = Deno.env.get('TWILIO_API_KEY');
      apiSecret = Deno.env.get('TWILIO_API_SECRET');
      twimlAppSid = Deno.env.get('TWILIO_TWIML_APP_SID');
    }

    if (!accountSid || !apiKey || !apiSecret || !twimlAppSid) {
      return new Response(JSON.stringify({ 
        error: 'Twilio credentials not configured',
        token: null,
        identity: user.id 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create JWT token for Twilio Voice
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600; // 1 hour

    const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'HS256' }));
    const payload = btoa(JSON.stringify({
      jti: `${apiKey}-${now}`,
      iss: apiKey,
      sub: accountSid,
      exp: exp,
      grants: {
        identity: user.id,
        voice: {
          incoming: { allow: true },
          outgoing: {
            application_sid: twimlAppSid
          }
        }
      }
    }));

    const signature = await crypto.subtle.sign(
      { name: 'HMAC', hash: 'SHA-256' },
      await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(apiSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      ),
      new TextEncoder().encode(`${header}.${payload}`)
    );

    const token = `${header}.${payload}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;

    return new Response(JSON.stringify({ 
      token,
      identity: user.id,
      accountSid
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating token:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
