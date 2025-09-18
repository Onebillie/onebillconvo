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
  const verifyToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN')!;
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    if (req.method === 'GET') {
      // Webhook verification
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

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
              await processMessages(change.value, supabase);
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

async function processMessages(messageData: any, supabase: any) {
  const { messages, contacts } = messageData;

  if (!messages) return;

  for (const message of messages) {
    try {
      const contact = contacts?.find((c: any) => c.wa_id === message.from);
      const customerName = contact?.profile?.name || message.from;

      // Create or get customer
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .upsert({
          phone: message.from,
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

      // Create or get conversation
      let { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .select('*')
        .eq('customer_id', customer.id)
        .eq('status', 'active')
        .single();

      if (conversationError || !conversation) {
        const { data: newConversation, error: newConversationError } = await supabase
          .from('conversations')
          .insert({
            customer_id: customer.id,
            status: 'active',
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
      if (message.type === 'image' || message.type === 'document') {
        await handleAttachment(message, newMessage.id, supabase);
      }

      console.log('Message processed successfully:', newMessage.id);
    } catch (error) {
      console.error('Error processing message:', error);
    }
  }
}

async function handleAttachment(message: any, messageId: string, supabase: any) {
  try {
    let mediaId, filename, mimeType;
    
    if (message.type === 'image') {
      mediaId = message.image.id;
      filename = `image_${Date.now()}.jpg`;
      mimeType = message.image.mime_type || 'image/jpeg';
    } else if (message.type === 'document') {
      mediaId = message.document.id;
      filename = message.document.filename || `document_${Date.now()}`;
      mimeType = message.document.mime_type || 'application/octet-stream';
    }

    if (!mediaId) return;

    // Get media URL from WhatsApp API
    const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
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

    // Create attachment record
    const { error: attachmentError } = await supabase
      .from('message_attachments')
      .insert({
        message_id: messageId,
        filename,
        url: filePath,
        type: mimeType,
        size: file.length,
      });

    if (attachmentError) {
      console.error('Error creating attachment record:', attachmentError);
    }

    console.log('Attachment processed successfully:', filename);
  } catch (error) {
    console.error('Error handling attachment:', error);
  }
}