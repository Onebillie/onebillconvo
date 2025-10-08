import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { OperationLogger, ERROR_CODES } from "../_shared/emailLogger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function testImapVariant(
  logger: OperationLogger,
  hostname: string,
  port: number,
  username: string,
  password: string,
  useTls: boolean,
  variantName: string
) {
  const { ImapClient } = await import("jsr:@workingdevshero/deno-imap@1.0.0");
  
  await logger.logStep(`Test variant: ${variantName}`, 'in_progress', { hostname, port, username, useTls });

  const imapConfig = {
    hostname,
    host: hostname,
    port,
    tls: useTls,
    auth: {
      username,
      password,
    },
  };

  const client = new ImapClient(imapConfig);

  try {
    // Connect with timeout
    const connectTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout (15s)')), 15000)
    );

    await Promise.race([client.connect(), connectTimeout]);
    await logger.logSuccess(`${variantName} - Connected to server`);

    // Try to get capabilities before auth
    let capabilities: string[] = [];
    try {
      capabilities = await client.capability();
      await logger.logSuccess(`${variantName} - Server capabilities`, { capabilities });
    } catch (capErr: any) {
      await logger.logWarning(`${variantName} - Could not fetch capabilities`, { error: capErr.message });
    }

    // Extract AUTH mechanisms
    const authMechanisms = capabilities.filter(c => c.startsWith('AUTH=')).map(c => c.replace('AUTH=', ''));
    if (authMechanisms.length > 0) {
      await logger.logStep(`${variantName} - Available AUTH methods`, 'success', { mechanisms: authMechanisms });
    }

    // Try to select INBOX (which triggers authentication)
    const mailbox = await client.selectMailbox("INBOX");
    await logger.logSuccess(`${variantName} - Authentication successful ✓`, { 
      username,
      mailbox_exists: mailbox.exists,
      uidValidity: mailbox.uidValidity 
    });

    await client.logout();
    await logger.logSuccess(`${variantName} - Disconnected cleanly`);

    return {
      success: true,
      variant: variantName,
      config: { hostname, port, username, useTls },
      mailbox_exists: mailbox.exists,
      auth_mechanisms: authMechanisms
    };

  } catch (err: any) {
    const errorMsg = err.message || String(err);
    
    if (err.name === 'ImapAuthError' || errorMsg.includes('AUTHENTICATIONFAILED') || errorMsg.includes('Authentication failed')) {
      await logger.logError(`${variantName} - Authentication rejected by server`, ERROR_CODES.IMAP_AUTH_FAILED, errorMsg);
    } else if (errorMsg.includes('timeout')) {
      await logger.logError(`${variantName} - Connection timeout`, ERROR_CODES.CONNECTION_TIMEOUT, errorMsg);
    } else {
      await logger.logError(`${variantName} - Connection failed`, ERROR_CODES.TCP_CONNECTION_FAILED, errorMsg);
    }

    try {
      await client.logout();
    } catch (_) {
      // Ignore logout errors
    }

    return {
      success: false,
      variant: variantName,
      config: { hostname, port, username, useTls },
      error: errorMsg
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const { hostname, port, username, password, useTls } = await req.json();
    
    const logger = new OperationLogger(supabaseUrl, supabaseKey, 'manual-test', 'manual_imap_test');
    await logger.logStep('Manual IMAP test started', 'started', { hostname, port, username, useTls });

    // Validate input
    if (!hostname || !port || !username || !password) {
      await logger.logError('Validation', ERROR_CODES.CONFIG_INCOMPLETE, 'Missing required fields');
      throw new Error('Missing required fields: hostname, port, username, password');
    }

    // Test multiple variants
    const results = [];

    // Variant 1: Exact configuration provided
    const result1 = await testImapVariant(
      logger, hostname, port, username, password, useTls,
      `${username} @ ${hostname}:${port} (${useTls ? 'TLS' : 'STARTTLS'})`
    );
    results.push(result1);

    // Variant 2: If username is full email, try local-part only
    if (!result1.success && username.includes('@')) {
      const localPart = username.split('@')[0];
      const result2 = await testImapVariant(
        logger, hostname, port, localPart, password, useTls,
        `${localPart} @ ${hostname}:${port} (${useTls ? 'TLS' : 'STARTTLS'})`
      );
      results.push(result2);
    }

    // Variant 3: If port 993 failed, try 143
    if (!result1.success && port === 993) {
      const result3 = await testImapVariant(
        logger, hostname, 143, username, password, false,
        `${username} @ ${hostname}:143 (STARTTLS)`
      );
      results.push(result3);
      
      // Variant 4: Also try local-part on port 143 if applicable
      if (username.includes('@')) {
        const localPart = username.split('@')[0];
        const result4 = await testImapVariant(
          logger, hostname, 143, localPart, password, false,
          `${localPart} @ ${hostname}:143 (STARTTLS)`
        );
        results.push(result4);
      }
    }

    // Variant 5: If port 143 failed, try 993
    if (!result1.success && port === 143) {
      const result5 = await testImapVariant(
        logger, hostname, 993, username, password, true,
        `${username} @ ${hostname}:993 (TLS)`
      );
      results.push(result5);
      
      // Variant 6: Also try local-part on port 993 if applicable
      if (username.includes('@')) {
        const localPart = username.split('@')[0];
        const result6 = await testImapVariant(
          logger, hostname, 993, localPart, password, true,
          `${localPart} @ ${hostname}:993 (TLS)`
        );
        results.push(result6);
      }
    }

    const durationMs = logger.getDurationMs();
    const successfulVariant = results.find(r => r.success);

    if (successfulVariant) {
      await logger.logSuccess('Manual test complete - FOUND WORKING CONFIG ✓', { 
        duration_ms: durationMs,
        working_variant: successfulVariant.variant,
        working_config: successfulVariant.config
      });

      return new Response(
        JSON.stringify({ 
          ok: true,
          message: 'Found working configuration',
          working_variant: successfulVariant.variant,
          working_config: successfulVariant.config,
          all_results: results,
          duration_ms: durationMs
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      await logger.logError('Manual test complete - NO WORKING CONFIG', ERROR_CODES.IMAP_AUTH_FAILED, 
        'All configuration variants failed');

      return new Response(
        JSON.stringify({ 
          ok: false,
          message: 'All configuration variants failed',
          all_results: results,
          duration_ms: durationMs,
          suggestion: 'Double-check password. Some providers require app-specific passwords. Check server logs if available.'
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error: any) {
    console.error('Manual IMAP test error:', error);

    return new Response(
      JSON.stringify({ 
        ok: false,
        message: error.message || 'Manual IMAP test failed',
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
