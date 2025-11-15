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

    let accountSid, authToken, twimlAppSid;

    // Try to get credentials from call_settings first
    const { data: settings } = await supabase
      .from('call_settings')
      .select('twilio_account_sid, twilio_auth_token, twilio_twiml_app_sid')
      .eq('business_id', businessUser.business_id)
      .single();

    if (settings?.twilio_account_sid) {
      accountSid = settings.twilio_account_sid;
      authToken = settings.twilio_auth_token;
      twimlAppSid = settings.twilio_twiml_app_sid;
    }

    // Fallback to environment variables
    if (!accountSid) {
      accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
      twimlAppSid = Deno.env.get('TWILIO_TWIML_APP_SID');
    }

    if (!accountSid || !authToken || !twimlAppSid) {
      return new Response(JSON.stringify({ 
        error: 'Twilio credentials not configured. Please ensure Account SID, Auth Token, and TwiML App SID are set.',
        token: null,
        identity: user.id 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if access token type is requested (for future SDK v2 compatibility)
    const url = new URL(req.url);
    const tokenType = url.searchParams.get('type');
    const useAccessToken = tokenType === 'access';

    // Helper to convert Uint8Array to Base64URL (only needed for Access Token)
    const arrayBufferToBase64Url = (buffer: ArrayBuffer): string => {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    };

    // Helper function to convert to Base64URL encoding (only needed for Access Token)
    const base64UrlEncode = (str: string): string => {
      return btoa(str)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    };

    // Create JWT token for Twilio
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600; // 1 hour
    const identity = user.id;

    let token: string;

    if (useAccessToken) {
      // Access Token path (for future SDK v2 migration)
      console.log('Generating Access Token for SDK v2');
      const header = base64UrlEncode(JSON.stringify({ typ: 'JWT', alg: 'HS256' }));
      const payload = base64UrlEncode(JSON.stringify({
        jti: `${accountSid}-${now}`,
        iss: accountSid,
        sub: accountSid,
        iat: now,
        nbf: now - 5,
        exp: exp,
        grants: {
          identity: identity,
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
          new TextEncoder().encode(authToken),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        ),
        new TextEncoder().encode(`${header}.${payload}`)
      );

      const signatureBase64 = arrayBufferToBase64Url(signature);
      token = `${header}.${payload}.${signatureBase64}`;
    } else {
      // Capability Token path (for SDK v1.x - default)
      console.log('Generating Capability Token for SDK v1.x');
      
      // Build scope string for capability token
      const scope = [
        `scope:client:incoming?clientName=${identity}`,
        `scope:client:outgoing?appSid=${twimlAppSid}&clientName=${identity}`
      ].join(' ');

      const header = base64UrlEncode(JSON.stringify({ typ: 'JWT', alg: 'HS256' }));
      const payload = base64UrlEncode(JSON.stringify({
        iss: accountSid,
        exp: exp,
        scope: scope
      }));

      const signature = await crypto.subtle.sign(
        { name: 'HMAC', hash: 'SHA-256' },
        await crypto.subtle.importKey(
          'raw',
          new TextEncoder().encode(authToken),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        ),
        new TextEncoder().encode(`${header}.${payload}`)
      );

      const signatureBase64 = arrayBufferToBase64Url(signature);
      token = `${header}.${payload}.${signatureBase64}`;
    }

    console.log('Generated token for user:', user.id, 'type:', useAccessToken ? 'access' : 'capability');

    return new Response(JSON.stringify({ 
      token,
      identity: identity,
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
