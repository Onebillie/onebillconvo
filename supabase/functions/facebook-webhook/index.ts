import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle GET request for webhook verification
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      console.log('Facebook webhook verification:', { mode, token, challenge });

      if (mode === 'subscribe') {
        // Verify token against stored tokens in database
        const { data: accounts } = await supabase
          .from('facebook_accounts')
          .select('verify_token')
          .eq('is_active', true);

        const isValid = accounts?.some(acc => acc.verify_token === token);

        if (isValid) {
          console.log('Webhook verified successfully');
          return new Response(challenge, { headers: { 'Content-Type': 'text/plain' } });
        }
      }

      console.error('Webhook verification failed');
      return new Response('Forbidden', { status: 403 });
    }

    // Handle POST request for incoming messages
    const body = await req.json();
    console.log('Facebook webhook received:', JSON.stringify(body, null, 2));

    // Process webhook entries
    if (body.object === 'page') {
      for (const entry of body.entry) {
        const pageId = entry.id;

        // Get the Facebook account for this page
        const { data: account } = await supabase
          .from('facebook_accounts')
          .select('*')
          .eq('page_id', pageId)
          .eq('is_active', true)
          .single();

        if (!account) {
          console.log(`No active Facebook account found for page ${pageId}`);
          continue;
        }

        // Process messaging events
        if (entry.messaging) {
          for (const event of entry.messaging) {
            await processMessagingEvent(supabase, account, event);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Facebook webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processMessagingEvent(supabase: any, account: any, event: any) {
  console.log('Processing messaging event:', event);

  const senderId = event.sender.id;
  const recipientId = event.recipient.id;
  
  // Skip messages sent by the page itself
  if (senderId === recipientId) {
    console.log('Skipping message sent by page');
    return;
  }

  // Handle message
  if (event.message) {
    const messageText = event.message.text || '';
    const messageId = event.message.mid;
    const attachments = event.message.attachments || [];

    // Get or create customer
    const { data: customer } = await getOrCreateCustomer(supabase, account.business_id, senderId, event.sender);

    if (!customer) {
      console.error('Failed to get or create customer');
      return;
    }

    // Get or create conversation
    const { data: conversation } = await getOrCreateConversation(supabase, customer.id, account.business_id);

    if (!conversation) {
      console.error('Failed to get or create conversation');
      return;
    }

    // Store message
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        customer_id: customer.id,
        content: messageText,
        direction: 'inbound',
        platform: 'facebook',
        is_read: false,
        external_message_id: messageId,
        metadata: { attachments, sender: event.sender },
      });

    if (messageError) {
      console.error('Error storing message:', messageError);
    } else {
      console.log('Message stored successfully');
    }

    // Handle attachments
    if (attachments.length > 0) {
      for (const attachment of attachments) {
        await storeAttachment(supabase, conversation.id, customer.id, attachment);
      }
    }
  }

  // Handle message reads
  if (event.read) {
    console.log('Message read event:', event.read);
    // Update message read status if needed
  }

  // Handle delivery receipts
  if (event.delivery) {
    console.log('Message delivery event:', event.delivery);
    // Update message delivery status if needed
  }
}

async function getOrCreateCustomer(supabase: any, businessId: string, psid: string, senderInfo: any) {
  // Try to find existing customer by PSID
  let { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('facebook_psid', psid)
    .eq('business_id', businessId)
    .single();

  if (!customer) {
    // Fetch user info from Facebook Graph API if available
    let userName = `Facebook User ${psid.substring(0, 8)}`;
    
    // Create new customer
    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert({
        business_id: businessId,
        facebook_psid: psid,
        name: userName,
        last_contact_method: 'facebook',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating customer:', error);
      return { data: null };
    }

    customer = newCustomer;
    console.log('Created new customer:', customer.id);
  } else {
    // Update last contact method
    await supabase
      .from('customers')
      .update({ last_contact_method: 'facebook' })
      .eq('id', customer.id);
  }

  return { data: customer };
}

async function getOrCreateConversation(supabase: any, customerId: string, businessId: string) {
  // Try to find existing active conversation
  let { data: conversation } = await supabase
    .from('conversations')
    .select('*')
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!conversation) {
    // Create new conversation
    const { data: newConversation, error } = await supabase
      .from('conversations')
      .insert({
        customer_id: customerId,
        business_id: businessId,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return { data: null };
    }

    conversation = newConversation;
    console.log('Created new conversation:', conversation.id);
  }

  return { data: conversation };
}

async function storeAttachment(supabase: any, conversationId: string, customerId: string, attachment: any) {
  try {
    const messageData: any = {
      conversation_id: conversationId,
      customer_id: customerId,
      content: `[${attachment.type}]`,
      direction: 'inbound',
      platform: 'facebook',
      is_read: false,
      metadata: { attachment },
    };

    // If it's an image, video, or file with a URL
    if (attachment.payload?.url) {
      const { error: attachmentError } = await supabase
        .from('messages')
        .insert(messageData);

      if (attachmentError) {
        console.error('Error storing attachment message:', attachmentError);
      }
    }
  } catch (error) {
    console.error('Error processing attachment:', error);
  }
}
