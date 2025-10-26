import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
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

    const { userId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { ipAddress, userAgent, requestId } = extractRequestInfo(req);

    // Check if user is superadmin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'superadmin')
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Not a superadmin' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if there are any whitelisted IPs for this user
    const { data: whitelistEntries, error: whitelistError } = await supabase
      .from('admin_ip_whitelist')
      .select('*')
      .eq('user_id', userId)
      .eq('enabled', true);

    if (whitelistError) {
      throw whitelistError;
    }

    // If no whitelist entries exist, allow access (whitelist not configured)
    if (!whitelistEntries || whitelistEntries.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          whitelisted: true,
          reason: 'no_whitelist_configured',
          ipAddress,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if current IP is whitelisted
    const { data: isWhitelisted } = await supabase.rpc('is_ip_whitelisted', {
      _user_id: userId,
      _ip_address: ipAddress,
    });

    if (!isWhitelisted) {
      // Log blocked access attempt
      await logAuditEvent(supabase, {
        userId,
        eventCategory: 'admin',
        eventType: 'ip_blocked',
        eventAction: 'access',
        severity: 'warning',
        ipAddress,
        userAgent,
        requestId,
        success: false,
        errorMessage: 'IP address not whitelisted',
      });

      // Create security alert
      await createSecurityAlert(supabase, {
        alertType: 'blocked_ip_attempt',
        severity: 'warning',
        userId,
        title: 'Blocked Admin Login Attempt',
        description: `Admin login attempt from non-whitelisted IP: ${ipAddress}`,
        metadata: { ipAddress, userAgent },
      });

      return new Response(
        JSON.stringify({
          success: false,
          whitelisted: false,
          reason: 'ip_not_whitelisted',
          ipAddress,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Log successful IP validation
    await logAuditEvent(supabase, {
      userId,
      eventCategory: 'admin',
      eventType: 'ip_validated',
      eventAction: 'access',
      severity: 'info',
      ipAddress,
      userAgent,
      requestId,
      success: true,
    });

    return new Response(
      JSON.stringify({
        success: true,
        whitelisted: true,
        reason: 'ip_whitelisted',
        ipAddress,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in admin-validate-ip:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
