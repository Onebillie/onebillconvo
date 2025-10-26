import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as OTPAuth from 'https://esm.sh/otpauth@9.1.4';
import { logAuditEvent, extractRequestInfo, createSecurityAlert } from '../_shared/auditLogger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { code, userId, action = 'login' } = await req.json();

    if (!code || !userId) {
      return new Response(JSON.stringify({ error: 'Missing code or userId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get 2FA settings
    const { data: twoFactorAuth, error: fetchError } = await supabase
      .from('two_factor_auth')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError || !twoFactorAuth) {
      return new Response(JSON.stringify({ error: '2FA not set up for this user' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { ipAddress, userAgent, requestId } = extractRequestInfo(req);
    let verified = false;
    let usedBackupCode = false;

    // Check if it's a backup code
    if (twoFactorAuth.backup_codes && twoFactorAuth.backup_codes.includes(code)) {
      verified = true;
      usedBackupCode = true;

      // Remove used backup code
      const updatedBackupCodes = twoFactorAuth.backup_codes.filter((bc: string) => bc !== code);
      await supabase
        .from('two_factor_auth')
        .update({ backup_codes: updatedBackupCodes })
        .eq('user_id', userId);

      // Alert if running low on backup codes
      if (updatedBackupCodes.length <= 3) {
        await createSecurityAlert(supabase, {
          alertType: 'low_backup_codes',
          severity: 'warning',
          userId,
          title: 'Low on 2FA Backup Codes',
          description: `You have only ${updatedBackupCodes.length} backup codes remaining. Consider regenerating them.`,
        });
      }
    } else {
      // Verify TOTP code
      const secret = OTPAuth.Secret.fromBase32(twoFactorAuth.secret_key);
      const totp = new OTPAuth.TOTP({
        issuer: 'À La Carte Chat',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: secret,
      });

      const delta = totp.validate({ token: code, window: 1 });
      verified = delta !== null;
    }

    if (!verified) {
      // Log failed attempt
      await logAuditEvent(supabase, {
        userId,
        eventCategory: 'auth',
        eventType: '2fa_verification_failed',
        eventAction: 'access',
        severity: 'warning',
        ipAddress,
        userAgent,
        requestId,
        success: false,
      });

      return new Response(JSON.stringify({ error: 'Invalid 2FA code' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If this is the initial setup verification, enable 2FA
    if (action === 'enable' && !twoFactorAuth.enabled) {
      await supabase
        .from('two_factor_auth')
        .update({
          enabled: true,
          verified_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      await logAuditEvent(supabase, {
        userId,
        eventCategory: 'auth',
        eventType: '2fa_enabled',
        eventAction: 'update',
        severity: 'info',
        ipAddress,
        userAgent,
        requestId,
        success: true,
      });
    } else {
      // Log successful login verification
      await logAuditEvent(supabase, {
        userId,
        eventCategory: 'auth',
        eventType: usedBackupCode ? '2fa_backup_code_used' : '2fa_verification_success',
        eventAction: 'access',
        severity: 'info',
        ipAddress,
        userAgent,
        requestId,
        success: true,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        usedBackupCode,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in 2fa-verify:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
