import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailAccount {
  id: string;
  email_address: string;
  imap_host: string;
  imap_port: number;
  imap_username: string;
  imap_password: string;
  imap_use_ssl: boolean;
}

interface ParsedEmail {
  from: string;
  to: string;
  subject: string;
  body: string;
  html?: string;
  date: Date;
  messageId: string;
  inReplyTo?: string;
  references?: string[];
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

    console.log('Starting email sync for account:', account_id);

    // Fetch email account configuration
    const { data: account, error: accountError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('id', account_id)
      .eq('is_active', true)
      .eq('sync_enabled', true)
      .single();

    if (accountError || !account) {
      throw new Error(`Email account not found or inactive: ${accountError?.message}`);
    }

    // Create sync log entry
    const { data: syncLog, error: logError } = await supabase
      .from('email_sync_logs')
      .insert({
        email_account_id: account.id,
        status: 'running'
      })
      .select()
      .single();

    if (logError) {
      console.error('Failed to create sync log:', logError);
    }

    try {
      // Fetch emails from IMAP server
      const emails = await fetchEmailsFromIMAP(account as EmailAccount);
      
      console.log(`Fetched ${emails.length} emails from IMAP`);

      let processedCount = 0;

      // Process each email
      for (const email of emails) {
        try {
          await processIncomingEmail(supabase, email, account.email_address);
          processedCount++;
        } catch (error) {
          console.error('Error processing email:', error);
        }
      }

      // Update sync log as completed
      await supabase
        .from('email_sync_logs')
        .update({
          status: 'completed',
          sync_completed_at: new Date().toISOString(),
          emails_fetched: emails.length,
          emails_processed: processedCount
        })
        .eq('id', syncLog.id);

      // Update last_sync_at on email account
      await supabase
        .from('email_accounts')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', account.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          fetched: emails.length, 
          processed: processedCount 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('Email sync failed:', error);
      
      // Update sync log as failed
      if (syncLog) {
        await supabase
          .from('email_sync_logs')
          .update({
            status: 'failed',
            sync_completed_at: new Date().toISOString(),
            error_message: error.message
          })
          .eq('id', syncLog.id);
      }

      throw error;
    }

  } catch (error: any) {
    console.error('Error in email-sync function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function fetchEmailsFromIMAP(account: EmailAccount): Promise<ParsedEmail[]> {
  // Note: Deno doesn't have native IMAP support, so we'll use a REST API approach
  // This is a placeholder - you'll need to use an IMAP library or service
  
  console.log(`Connecting to IMAP: ${account.imap_host}:${account.imap_port}`);
  
  // TODO: Implement actual IMAP connection using a library like:
  // - imap (npm package) 
  // - Or use a service like Nylas, Zapier Email Parser, etc.
  
  // For now, return empty array
  // In production, this would connect to IMAP, fetch unread emails, parse them
  return [];
}

async function processIncomingEmail(
  supabase: any, 
  email: ParsedEmail, 
  accountEmail: string
) {
  console.log('Processing email from:', email.from, 'subject:', email.subject);

  // Extract email address from "Name <email@domain.com>" format
  const fromEmail = email.from.match(/<(.+)>/)?.[1] || email.from;

  // Find or create customer
  let { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('email', fromEmail)
    .maybeSingle();

  if (!customer) {
    const customerName = email.from.replace(/<.*>/, '').trim() || fromEmail;
    const { data: newCustomer, error: customerError } = await supabase
      .from('customers')
      .insert({
        name: customerName,
        email: fromEmail,
        phone: '', // Required field
        last_contact_method: 'email'
      })
      .select()
      .single();

    if (customerError) {
      console.error('Failed to create customer:', customerError);
      throw customerError;
    }
    customer = newCustomer;
  } else {
    // Update last_contact_method
    await supabase
      .from('customers')
      .update({ 
        last_contact_method: 'email',
        last_active: new Date().toISOString()
      })
      .eq('id', customer.id);
  }

  // Find or create active conversation
  let { data: conversation } = await supabase
    .from('conversations')
    .select('*')
    .eq('customer_id', customer.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conversation) {
    const { data: newConversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        customer_id: customer.id,
        status: 'active'
      })
      .select()
      .single();

    if (convError) {
      console.error('Failed to create conversation:', convError);
      throw convError;
    }
    conversation = newConversation;
  }

  // Insert message
  const { error: messageError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversation.id,
      customer_id: customer.id,
      content: email.body || email.html || email.subject,
      direction: 'inbound',
      platform: 'email',
      channel: 'email',
      external_message_id: email.messageId,
      is_read: false,
      created_at: email.date.toISOString()
    });

  if (messageError) {
    console.error('Failed to insert message:', messageError);
    throw messageError;
  }

  console.log('Email processed successfully');
}