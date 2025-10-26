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

      console.log('Instagram webhook verification:', { mode, token, challenge });

      if (mode === 'subscribe' && token) {
        // For Instagram, we'll accept any verify token since it's stored per account
        // In production, you'd want to validate against a specific token
        console.log('Webhook verified successfully');
        return new Response(challenge, { headers: { 'Content-Type': 'text/plain' } });
      }

      console.error('Webhook verification failed');
      return new Response('Forbidden', { status: 403 });
    }

    // Handle POST request for incoming messages
    const body = await req.json();
    console.log('Instagram webhook received:', JSON.stringify(body, null, 2));

    // Process webhook entries
    if (body.object === 'instagram') {
      for (const entry of body.entry) {
        const instagramAccountId = entry.id;

        // Get the Instagram account
        const { data: account } = await supabase
          .from('instagram_accounts')
          .select('*')
          .eq('instagram_account_id', instagramAccountId)
          .eq('is_active', true)
          .single();

        if (!account) {
          console.log(`No active Instagram account found for ${instagramAccountId}`);
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
    console.error('Instagram webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processMessagingEvent(supabase: any, account: any, event: any) {
  console.log('Processing Instagram messaging event:', event);

  const senderId = event.sender.id;
  const recipientId = event.recipient.id;
  
  // Skip messages sent by the account itself
  if (senderId === recipientId) {
    console.log('Skipping message sent by account');
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
        platform: 'instagram',
        is_read: false,
        external_message_id: messageId,
        metadata: { attachments, sender: event.sender },
      });

    if (messageError) {
      console.error('Error storing message:', messageError);
    } else {
      console.log('Message stored successfully');
      
      // Queue notification for business users
      try {
        const { data: business } = await supabase
          .from('businesses')
          .select('owner_id')
          .eq('id', account.business_id)
          .single();

        if (business?.owner_id) {
          const preview = messageText.substring(0, 100) + (messageText.length > 100 ? '...' : '');
          await supabase.functions.invoke('queue-notification', {
            body: {
              userId: business.owner_id,
              businessId: account.business_id,
              notificationType: 'message',
              channel: 'instagram',
              priority: 'immediate',
              title: `New Instagram DM from ${customer.name}`,
              message: preview || 'Attachment received',
              link: `/app/dashboard?conversation=${conversation.id}`
            }
          });
        }
      } catch (notifError) {
        console.error('Notification error:', notifError);
      }
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
  }

  // Handle delivery receipts
  if (event.delivery) {
    console.log('Message delivery event:', event.delivery);
  }
}

async function getOrCreateCustomer(supabase: any, businessId: string, instagramId: string, senderInfo: any) {
  // Try to find existing customer by Instagram ID
  let { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('instagram_id', instagramId)
    .eq('business_id', businessId)
    .single();

  if (!customer) {
    // Create new customer
    let userName = `Instagram User ${instagramId.substring(0, 8)}`;
    
    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert({
        business_id: businessId,
        instagram_id: instagramId,
        name: userName,
        last_contact_method: 'instagram',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating customer:', error);
      return { data: null };
    }

    customer = newCustomer;
    console.log('Created new Instagram customer:', customer.id);
  } else {
    // Update last contact method
    await supabase
      .from('customers')
      .update({ last_contact_method: 'instagram' })
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
    console.log('Created new Instagram conversation:', conversation.id);
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
      platform: 'instagram',
      is_read: false,
      metadata: { attachment },
    };

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
