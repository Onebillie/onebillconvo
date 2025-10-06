import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

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

    // Fetch email account configuration
    const { data: account, error: accountError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('id', account_id)
      .single();

    if (accountError || !account) {
      throw new Error(`Email account not found: ${accountError?.message}`);
    }

    const rawHost = account.imap_host || '';
    const hostname = sanitizeHostname(rawHost);
    const port = account.imap_port;
    const username = (account.imap_username || account.email_address).trim();
    const password = account.imap_password?.trim();

    if (!hostname || !port || !username || !password) {
      throw new Error('IMAP configuration incomplete');
    }

    console.log('Sanitized IMAP host', { rawHost, hostname });

    // Test connection
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
    
    const client = new ImapClient(imapConfig);

    const connectTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout (10s)')), 10000)
    );

    await Promise.race([
      client.connect(),
      connectTimeout
    ]);
    
    console.log('✓ Connected and authenticated successfully');
    
    // Get server greeting
    const mailbox = await client.selectMailbox("INBOX");
    
    await client.logout();

    return new Response(
      JSON.stringify({ 
        ok: true,
        server: hostname,
        port,
        tls: account.imap_use_ssl,
        mailbox: 'INBOX',
        uidvalidity: mailbox.uidValidity,
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
          code: 'IMAP_AUTH_FAILED',
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

