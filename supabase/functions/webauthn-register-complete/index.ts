import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyRegistrationResponse } from 'npm:@simplewebauthn/server@9.0.1';
import { logAuditEvent, extractRequestInfo } from '../_shared/auditLogger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { credential, deviceName } = await req.json();

    // Get stored challenge
    const { data: sessionData } = await supabase
      .from('admin_sessions')
      .select('challenge')
      .eq('user_id', user.id)
      .eq('device_fingerprint', 'webauthn-registration')
      .single();

    if (!sessionData?.challenge) {
      return new Response(JSON.stringify({ error: 'Challenge not found or expired' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the registration response
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: sessionData.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      const { ipAddress, userAgent, requestId } = extractRequestInfo(req);
      
      await logAuditEvent(supabase, {
        userId: user.id,
        eventCategory: 'auth',
        eventType: 'webauthn_registration_failed',
        eventAction: 'create',
        severity: 'warning',
        ipAddress,
        userAgent,
        requestId,
        success: false,
        errorMessage: 'Verification failed',
      });

      return new Response(JSON.stringify({ error: 'Verification failed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

    // Store the credential
    const { error: insertError } = await supabase
      .from('webauthn_credentials')
      .insert({
        user_id: user.id,
        credential_id: Buffer.from(credentialID).toString('base64'),
        public_key: Buffer.from(credentialPublicKey).toString('base64'),
        counter,
        device_name: deviceName || 'Biometric Device',
        device_type: credential.response.authenticatorAttachment || 'unknown',
        transports: credential.response.transports || [],
        aaguid: verification.registrationInfo.aaguid,
      });

    if (insertError) {
      throw insertError;
    }

    // Clean up challenge
    await supabase
      .from('admin_sessions')
      .delete()
      .eq('user_id', user.id)
      .eq('device_fingerprint', 'webauthn-registration');

    const { ipAddress, userAgent, requestId } = extractRequestInfo(req);

    await logAuditEvent(supabase, {
      userId: user.id,
      eventCategory: 'auth',
      eventType: 'webauthn_registered',
      eventAction: 'create',
      severity: 'info',
      ipAddress,
      userAgent,
      requestId,
      resourceType: 'webauthn_credential',
      metadata: { deviceName, deviceType: credential.response.authenticatorAttachment },
      success: true,
    });

    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in webauthn-register-complete:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
