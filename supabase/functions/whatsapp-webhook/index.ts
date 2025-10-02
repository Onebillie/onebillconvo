import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const url = new URL(req.url);
    const accountId = url.searchParams.get('account_id');

    if (req.method === 'GET') {
      // Webhook verification
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      let verifyToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN');

      // If account_id is provided, fetch account-specific verify token
      if (accountId) {
        const { data: account } = await supabase
          .from('whatsapp_accounts')
          .select('verify_token')
          .eq('id', accountId)
          .eq('is_active', true)
          .single();
        
        if (account) {
          verifyToken = account.verify_token;
        }
      }

      if (mode === 'subscribe' && token === verifyToken) {
        console.log('Webhook verified successfully');
        return new Response(challenge, { status: 200 });
      } else {
        console.error('Webhook verification failed');
        return new Response('Verification failed', { status: 403 });
      }
    }

    if (req.method === 'POST') {
      const body = await req.json();
      console.log('Webhook received:', JSON.stringify(body, null, 2));

      // Process WhatsApp webhook
      if (body.object === 'whatsapp_business_account') {
        for (const entry of body.entry) {
          for (const change of entry.changes) {
            if (change.field === 'messages') {
              await processMessages(change.value, supabase, accountId || undefined);
            }
          }
        }
      }

      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal server error', { status: 500, headers: corsHeaders });
  }
});

async function processMessages(messageData: any, supabase: any, accountId?: string) {
  const { messages, contacts } = messageData;

  if (!messages) return;

  // Determine which WhatsApp account to use
  let whatsappAccountId = accountId;
  
  // If no account_id provided, try to find default account
  if (!whatsappAccountId) {
    const { data: defaultAccount } = await supabase
      .from('whatsapp_accounts')
      .select('id')
      .eq('is_default', true)
      .eq('is_active', true)
      .single();
    
    whatsappAccountId = defaultAccount?.id;
  }

  for (const message of messages) {
    try {
      const contact = contacts?.find((c: any) => c.wa_id === message.from);
      const customerName = contact?.profile?.name || message.from;
      
      // Normalize phone number (remove + and leading 00)
      const normalizedPhone = message.from.replace(/^\+/, '').replace(/^00/, '');

      // Create or get customer
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .upsert({
          phone: normalizedPhone,
          name: customerName,
          last_active: new Date().toISOString(),
        }, {
          onConflict: 'phone',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (customerError) {
        console.error('Error creating/updating customer:', customerError);
        continue;
      }

      // Create or get conversation (reuse latest active if exists)
      let { data: conversation, error: conversationSelectError } = await supabase
        .from('conversations')
        .select('*')
        .eq('customer_id', customer.id)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (conversationSelectError) {
        console.error('Error selecting conversation:', conversationSelectError);
      }

      if (!conversation) {
        const { data: newConversation, error: newConversationError } = await supabase
          .from('conversations')
          .insert({
            customer_id: customer.id,
            status: 'active',
            whatsapp_account_id: whatsappAccountId,
          })
          .select()
          .single();

        if (newConversationError) {
          console.error('Error creating conversation:', newConversationError);
          continue;
        }
        conversation = newConversation;
      }

      // Create message
      let messageContent = '';
      if (message.type === 'text') {
        messageContent = message.text.body;
      } else if (message.type === 'image') {
        messageContent = 'Image received';
      } else if (message.type === 'document') {
        messageContent = `Document: ${message.document.filename || 'Unknown'}`;
      } else if (message.type === 'video') {
        messageContent = 'Video received';
      } else if (message.type === 'audio' || message.type === 'voice') {
        messageContent = 'Voice note received';
      } else {
        messageContent = `${message.type} message received`;
      }

      const { data: newMessage, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          customer_id: customer.id,
          content: messageContent,
          direction: 'inbound',
          platform: 'whatsapp',
          external_message_id: message.id,
          thread_id: conversation.id,
          is_read: false,
        })
        .select()
        .single();

      if (messageError) {
        console.error('Error creating message:', messageError);
        continue;
      }

      // Handle attachments
      if (message.type === 'image' || message.type === 'document' || message.type === 'video' || message.type === 'audio' || message.type === 'voice') {
        await handleAttachment(message, newMessage.id, supabase, whatsappAccountId);
      }

      console.log('Message processed successfully:', newMessage.id);

      // Send push notification to all active users
      try {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
          },
          body: JSON.stringify({
            payload: {
              title: 'New WhatsApp Message',
              body: `${customerName}: ${messageContent}`,
              icon: '/favicon.ico',
              tag: `whatsapp-${conversation.id}`,
              data: {
                url: '/dashboard',
                conversationId: conversation.id
              }
            }
          })
        });
      } catch (pushError) {
        console.error('Error sending push notification:', pushError);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  }
}

async function handleAttachment(message: any, messageId: string, supabase: any, whatsappAccountId?: string) {
  try {
    let mediaId, filename, mimeType, duration;
    
    if (message.type === 'image') {
      mediaId = message.image.id;
      filename = `image_${Date.now()}.jpg`;
      mimeType = message.image.mime_type || 'image/jpeg';
    } else if (message.type === 'document') {
      mediaId = message.document.id;
      filename = message.document.filename || `document_${Date.now()}`;
      mimeType = message.document.mime_type || 'application/octet-stream';
    } else if (message.type === 'video') {
      mediaId = message.video.id;
      filename = `video_${Date.now()}.mp4`;
      mimeType = message.video.mime_type || 'video/mp4';
    } else if (message.type === 'audio' || message.type === 'voice') {
      const audioData = message.audio || message.voice;
      mediaId = audioData.id;
      filename = `audio_${Date.now()}.${message.type === 'voice' ? 'ogg' : 'mp3'}`;
      mimeType = audioData.mime_type || 'audio/ogg';
      duration = Math.floor(audioData.duration || 0);
    }

    if (!mediaId) return;

    // Get access token (prefer account-specific, fallback to env)
    let accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    
    if (whatsappAccountId) {
      const { data: account } = await supabase
        .from('whatsapp_accounts')
        .select('access_token')
        .eq('id', whatsappAccountId)
        .single();
      
      if (account) {
        accessToken = account.access_token;
      }
    }

    // Get media URL from WhatsApp API
    const mediaResponse = await fetch(
      `https://graph.facebook.com/v18.0/${mediaId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!mediaResponse.ok) {
      console.error('Failed to get media URL');
      return;
    }

    const mediaData = await mediaResponse.json();
    const mediaUrl = mediaData.url;

    // Download media file
    const fileResponse = await fetch(mediaUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!fileResponse.ok) {
      console.error('Failed to download media file');
      return;
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const file = new Uint8Array(fileBuffer);

    // Upload to Supabase Storage
    const filePath = `whatsapp/${Date.now()}_${filename}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('customer_bills')
      .upload(filePath, file, {
        contentType: mimeType,
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return;
    }

    // Create attachment record with public URL
    const { data: publicUrlData } = supabase.storage
      .from('customer_bills')
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData?.publicUrl || null;

    const { error: attachmentError } = await supabase
      .from('message_attachments')
      .insert({
        message_id: messageId,
        filename,
        url: publicUrl ?? filePath,
        type: mimeType,
        size: file.length,
        duration_seconds: duration || null,
      });

    if (attachmentError) {
      console.error('Error creating attachment record:', attachmentError);
    }

    console.log('Attachment processed successfully:', filename);
  } catch (error) {
    console.error('Error handling attachment:', error);
  }
}
