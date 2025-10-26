import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { generateRegistrationOptions } from 'npm:@simplewebauthn/server@9.0.1';
import { logAuditEvent, extractRequestInfo } from '../_shared/auditLogger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RP_NAME = 'À La Carte Chat';
const RP_ID = 'alacartechat.com';
const ORIGIN = 'https://alacartechat.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get existing credentials for this user
    const { data: existingCredentials } = await supabase
      .from('webauthn_credentials')
      .select('credential_id, transports')
      .eq('user_id', user.id);

    const excludeCredentials = existingCredentials?.map((cred) => ({
      id: cred.credential_id,
      type: 'public-key' as const,
      transports: cred.transports || [],
    })) || [];

    // Generate registration options
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: user.id,
      userName: user.email || 'user',
      userDisplayName: user.email || 'User',
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    // Store challenge in temporary session
    const { error: sessionError } = await supabase
      .from('admin_sessions')
      .upsert({
        user_id: user.id,
        challenge: options.challenge,
        device_fingerprint: 'webauthn-registration',
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
      eventType: 'webauthn_registration_started',
      eventAction: 'create',
      severity: 'info',
      ipAddress,
      userAgent,
      requestId,
      success: true,
    });

    return new Response(
      JSON.stringify(options),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in webauthn-register-begin:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
