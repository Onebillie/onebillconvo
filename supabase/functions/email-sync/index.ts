import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import PostalMime from "npm:postal-mime@2.2.1";
import { OperationLogger, ERROR_CODES } from "../_shared/emailLogger.ts";

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
  last_imap_uid?: number;
  last_imap_uidvalidity?: number;
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
  attachments?: Array<{
    filename: string;
    contentType: string;
    content: Uint8Array;
  }>;
}

interface Diagnostics {
  dnsResolvedIPs?: string[];
  connectTest?: { success: boolean; error?: string };
  tlsHandshake?: { success: boolean; error?: string };
  imapLoginOk?: boolean;
  error?: string;
}

// Global sync lock to prevent concurrent syncs per account

// Utility to sanitize hostnames: strips protocols, paths, and ports
function sanitizeHostname(input: string): string {
  try {
    if (!input) return input;
    let h = input.trim();
    // Remove protocol prefixes
    h = h.replace(/^(imap|imaps|smtp|smtps|http|https):\/\//i, '');
    // Remove any path/query fragments
    h = h.split('/')[0];
    // Remove inline port if present
    h = h.split(':')[0];
    return h;
  } catch (_) {
    return input;
  }
}

const syncLocks = new Map<string, boolean>();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { account_id, auto_sync } = await req.json();

    // Auto-sync mode: sync all active IMAP accounts
    if (auto_sync) {
      const { data: accounts } = await supabase
        .from('email_accounts')
        .select('id')
        .eq('is_active', true)
        .eq('sync_enabled', true)
        .eq('inbound_method', 'imap');

      if (!accounts || accounts.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: 'No active IMAP accounts to sync' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const results = [];
      for (const account of accounts) {
        try {
          const response = await fetch(req.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ account_id: account.id })
          });
          const result = await response.json();
          results.push({ account_id: account.id, ...result });
        } catch (error: any) {
          results.push({ account_id: account.id, error: error.message });
        }
      }

      return new Response(
        JSON.stringify({ success: true, accounts_synced: results.length, results }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for concurrent sync lock
    if (syncLocks.get(account_id)) {
      return new Response(
        JSON.stringify({ error: 'Sync already in progress for this account' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    syncLocks.set(account_id, true);

    try {
      const logger = new OperationLogger(supabaseUrl, supabaseKey, account_id, 'sync_start');
      await logger.logStep('Email sync started', 'started', { account_id });
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
      const { data: syncLog } = await supabase
        .from('email_sync_logs')
        .insert({
          email_account_id: account.id,
          status: 'running'
        })
        .select()
        .single();

      const diagnostics: Diagnostics = {};

      try {
        // Fetch emails with diagnostics
        const { emails, newUid, newUidValidity, diagnostics: fetchDiag } = 
          await fetchEmailsFromIMAP(account as EmailAccount, diagnostics);
        
        Object.assign(diagnostics, fetchDiag);
        
        console.log(`Fetched ${emails.length} emails from IMAP`);

        let processedCount = 0;

        // Process each email
        for (const email of emails) {
          try {
            await processIncomingEmail(supabase, email, account.email_address, account.id);
            processedCount++;
          } catch (error) {
            console.error('Error processing email:', error);
          }
        }

        // Update incremental sync markers
        if (newUid !== undefined && newUidValidity !== undefined) {
          await supabase
            .from('email_accounts')
            .update({ 
              last_imap_uid: newUid,
              last_imap_uidvalidity: newUidValidity,
              last_sync_at: new Date().toISOString(),
              last_synced_at: new Date().toISOString()
            })
            .eq('id', account.id);
        }

        // Update sync log as completed
        if (syncLog) {
          await supabase
            .from('email_sync_logs')
            .update({
              status: 'completed',
              sync_completed_at: new Date().toISOString(),
              emails_fetched: emails.length,
              emails_processed: processedCount,
              diagnostics
            })
            .eq('id', syncLog.id);
        }

        // Trigger push notifications for new emails
        if (processedCount > 0) {
          await supabase.functions.invoke('send-push-notification', {
            body: {
              payload: {
                title: `${processedCount} New Email${processedCount > 1 ? 's' : ''}`,
                body: `You have received ${processedCount} new email message${processedCount > 1 ? 's' : ''}`,
                icon: '/icon-192.png',
                tag: 'email-notification',
                data: { type: 'email', count: processedCount }
              }
            }
          }).catch(err => console.error('Push notification error:', err));
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            fetched: emails.length, 
            processed: processedCount,
            diagnostics
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (error: any) {
        console.error('Email sync failed:', error);
        diagnostics.error = error.message;
        
        // Update sync log as failed
        if (syncLog) {
          await supabase
            .from('email_sync_logs')
            .update({
              status: 'failed',
              sync_completed_at: new Date().toISOString(),
              error_message: error.message,
              diagnostics
            })
            .eq('id', syncLog.id);
        }

        throw error;
      }
    } finally {
      syncLocks.delete(account_id);
    }

  } catch (error: any) {
    console.error('Error in email-sync function:', error);
    
    // Return 401 for auth errors
    if (error.message?.startsWith('IMAP_AUTH_FAILED')) {
      return new Response(
        JSON.stringify({ 
          error: error.message.replace('IMAP_AUTH_FAILED: ', ''),
          code: 'IMAP_AUTH_FAILED'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function fetchEmailsFromIMAP(
  account: EmailAccount, 
  diagnostics: Diagnostics
): Promise<{ 
  emails: ParsedEmail[]; 
  newUid?: number; 
  newUidValidity?: number;
  diagnostics: Diagnostics;
}> {
  console.log('=== Starting IMAP fetch with diagnostics ===');
  
  const rawHost = account.imap_host || '';
  const hostname = sanitizeHostname(rawHost);
  const port = account.imap_port;
  
  if (!hostname || !port) {
    throw new Error(`IMAP configuration missing: host=${rawHost}, port=${port}`);
  }

  console.log('IMAP host sanitized', { rawHost, hostname });

  // Step 1: DNS Resolution
  try {
    const resolved = await Deno.resolveDns(hostname, "A");
    diagnostics.dnsResolvedIPs = resolved;
    console.log(`DNS resolved ${hostname} to:`, resolved);
  } catch (error) {
    diagnostics.dnsResolvedIPs = [];
    console.error('DNS resolution failed:', error);
  }

  // Step 2: TCP Connection Test
  try {
    const testConn = await Deno.connectTls({
      hostname,
      port,
      alpnProtocols: ["imap"],
    });
    testConn.close();
    diagnostics.connectTest = { success: true };
    console.log('TCP/TLS connection test successful');
  } catch (error: any) {
    diagnostics.connectTest = { success: false, error: error.message };
    console.error('TCP/TLS connection test failed:', error);
    throw new Error(`Cannot connect to ${hostname}:${port} - ${error.message}`);
  }

  try {
    const { ImapClient } = await import("jsr:@workingdevshero/deno-imap@1.0.0");
    
    const username = (account.imap_username || account.email_address).trim();
    const password = account.imap_password?.trim();
    
    if (!username || !password) {
      throw new Error('IMAP credentials missing');
    }
    
    const imapConfig = {
      hostname, // Set both hostname and host for library compatibility
      host: hostname,
      port,
      tls: account.imap_use_ssl,
      auth: {
        username,
        password,
      },
    };
    
    console.log('Creating IMAP client:', { 
      hostname, 
      port, 
      tls: account.imap_use_ssl 
    });
    
    const client = new ImapClient(imapConfig);

    // Connection timeout wrapper
    const connectTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('IMAP connection timeout (10s)')), 10000)
    );

    await Promise.race([
      client.connect(),
      connectTimeout
    ]);
    
    console.log('Connected to IMAP server');
    diagnostics.imapLoginOk = true;
    diagnostics.tlsHandshake = { success: true };
    
    // Select INBOX
    const mailbox = await client.selectMailbox("INBOX");
    console.log('Selected INBOX, UIDVALIDITY:', mailbox.uidValidity);
    
    const currentUidValidity = mailbox.uidValidity;
    let searchCriteria: string[];

    // Incremental sync logic
    if (account.last_imap_uidvalidity === currentUidValidity && account.last_imap_uid) {
      // Same mailbox, fetch only new messages
      searchCriteria = [`UID ${account.last_imap_uid + 1}:*`];
      console.log(`Incremental sync from UID ${account.last_imap_uid + 1}`);
    } else {
      // UIDVALIDITY changed or first sync - fetch last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const dateStr = sevenDaysAgo.toISOString().split('T')[0].replace(/-/g, '');
      searchCriteria = [`SINCE ${dateStr}`];
      console.log('Full sync from last 7 days');
    }
    
    const messageIds = await client.search(searchCriteria);
    
    if (!messageIds || messageIds.length === 0) {
      console.log('No new emails found');
      await client.logout();
      return { 
        emails: [], 
        newUid: account.last_imap_uid,
        newUidValidity: currentUidValidity,
        diagnostics 
      };
    }

    console.log(`Found ${messageIds.length} emails`);
    
    const emails: ParsedEmail[] = [];
    let maxUid = account.last_imap_uid || 0;
    
    // Fetch emails (limit to 100 per sync to avoid timeout)
    const idsToFetch = messageIds.slice(-100);
    
    for (const msgId of idsToFetch) {
      try {
        // Fetch UID and raw message
        const message = await client.fetchMessage(msgId, {
          envelope: true,
          uid: true,
        });
        
        if (!message) continue;
        
        const uid = message.uid || msgId;
        if (uid > maxUid) maxUid = uid;

        // Fetch raw RFC822 message for MIME parsing
        const rawMessage = await client.fetchMessageSource(msgId);
        
        if (!rawMessage) continue;

        // Parse with PostalMime for attachments and better structure
        const parser = new PostalMime();
        const parsed = await parser.parse(rawMessage);
        
        const parsedEmail: ParsedEmail = {
          from: parsed.from?.address || '',
          to: parsed.to?.[0]?.address || account.email_address,
          subject: parsed.subject || 'No Subject',
          body: parsed.text || '',
          html: parsed.html || undefined,
          date: parsed.date ? new Date(parsed.date) : new Date(),
          messageId: parsed.messageId || `msg-${msgId}`,
          inReplyTo: parsed.inReplyTo,
          references: parsed.references || [],
          attachments: parsed.attachments?.map(att => ({
            filename: att.filename || 'attachment',
            contentType: att.mimeType || 'application/octet-stream',
            content: att.content
          })) || []
        };
        
        emails.push(parsedEmail);
      } catch (error) {
        console.error(`Error fetching message ${msgId}:`, error);
      }
    }
    
    await client.logout();
    
    return { 
      emails, 
      newUid: maxUid, 
      newUidValidity: currentUidValidity,
      diagnostics 
    };
  } catch (error: any) {
    console.error('IMAP fetch error:', error);
    diagnostics.imapLoginOk = false;
    
    // Detect authentication failure
    if (error.name === 'ImapAuthError' || error.message?.includes('AUTHENTICATIONFAILED')) {
      throw new Error('IMAP_AUTH_FAILED: Authentication failed. Please verify your username and password. Some mail providers require an "app password" instead of your regular password.');
    }
    
    throw new Error(`Failed to fetch emails: ${error.message}`);
  }
}

async function processIncomingEmail(
  supabase: any, 
  email: ParsedEmail, 
  accountEmail: string,
  accountId: string
) {
  console.log('Processing email:', email.subject);

  const fromEmail = email.from.match(/<(.+)>/)?.[1] || email.from;

  // Check for duplicates
  const { data: existingMessage } = await supabase
    .from('messages')
    .select('id')
    .eq('external_message_id', email.messageId)
    .maybeSingle();

  if (existingMessage) {
    console.log('Duplicate email, skipping');
    return;
  }

  // Find or create customer
  let { data: customer } = await supabase
    .from('customers')
    .select('*')
    .or(`email.eq.${fromEmail},alternate_emails.cs.{${fromEmail}}`)
    .maybeSingle();

  if (!customer) {
    const customerName = email.from.replace(/<.*>/, '').trim() || fromEmail;
    const firstName = customerName.split(' ')[0] || customerName;
    const lastName = customerName.split(' ').slice(1).join(' ') || '';
    
    const { data: newCustomer } = await supabase
      .from('customers')
      .insert({
        name: customerName,
        first_name: firstName,
        last_name: lastName,
        email: fromEmail,
        phone: fromEmail,
        last_contact_method: 'email'
      })
      .select()
      .single();

    customer = newCustomer;
  } else {
    await supabase
      .from('customers')
      .update({ 
        last_contact_method: 'email',
        last_active: new Date().toISOString()
      })
      .eq('id', customer.id);
  }

  // Find or create conversation with threading
  let conversation = null;
  let repliedToMessageId = null;
  let threadId = null;

  if (email.inReplyTo) {
    const { data: parentMsg } = await supabase
      .from('messages')
      .select('conversation_id, id, thread_id')
      .eq('external_message_id', email.inReplyTo)
      .maybeSingle();
    
    if (parentMsg) {
      conversation = { id: parentMsg.conversation_id };
      repliedToMessageId = parentMsg.id;
      threadId = parentMsg.thread_id || parentMsg.id;
    }
  }
  
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

  if (!conversation) {
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({
        customer_id: customer.id,
        status: 'active'
      })
      .select()
      .single();

    conversation = newConv;
  }

  // Insert message
  const { data: insertedMessage, error: messageError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversation.id,
      customer_id: customer.id,
      content: email.html || email.body || email.subject,
      subject: email.subject,
      direction: 'inbound',
      platform: 'email',
      channel: 'email',
      external_message_id: email.messageId,
      replied_to_message_id: repliedToMessageId,
      thread_id: threadId,
      is_read: false,
      created_at: email.date.toISOString()
    })
    .select()
    .single();

  if (messageError) throw messageError;

  // Handle attachments
  if (email.attachments && email.attachments.length > 0) {
    for (const attachment of email.attachments) {
      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const filename = `${Date.now()}-${attachment.filename}`;
        const storagePath = `customers/${customer.id}/email/${year}/${month}/${filename}`;

        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('customer_media')
          .upload(storagePath, attachment.content, {
            contentType: attachment.contentType,
            upsert: false
          });

        if (uploadError) {
          console.error('Attachment upload error:', uploadError);
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('customer_media')
          .getPublicUrl(storagePath);

        // Insert attachment record
        await supabase
          .from('message_attachments')
          .insert({
            message_id: insertedMessage.id,
            filename: attachment.filename,
            url: publicUrl,
            type: attachment.contentType,
            size: attachment.content.byteLength
          });

      } catch (error) {
        console.error('Error processing attachment:', error);
      }
    }
  }

  console.log('Email processed successfully');
}