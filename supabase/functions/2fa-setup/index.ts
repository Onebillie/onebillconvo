import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as OTPAuth from 'https://esm.sh/otpauth@9.1.4';
import { logAuditEvent, extractRequestInfo } from '../_shared/auditLogger.ts';

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

    // Check if user is superadmin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'superadmin')
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Only superadmins can enable 2FA' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if 2FA already exists
    const { data: existing2FA } = await supabase
      .from('two_factor_auth')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (existing2FA && existing2FA.enabled) {
      return new Response(JSON.stringify({ error: '2FA is already enabled' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate TOTP secret
    const secret = new OTPAuth.Secret({ size: 20 });
    const totp = new OTPAuth.TOTP({
      issuer: 'À La Carte Chat',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: secret,
    });

    // Generate backup codes (10 codes)
    const backupCodes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      backupCodes.push(code);
    }

    // Store in database (not yet enabled)
    const { error: insertError } = await supabase
      .from('two_factor_auth')
      .upsert({
        user_id: user.id,
        secret_key: secret.base32,
        backup_codes: backupCodes,
        enabled: false,
      });

    if (insertError) {
      throw insertError;
    }

    // Generate QR code URL
    const qrCodeUrl = totp.toString();

    const { ipAddress, userAgent, requestId } = extractRequestInfo(req);

    // Log audit event
    await logAuditEvent(supabase, {
      userId: user.id,
      eventCategory: 'auth',
      eventType: '2fa_setup_initiated',
      eventAction: 'create',
      severity: 'info',
      ipAddress,
      userAgent,
      requestId,
      success: true,
    });

    return new Response(
      JSON.stringify({
        success: true,
        secret: secret.base32,
        qrCodeUrl,
        backupCodes,
        message: 'Scan the QR code with your authenticator app and verify to enable 2FA',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in 2fa-setup:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
