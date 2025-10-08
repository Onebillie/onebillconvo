import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import PostalMime from "npm:postal-mime@2.2.7";
import { OperationLogger, ERROR_CODES } from "../_shared/emailLogger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface POP3Account {
  id: string;
  business_id: string;
  email_address: string;
  pop3_host: string;
  pop3_port: number;
  pop3_use_ssl: boolean;
  pop3_username: string;
  pop3_password: string;
  last_pop3_uidl: string | null;
  delete_after_sync: boolean;
  mark_as_read: boolean;
}

interface ParsedEmail {
  messageId: string;
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
  date: Date;
  inReplyTo: string | null;
  references: string[];
  attachments: any[];
  uidl: string;
}

const syncLocks = new Map<string, boolean>();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { account_id } = await req.json();

    if (syncLocks.get(account_id)) {
      console.log(`Sync already in progress for account ${account_id}`);
      return new Response(
        JSON.stringify({ message: 'Sync already in progress' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    syncLocks.set(account_id, true);

    try {
      const { data: account, error: accountError } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('id', account_id)
        .eq('inbound_method', 'pop3')
        .single();

      if (accountError || !account) {
        throw new Error('POP3 account not found or not configured for POP3');
      }

      const logger = new OperationLogger(supabaseUrl, supabaseKey, account_id, 'pop3_sync');
      await logger.logSuccess('POP3 sync started');

      const emails = await fetchEmailsFromPOP3(account as POP3Account, logger);

      console.log(`Fetched ${emails.length} emails from POP3`);
      await logger.logSuccess('Emails fetched', { count: emails.length });

      let processedCount = 0;
      for (const email of emails) {
        try {
          await processIncomingEmail(supabase, email, account.email_address, account.business_id, account_id);
          processedCount++;
        } catch (err: any) {
          console.error('Error processing email:', err);
          await logger.logWarning('Email processing failed', { error: err.message, uidl: email.uidl });
        }
      }

      // Update last UIDL
      if (emails.length > 0) {
        const lastUIDL = emails[emails.length - 1].uidl;
        await supabase
          .from('email_accounts')
          .update({ 
            last_pop3_uidl: lastUIDL,
            last_synced_at: new Date().toISOString() 
          })
          .eq('id', account_id);
      }

      await logger.logSuccess('POP3 sync completed', { 
        fetched: emails.length, 
        processed: processedCount 
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          emails_fetched: emails.length,
          emails_processed: processedCount 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } finally {
      syncLocks.delete(account_id);
    }

  } catch (error: any) {
    console.error('Error in POP3 sync function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function fetchEmailsFromPOP3(
  account: POP3Account, 
  logger: OperationLogger
): Promise<ParsedEmail[]> {
  const { pop3_host, pop3_port, pop3_use_ssl, pop3_username, pop3_password, last_pop3_uidl } = account;

  console.log(`Connecting to POP3: ${pop3_host}:${pop3_port} (SSL: ${pop3_use_ssl})`);
  
  await logger.logSuccess('Connecting to POP3 server', { 
    host: pop3_host, 
    port: pop3_port, 
    ssl: pop3_use_ssl 
  });

  let conn: Deno.TcpConn | Deno.TlsConn;
  
  try {
    if (pop3_use_ssl) {
      conn = await Deno.connectTls({ hostname: pop3_host, port: pop3_port });
    } else {
      conn = await Deno.connect({ hostname: pop3_host, port: pop3_port });
    }
  } catch (err: any) {
    await logger.logError('POP3 connection failed', ERROR_CODES.CONNECTION_FAILED, err.message);
    throw new Error(`POP3_CONNECTION_FAILED: ${err.message}`);
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const buffer = new Uint8Array(4096);

  // Read greeting
  const greetingBytes = await conn.read(buffer);
  if (!greetingBytes) {
    await conn.close();
    await logger.logError('Failed to read POP3 greeting', ERROR_CODES.CONNECTION_FAILED);
    throw new Error('POP3_CONNECTION_FAILED: No greeting received');
  }
  await logger.logSuccess('Connected to POP3 server');

  // Authenticate
  await conn.write(encoder.encode(`USER ${pop3_username}\r\n`));
  const userBytes = await conn.read(buffer);
  if (!userBytes) {
    await conn.close();
    await logger.logError('Connection closed after USER command', ERROR_CODES.CONNECTION_FAILED);
    throw new Error('POP3_CONNECTION_FAILED: Connection closed unexpectedly');
  }
  
  await conn.write(encoder.encode(`PASS ${pop3_password}\r\n`));
  const passResponse = await conn.read(buffer);
  if (!passResponse) {
    await conn.close();
    await logger.logError('Connection closed after PASS command', ERROR_CODES.CONNECTION_FAILED);
    throw new Error('POP3_CONNECTION_FAILED: Connection closed unexpectedly');
  }
  const passResult = decoder.decode(buffer.subarray(0, passResponse)).trim();
  
  if (!passResult.startsWith('+OK')) {
    await conn.close();
    await logger.logError('POP3 authentication failed', ERROR_CODES.AUTH_FAILED, passResult);
    throw new Error(`POP3_AUTH_FAILED: ${passResult}`);
  }

  await logger.logSuccess('POP3 authentication successful');

  // Get message list with UIDLs
  await conn.write(encoder.encode('UIDL\r\n'));
  let uidlData = '';
  while (true) {
    const n = await conn.read(buffer);
    if (!n || n === 0) break;
    const chunk = decoder.decode(buffer.subarray(0, n));
    uidlData += chunk;
    if (uidlData.includes('\r\n.\r\n')) break;
  }

  const uidlLines = uidlData.split('\r\n').filter(line => line && !line.startsWith('+OK') && line !== '.');
  const messageMap = new Map<number, string>();
  
  for (const line of uidlLines) {
    const [msgNum, uidl] = line.trim().split(/\s+/);
    if (msgNum && uidl) {
      messageMap.set(parseInt(msgNum), uidl);
    }
  }

  await logger.logSuccess('Retrieved message UIDLs', { count: messageMap.size });

  // Filter for new messages
  const newMessages: Array<[number, string]> = [];
  for (const [msgNum, uidl] of messageMap.entries()) {
    if (!last_pop3_uidl || uidl > last_pop3_uidl) {
      newMessages.push([msgNum, uidl]);
    }
  }

  console.log(`Found ${newMessages.length} new messages`);
  await logger.logSuccess('Identified new messages', { count: newMessages.length });

  const emails: ParsedEmail[] = [];

  for (const [msgNum, uidl] of newMessages) {
    try {
      // Retrieve message
      await conn.write(encoder.encode(`RETR ${msgNum}\r\n`));
      let emailData = '';
      while (true) {
        const n = await conn.read(buffer);
        if (!n || n === 0) break;
        const chunk = decoder.decode(buffer.subarray(0, n));
        emailData += chunk;
        if (emailData.includes('\r\n.\r\n')) break;
      }

      // Remove POP3 response markers
      emailData = emailData.replace(/^\+OK[^\r\n]*\r\n/, '').replace(/\r\n\.\r\n$/, '');

      // Parse email
      const parser = new PostalMime();
      const parsed = await parser.parse(emailData);

      emails.push({
        messageId: parsed.messageId || `pop3-${uidl}`,
        from: parsed.from?.address || 'unknown@unknown.com',
        to: parsed.to?.map((t: any) => t.address) || [],
        subject: parsed.subject || '(No Subject)',
        text: parsed.text || '',
        html: parsed.html || '',
        date: parsed.date ? new Date(parsed.date) : new Date(),
        inReplyTo: parsed.inReplyTo || null,
        references: parsed.references || [],
        attachments: parsed.attachments || [],
        uidl,
      });

      // Optionally delete message
      if (account.delete_after_sync) {
        await conn.write(encoder.encode(`DELE ${msgNum}\r\n`));
        const deleBytes = await conn.read(buffer);
        if (!deleBytes) {
          console.warn(`Connection closed while deleting message ${msgNum}`);
        }
      }

    } catch (err: any) {
      console.error(`Error retrieving message ${msgNum}:`, err);
      await logger.logWarning('Message retrieval failed', { msgNum, error: err.message });
    }
  }

  // Quit
  await conn.write(encoder.encode('QUIT\r\n'));
  await conn.close();

  return emails;
}

async function processIncomingEmail(
  supabase: any, 
  email: ParsedEmail, 
  accountEmail: string,
  businessId: string,
  accountId: string
) {
  console.log(`Processing email from ${email.from}: ${email.subject}`);

  // Check for duplicates
  const { data: existing } = await supabase
    .from('messages')
    .select('id')
    .eq('external_message_id', email.messageId)
    .maybeSingle();

  if (existing) {
    console.log('Duplicate email, skipping');
    return;
  }

  // Find or create customer
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id')
    .eq('email', email.from)
    .eq('business_id', businessId)
    .maybeSingle();

  let customerId = customer?.id;

  if (!customerId) {
    const nameParts = email.from.split('@')[0].split(/[._-]/);
    const name = nameParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');

    const { data: newCustomer } = await supabase
      .from('customers')
      .insert({
        business_id: businessId,
        email: email.from,
        name,
        phone: email.from,
      })
      .select('id')
      .single();

    customerId = newCustomer?.id;
  }

  if (!customerId) {
    throw new Error('Failed to create customer');
  }

  // Find or create conversation
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .eq('status', 'active')
    .maybeSingle();

  let conversationId = conversation?.id;

  if (!conversationId) {
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({
        customer_id: customerId,
        business_id: businessId,
        status: 'active',
      })
      .select('id')
      .single();

    conversationId = newConv?.id;
  }

  // Insert message
  const messageContent = email.text || email.html?.replace(/<[^>]*>/g, '') || '';
  
  const { data: message, error: messageError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      customer_id: customerId,
      business_id: businessId,
      content: messageContent.substring(0, 5000),
      direction: 'inbound',
      status: 'delivered',
      channel: 'email',
      platform: 'email',
      external_message_id: email.messageId,
      created_at: email.date.toISOString(),
    })
    .select('id')
    .single();

  if (messageError) {
    console.error('Failed to insert message:', messageError);
    throw messageError;
  }

  // Handle attachments
  if (email.attachments && email.attachments.length > 0) {
    for (const attachment of email.attachments) {
      try {
        const fileName = `${Date.now()}-${attachment.filename || 'attachment'}`;
        const filePath = `${businessId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('customer_media')
          .upload(filePath, attachment.content, {
            contentType: attachment.mimeType || 'application/octet-stream',
          });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('customer_media')
            .getPublicUrl(filePath);

          await supabase.from('message_attachments').insert({
            message_id: message.id,
            filename: attachment.filename || 'attachment',
            url: urlData.publicUrl,
            type: attachment.mimeType || 'application/octet-stream',
            size: attachment.content?.length || 0,
          });
        }
      } catch (err: any) {
        console.error('Attachment upload failed:', err);
      }
    }
  }

  console.log('Email processed successfully');
}
