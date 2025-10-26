import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAuthenticationResponse } from 'npm:@simplewebauthn/server@9.0.1';
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

    const { credential, userId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get stored challenge
    const { data: sessionData } = await supabase
      .from('admin_sessions')
      .select('challenge')
      .eq('user_id', userId)
      .eq('device_fingerprint', 'webauthn-authentication')
      .single();

    if (!sessionData?.challenge) {
      return new Response(JSON.stringify({ error: 'Challenge not found or expired' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the credential from database
    const credentialIdBase64 = Buffer.from(credential.rawId, 'base64').toString('base64');
    
    const { data: storedCredential } = await supabase
      .from('webauthn_credentials')
      .select('*')
      .eq('user_id', userId)
      .eq('credential_id', credentialIdBase64)
      .single();

    if (!storedCredential) {
      return new Response(JSON.stringify({ error: 'Credential not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the authentication response
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: sessionData.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      authenticator: {
        credentialID: Buffer.from(storedCredential.credential_id, 'base64'),
        credentialPublicKey: Buffer.from(storedCredential.public_key, 'base64'),
        counter: storedCredential.counter || 0,
      },
    });

    if (!verification.verified) {
      const { ipAddress, userAgent, requestId } = extractRequestInfo(req);
      
      await logAuditEvent(supabase, {
        userId,
        eventCategory: 'auth',
        eventType: 'webauthn_authentication_failed',
        eventAction: 'access',
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

    // Update counter and last used
    await supabase
      .from('webauthn_credentials')
      .update({
        counter: verification.authenticationInfo.newCounter,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', storedCredential.id);

    // Clean up challenge
    await supabase
      .from('admin_sessions')
      .delete()
      .eq('user_id', userId)
      .eq('device_fingerprint', 'webauthn-authentication');

    const { ipAddress, userAgent, requestId } = extractRequestInfo(req);

    await logAuditEvent(supabase, {
      userId,
      eventCategory: 'auth',
      eventType: 'webauthn_authenticated',
      eventAction: 'access',
      severity: 'info',
      ipAddress,
      userAgent,
      requestId,
      resourceType: 'webauthn_credential',
      resourceId: storedCredential.id,
      metadata: { deviceName: storedCredential.device_name },
      success: true,
    });

    // Generate session token
    const { data: sessionToken, error: tokenError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: (await supabase.auth.admin.getUserById(userId)).data.user?.email || '',
    });

    if (tokenError) {
      throw tokenError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        session: sessionToken,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in webauthn-authenticate-complete:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
