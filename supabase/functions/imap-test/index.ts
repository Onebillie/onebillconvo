import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { OperationLogger, ERROR_CODES } from "../_shared/emailLogger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Utility to sanitize hostnames: strips protocols, paths, and ports
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { account_id } = await req.json();
    
    // Initialize operation logger
    const logger = new OperationLogger(supabaseUrl, supabaseKey, account_id, 'account_test');
    await logger.logStep('Function invoked', 'started', { account_id });

    // STEP 2: Fetch email account configuration
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

    // STEP 3: Validate configuration
    await logger.logStep('Validate configuration', 'in_progress');
    const rawHost = account.imap_host || '';
    const hostname = sanitizeHostname(rawHost);
    const port = account.imap_port;
    const username = (account.imap_username || account.email_address).trim();
    const password = account.imap_password?.trim();

    if (!hostname) {
      await logger.logError('Validate configuration', ERROR_CODES.INVALID_HOSTNAME, 'Hostname is empty or invalid');
      throw new Error('IMAP configuration incomplete: invalid hostname');
    }
    if (!port || port < 1 || port > 65535) {
      await logger.logError('Validate configuration', ERROR_CODES.INVALID_PORT, `Invalid port: ${port}`);
      throw new Error('IMAP configuration incomplete: invalid port');
    }
    if (!username || !password) {
      await logger.logError('Validate configuration', ERROR_CODES.MISSING_CREDENTIALS, 'Username or password missing');
      throw new Error('IMAP configuration incomplete: missing credentials');
    }
    await logger.logSuccess('Validate configuration', { hostname, port, username });

    // STEP 4: Sanitize hostname
    console.log('Sanitized IMAP host', { rawHost, hostname });

    // STEP 5: Create IMAP client
    await logger.logStep('Create IMAP client', 'in_progress', { hostname, port, tls: account.imap_use_ssl });
    const { ImapClient } = await import("jsr:@workingdevshero/deno-imap@1.0.0");
    
    const imapConfig = {
      hostname,
      host: hostname,
      port,
      tls: account.imap_use_ssl,
      auth: {
        username,
        password,
      },
    };

    console.log(`Testing IMAP connection to ${hostname}:${port}`);
    await logger.logSuccess('Create IMAP client');
    
    // STEP 6: Connect to IMAP server
    await logger.logStep('Connect to IMAP server', 'in_progress');
    const client = new ImapClient(imapConfig);

    const connectTimeout = new Promise((_, reject) => 
      setTimeout(() => {
        logger.logError('Connect to IMAP server', ERROR_CODES.CONNECTION_TIMEOUT, 'Connection timeout after 10 seconds');
        reject(new Error('Connection timeout (10s)'));
      }, 10000)
    );

    try {
      await Promise.race([
        client.connect(),
        connectTimeout
      ]);
      await logger.logSuccess('Connect to IMAP server');
    } catch (err: any) {
      if (err.message.includes('timeout')) {
        throw err;
      }
      await logger.logError('Connect to IMAP server', ERROR_CODES.TCP_CONNECTION_FAILED, err.message);
      throw err;
    }
    
    console.log('✓ Connected and authenticated successfully');
    
    // STEP 7: Authenticate and select INBOX
    await logger.logStep('Authenticate', 'in_progress', { username });
    await logger.logStep('Select INBOX', 'in_progress');
    let mailbox;
    try {
      mailbox = await client.selectMailbox("INBOX");
      // If we can select INBOX, auth is effectively confirmed
      await logger.logSuccess('Authenticate', { username });
      await logger.logSuccess('Select INBOX', { 
        uidValidity: mailbox.uidValidity,
        exists: mailbox.exists 
      });
    } catch (err: any) {
      // Classify precisely where it failed
      if (err.name === 'ImapAuthError' || err.message?.includes('AUTHENTICATIONFAILED') || err.message?.includes('Authentication failed')) {
        await logger.logError('Authenticate', ERROR_CODES.IMAP_AUTH_FAILED, err.message);
        throw err;
      }
      if (typeof err.message === 'string' && err.message.toLowerCase().includes('mailbox') && err.message.toLowerCase().includes('not') && err.message.toLowerCase().includes('found')) {
        await logger.logError('Select INBOX', ERROR_CODES.MAILBOX_NOT_FOUND, err.message);
        throw err;
      }
      await logger.logError('Select INBOX', ERROR_CODES.FETCH_FAILED, err.message);
      throw err;
    }
    
    // STEP 9: Logout
    await logger.logStep('Logout', 'in_progress');
    await client.logout();
    await logger.logSuccess('Logout');

    // STEP 10: Test complete
    const durationMs = logger.getDurationMs();
    await logger.logSuccess('Test complete', { duration_ms: durationMs });

    return new Response(
      JSON.stringify({ 
        ok: true,
        server: hostname,
        port,
        tls: account.imap_use_ssl,
        mailbox: 'INBOX',
        uidvalidity: mailbox.uidValidity,
        duration_ms: durationMs,
        message: 'Connection successful'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('IMAP test error:', error);

    // Detect authentication failure
    if (error.name === 'ImapAuthError' || error.message?.includes('AUTHENTICATIONFAILED') || error.message?.includes('Authentication failed')) {
      return new Response(
        JSON.stringify({ 
          ok: false,
          code: ERROR_CODES.IMAP_AUTH_FAILED,
          message: 'Authentication failed. Please verify your username and password. Some mail providers require an "app password" instead of your regular password.',
          error: error.message
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Other errors
    return new Response(
      JSON.stringify({ 
        ok: false,
        message: error.message,
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

