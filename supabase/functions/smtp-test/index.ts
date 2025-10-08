import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { account_id } = await req.json();
    
    const logger = new OperationLogger(supabaseUrl, supabaseKey, account_id, 'smtp_test');
    await logger.logStep('SMTP test started', 'started', { account_id });

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
    await logger.logStep('Validate SMTP configuration', 'in_progress');
    const rawHost = account.smtp_host || '';
    const hostname = sanitizeHostname(rawHost);
    const port = account.smtp_port;
    const username = (account.smtp_username || account.email_address).trim();
    const password = account.smtp_password?.trim();

    if (!hostname) {
      await logger.logError('Validate SMTP configuration', ERROR_CODES.INVALID_HOSTNAME, 'Hostname is empty or invalid');
      throw new Error('SMTP configuration incomplete: invalid hostname');
    }
    if (!port || port < 1 || port > 65535) {
      await logger.logError('Validate SMTP configuration', ERROR_CODES.INVALID_PORT, `Invalid port: ${port}`);
      throw new Error('SMTP configuration incomplete: invalid port');
    }
    if (!username || !password) {
      await logger.logError('Validate SMTP configuration', ERROR_CODES.MISSING_CREDENTIALS, 'Username or password missing');
      throw new Error('SMTP configuration incomplete: missing credentials');
    }
    await logger.logSuccess('Validate SMTP configuration', { hostname, port, username });

    // Test SMTP connection
    await logger.logStep('Connect to SMTP server', 'in_progress', { hostname, port, tls: account.smtp_use_ssl });
    
    const smtpConfig: any = {
      connection: {
        hostname,
        port,
        tls: account.smtp_use_ssl,
        auth: {
          username,
          password,
        },
      },
    };

    const client = new SMTPClient(smtpConfig.connection);

    try {
      await client.connect();
      await logger.logSuccess('Connect to SMTP server', { hostname, port });
      
      // Send test email
      await logger.logStep('Send test email', 'in_progress');
      await client.send({
        from: account.email_address,
        to: account.email_address,
        subject: "SMTP Test - Connection Successful",
        content: `This is a test email sent at ${new Date().toISOString()} to verify your SMTP configuration.\n\nYour SMTP server (${hostname}:${port}) is working correctly.`,
      });
      await logger.logSuccess('Send test email', { recipient: account.email_address });
      
      await client.close();
      await logger.logStep('Close connection', 'success');

    } catch (err: any) {
      await logger.logError('SMTP connection/send', ERROR_CODES.SMTP_AUTH_FAILED, err.message);
      throw err;
    }

    const durationMs = logger.getDurationMs();
    await logger.logSuccess('SMTP test complete', { duration_ms: durationMs });

    return new Response(
      JSON.stringify({ 
        ok: true,
        server: hostname,
        port,
        tls: account.smtp_use_ssl,
        test_email_sent_to: account.email_address,
        duration_ms: durationMs,
        message: 'SMTP connection successful and test email sent'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('SMTP test error:', error);

    return new Response(
      JSON.stringify({ 
        ok: false,
        message: error.message || 'SMTP test failed',
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
