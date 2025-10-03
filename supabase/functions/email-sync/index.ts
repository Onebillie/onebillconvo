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
  console.log(`Connecting to IMAP: ${account.imap_host}:${account.imap_port}`);
  console.log(`IMAP Config - Host: ${account.imap_host}, Port: ${account.imap_port}, SSL: ${account.imap_use_ssl}`);
  
  if (!account.imap_host || !account.imap_port) {
    throw new Error('IMAP host or port is missing from account configuration');
  }
  
  try {
    const { ImapClient } = await import("jsr:@workingdevshero/deno-imap@1.0.0");
    
    // Ensure all config values are properly set
    const hostname = account.imap_host?.trim();
    const port = account.imap_port;
    const username = account.imap_username || account.email_address;
    const password = account.imap_password;
    
    if (!hostname || !port || !username || !password) {
      throw new Error(`Missing IMAP configuration: hostname=${hostname}, port=${port}, username=${username ? 'set' : 'missing'}, password=${password ? 'set' : 'missing'}`);
    }
    
    const imapConfig = {
      hostname,
      port,
      tls: account.imap_use_ssl,
      auth: {
        username,
        password,
      },
    };
    
    console.log('Creating IMAP client with config:', { 
      hostname: imapConfig.hostname, 
      port: imapConfig.port, 
      tls: imapConfig.tls,
      auth: { username: imapConfig.auth.username, password: '[REDACTED]' } 
    });
    
    const client = new ImapClient(imapConfig);

    await client.connect();
    console.log('Connected to IMAP server');
    
    // Select INBOX
    await client.selectMailbox("INBOX");
    console.log('Selected INBOX');
    
    // Calculate date 7 days ago to fetch recent emails (read or unread)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateStr = sevenDaysAgo.toISOString().split('T')[0].replace(/-/g, '');
    
    // Search for emails from last 7 days (both read and unread)
    const messageIds = await client.search([`SINCE ${dateStr}`]);
    
    if (!messageIds || messageIds.length === 0) {
      console.log('No new emails found');
      await client.close();
      return [];
    }

    console.log(`Found ${messageIds.length} new emails`);
    
    const emails: ParsedEmail[] = [];
    
    // Fetch email details (limit to last 100 to avoid overload)
    const idsToFetch = messageIds.slice(-100);
    console.log(`Fetching ${idsToFetch.length} emails`);
    
    for (const msgId of idsToFetch) {
      try {
        const message = await client.fetchMessage(msgId, {
          bodyStructure: true,
          envelope: true,
          flags: true,
        });
        
        if (!message) continue;
        
        // Fetch full body
        const bodyPart = await client.fetchMessageBody(msgId);
        let bodyText = '';
        let bodyHtml = '';
        
        if (bodyPart) {
          // Parse body - simplified approach
          bodyText = bodyPart.toString();
          if (bodyText.includes('<html') || bodyText.includes('<HTML')) {
            bodyHtml = bodyText;
          }
        }
        
        const parsedEmail: ParsedEmail = {
          from: message.envelope?.from?.[0]?.address || '',
          to: message.envelope?.to?.[0]?.address || account.email_address,
          subject: message.envelope?.subject || 'No Subject',
          body: bodyText,
          html: bodyHtml,
          date: message.envelope?.date ? new Date(message.envelope.date) : new Date(),
          messageId: message.envelope?.messageId || `msg-${msgId}`,
          inReplyTo: message.envelope?.inReplyTo,
          references: message.envelope?.references || [],
        };
        
        emails.push(parsedEmail);
      } catch (error) {
        console.error(`Error fetching message ${msgId}:`, error);
      }
    }
    
    await client.logout();
    return emails;
  } catch (error: any) {
    console.error('IMAP fetch error:', error);
    throw new Error(`Failed to fetch emails: ${error.message}`);
  }
}

async function processIncomingEmail(
  supabase: any, 
  email: ParsedEmail, 
  accountEmail: string
) {
  console.log('Processing email from:', email.from, 'subject:', email.subject);

  // Extract email address from "Name <email@domain.com>" format
  const fromEmail = email.from.match(/<(.+)>/)?.[1] || email.from;

  // Check if message already exists (prevent duplicates)
  const { data: existingMessage } = await supabase
    .from('messages')
    .select('id')
    .eq('external_message_id', email.messageId)
    .maybeSingle();

  if (existingMessage) {
    console.log('Email already processed, skipping');
    return;
  }

  // Find customer by email, phone, OR alternate_emails
  let { data: customer } = await supabase
    .from('customers')
    .select('*')
    .or(`email.eq.${fromEmail},phone.eq.${fromEmail},alternate_emails.cs.{${fromEmail}}`)
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

  // Try to find existing conversation by threading (for replies)
  let { data: conversation } = null;
  
  // First, try to find conversation by checking if this is a reply to an existing message
  if (email.inReplyTo || (email.references && email.references.length > 0)) {
    const threadIds = [email.inReplyTo, ...(email.references || [])].filter(Boolean);
    
    for (const threadId of threadIds) {
      const { data: parentMessage } = await supabase
        .from('messages')
        .select('conversation_id')
        .eq('external_message_id', threadId)
        .maybeSingle();
      
      if (parentMessage) {
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', parentMessage.conversation_id)
          .eq('customer_id', customer.id)
          .single();
        
        if (existingConv) {
          conversation = existingConv;
          console.log('Found existing conversation via email threading');
          break;
        }
      }
    }
  }
  
  // If not found via threading, look for most recent active conversation
  if (!conversation) {
    const { data: activeConv } = await supabase
      .from('conversations')
      .select('*')
      .eq('customer_id', customer.id)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    conversation = activeConv;
  }

  // If still no conversation, create new one
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