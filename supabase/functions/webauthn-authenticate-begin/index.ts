import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { generateAuthenticationOptions } from 'npm:@simplewebauthn/server@9.0.1';
import { logAuditEvent, extractRequestInfo } from '../_shared/auditLogger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RP_ID = 'alacartechat.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user by email
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      throw userError;
    }

    const user = userData.users.find(u => u.email === email);

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's credentials
    const { data: credentials } = await supabase
      .from('webauthn_credentials')
      .select('credential_id, transports')
      .eq('user_id', user.id);

    if (!credentials || credentials.length === 0) {
      return new Response(JSON.stringify({ error: 'No credentials found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const allowCredentials = credentials.map((cred) => ({
      id: Buffer.from(cred.credential_id, 'base64'),
      type: 'public-key' as const,
      transports: cred.transports || [],
    }));

    // Generate authentication options
    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials,
      userVerification: 'preferred',
    });

    // Store challenge temporarily
    const { error: sessionError } = await supabase
      .from('admin_sessions')
      .upsert({
        user_id: user.id,
        challenge: options.challenge,
        device_fingerprint: 'webauthn-authentication',
        is_active: false,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
      }, {
        onConflict: 'user_id,device_fingerprint',
      });

    if (sessionError) {
      console.error('Error storing challenge:', sessionError);
    }

    const { ipAddress, userAgent, requestId } = extractRequestInfo(req);

    await logAuditEvent(supabase, {
      userId: user.id,
      eventCategory: 'auth',
      eventType: 'webauthn_authentication_started',
      eventAction: 'access',
      severity: 'info',
      ipAddress,
      userAgent,
      requestId,
      success: true,
    });

    return new Response(
      JSON.stringify({ ...options, userId: user.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in webauthn-authenticate-begin:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
