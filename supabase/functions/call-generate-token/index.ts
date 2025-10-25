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
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
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

    // Check if user belongs to OneBillChat
    const { data: isOneBill } = await supabase.rpc('is_onebillchat_user');
    if (!isOneBill) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
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
          user_id: user.id,
          status: 'offline',
          device_type: 'browser'
        });
    }

    // Generate Twilio access token (requires TWILIO secrets)
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const apiKey = Deno.env.get('TWILIO_API_KEY');
    const apiSecret = Deno.env.get('TWILIO_API_SECRET');
    const twimlAppSid = Deno.env.get('TWILIO_TWIML_APP_SID');

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
