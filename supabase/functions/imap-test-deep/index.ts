import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { OperationLogger, ERROR_CODES } from "../_shared/emailLogger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function sanitizeHostname(input: string): string {
  try {
    if (!input) return input;
    let h = input.trim();
    h = h.replace(/^(imap|imaps|smtp|smtps|http|https):\/\//i, '');
    h = h.split('/')[0];
    h = h.split(':')[0];
    return h;
  } catch (_) {
    return input;
  }
}

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
      setTimeout(() => reject(new Error('Connection timeout (10s)')), 10000)
    );

    await Promise.race([client.connect(), connectTimeout]);
    await logger.logSuccess(`${variantName} - Connected to server`);

    // Try to get capabilities before auth
    try {
      const caps = await client.capability();
      await logger.logSuccess(`${variantName} - Server capabilities`, { capabilities: caps });
    } catch (capErr: any) {
      await logger.logWarning(`${variantName} - Could not fetch capabilities`, { error: capErr.message });
    }

    // Try to select INBOX (which triggers authentication)
    const mailbox = await client.selectMailbox("INBOX");
    await logger.logSuccess(`${variantName} - Authentication successful`, { 
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
      mailbox_exists: mailbox.exists
    };

  } catch (err: any) {
    const errorMsg = err.message || String(err);
    
    if (err.name === 'ImapAuthError' || errorMsg.includes('AUTHENTICATIONFAILED') || errorMsg.includes('Authentication failed')) {
      await logger.logError(`${variantName} - Authentication failed`, ERROR_CODES.IMAP_AUTH_FAILED, errorMsg);
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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { account_id } = await req.json();
    
    const logger = new OperationLogger(supabaseUrl, supabaseKey, account_id, 'imap_deep_test');
    await logger.logStep('Deep IMAP diagnostics started', 'started', { account_id });

    // Fetch email account configuration
    await logger.logStep('Fetch account from database', 'in_progress');
    const { data: account, error: accountError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('id', account_id)
      .single();

    if (accountError || !account) {
      await logger.logError('Fetch account from database', ERROR_CODES.CONFIG_INCOMPLETE, `Email account not found: ${accountError?.message}`);
      throw new Error(`Email account not found: ${accountError?.message}`);
    }
    await logger.logSuccess('Fetch account from database', { account_name: account.name });

    // Validate configuration
    await logger.logStep('Validate configuration', 'in_progress');
    const rawHost = account.imap_host || '';
    const hostname = sanitizeHostname(rawHost);
    const port = account.imap_port;
    const username = (account.imap_username || account.email_address).trim();
    const password = account.imap_password?.trim();

    if (!hostname || !password || !username) {
      await logger.logError('Validate configuration', ERROR_CODES.CONFIG_INCOMPLETE, 'Missing required fields');
      throw new Error('IMAP configuration incomplete');
    }
    await logger.logSuccess('Validate configuration', { hostname, port, username });

    // Test multiple variants
    const results = [];

    // Variant 1: Original configuration
    const result1 = await testImapVariant(
      logger, hostname, port, username, password, account.imap_use_ssl,
      'Original Config'
    );
    results.push(result1);

    // If original failed and username is full email, try local-part only
    if (!result1.success && username.includes('@')) {
      const localPart = username.split('@')[0];
      const result2 = await testImapVariant(
        logger, hostname, port, localPart, password, account.imap_use_ssl,
        'Local-part username'
      );
      results.push(result2);
    }

    // If original failed and port 993, try port 143 with STARTTLS
    if (!result1.success && port === 993) {
      const result3 = await testImapVariant(
        logger, hostname, 143, username, password, false,
        'Port 143 (STARTTLS)'
      );
      results.push(result3);
      
      // Also try local-part on port 143 if applicable
      if (username.includes('@')) {
        const localPart = username.split('@')[0];
        const result4 = await testImapVariant(
          logger, hostname, 143, localPart, password, false,
          'Port 143 + Local-part'
        );
        results.push(result4);
      }
    }

    const durationMs = logger.getDurationMs();
    const successfulVariant = results.find(r => r.success);

    if (successfulVariant) {
      await logger.logSuccess('Deep test complete - FOUND WORKING CONFIG', { 
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
      await logger.logError('Deep test complete - NO WORKING CONFIG', ERROR_CODES.IMAP_AUTH_FAILED, 
        'All configuration variants failed');

      return new Response(
        JSON.stringify({ 
          ok: false,
          message: 'All configuration variants failed',
          all_results: results,
          duration_ms: durationMs,
          suggestion: 'Check that password is correct. Some providers require app-specific passwords.'
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error: any) {
    console.error('Deep IMAP test error:', error);

    return new Response(
      JSON.stringify({ 
        ok: false,
        message: error.message || 'Deep IMAP test failed',
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
