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
              // Handle status updates
              if (change.value.statuses) {
                await processStatusUpdates(change.value.statuses, supabase);
              }
              // Handle incoming messages
              if (change.value.messages) {
                await processMessages(change.value, supabase, accountId || undefined);
              }
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

async function processStatusUpdates(statuses: any[], supabase: any) {
  for (const status of statuses) {
    try {
      const { id: messageId, status: messageStatus, recipient_id } = status;
      
      let newStatus = 'sent';
      if (messageStatus === 'delivered') {
        newStatus = 'delivered';
      } else if (messageStatus === 'read') {
        newStatus = 'read';
      } else if (messageStatus === 'failed') {
        newStatus = 'failed';
      }

      // Update message status - SAFEGUARD: Only update delivery fields, never content
      const updatePayload: any = { 
        status: newStatus,
        is_read: messageStatus === 'read' ? true : undefined
      };
      
      // Explicit guard: prevent accidental content overwrites from webhook
      const forbiddenFields = ['content', 'template_content', 'template_name', 'template_variables'];
      forbiddenFields.forEach(f => delete updatePayload[f]);
      
      const { data: updatedMessages, error } = await supabase
        .from('messages')
        .update(updatePayload)
        .eq('external_message_id', messageId)
        .eq('platform', 'whatsapp')
        .select('id');

      if (error) {
        console.error('Error updating message status:', error);
      } else if (updatedMessages && updatedMessages.length > 0) {
        console.log(`WhatsApp message ${messageId} status updated to ${newStatus}`);
      } else {
        // Backfill: No message found for this status update, create a placeholder
        console.log(`No message found for external_message_id ${messageId}, creating placeholder`);
        
        if (recipient_id) {
          const normalizedPhone = recipient_id.replace(/^\+/, '').replace(/^00/, '');
          
          // Find customer and their latest active conversation
          const { data: customer } = await supabase
            .from('customers')
            .select('id, business_id')
            .eq('phone', normalizedPhone)
            .maybeSingle();
          
          if (customer) {
            const { data: conversation } = await supabase
              .from('conversations')
              .select('id')
              .eq('customer_id', customer.id)
              .eq('status', 'active')
              .order('updated_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            if (conversation) {
              // Create minimal outbound message placeholder
          await supabase
            .from('messages')
            .insert({
              conversation_id: conversation.id,
              customer_id: customer.id,
              content: '[Message sent from WhatsApp Business app or Meta Business Suite - content not captured by OneBillChat]',
              direction: 'outbound',
              platform: 'whatsapp',
              external_message_id: messageId,
              status: newStatus,
              is_read: messageStatus === 'read' ? true : false,
              business_id: customer.business_id
            });
              
              console.log(`Created placeholder message for status update ${messageId}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing status update:', error);
    }
  }
}

async function processMessages(messageData: any, supabase: any, accountId?: string) {
  const { messages, contacts } = messageData;

  if (!messages) return;

  // Determine which WhatsApp account to use and get business_id
  let whatsappAccountId = accountId;
  let businessId = null;
  
  // If no account_id provided, try to find default account (deterministic)
  if (!whatsappAccountId) {
    const { data: defaultAccount } = await supabase
      .from('whatsapp_accounts')
      .select('id, business_id, created_at')
      .eq('is_default', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    whatsappAccountId = defaultAccount?.id;
    businessId = defaultAccount?.business_id;
    console.log(`Using default WhatsApp account for webhook: ${whatsappAccountId}`);
  } else {
    // Get business_id for the specified account
    const { data: account } = await supabase
      .from('whatsapp_accounts')
      .select('business_id')
      .eq('id', whatsappAccountId)
      .single();
    
    businessId = account?.business_id;
  }

  // If no business_id found, use first available business
  if (!businessId) {
    const { data: firstBusiness } = await supabase
      .from('businesses')
      .select('id')
      .limit(1)
      .single();
    
    businessId = firstBusiness?.id;
  }

  if (!businessId) {
    console.error('No business_id found - cannot process messages');
    return;
  }

  for (const message of messages) {
    try {
      const contact = contacts?.find((c: any) => c.wa_id === message.from);
      const whatsappName = contact?.profile?.name || message.from;
      
      // Normalize phone number (remove + and leading 00)
      const normalizedPhone = message.from.replace(/^\+/, '').replace(/^00/, '');

      // Check if customer exists
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', normalizedPhone)
        .maybeSingle();

      let customer;
      if (existingCustomer) {
        // Build update object
        const updateData: any = {
          whatsapp_name: whatsappName,
          last_active: new Date().toISOString(),
        };
        
        // Auto-populate name fields if they're empty or look like placeholder numbers
        const nameIsEmpty = !existingCustomer.name || existingCustomer.name.trim() === '' || /^\d+$/.test(existingCustomer.name);
        const firstNameIsEmpty = !existingCustomer.first_name || existingCustomer.first_name.trim() === '';
        const lastNameIsEmpty = !existingCustomer.last_name || existingCustomer.last_name.trim() === '';
        
        if (nameIsEmpty && whatsappName) {
          updateData.name = whatsappName;
        }
        if (firstNameIsEmpty && whatsappName) {
          updateData.first_name = whatsappName.split(' ')[0] || whatsappName;
        }
        if (lastNameIsEmpty && whatsappName) {
          const lastNameParts = whatsappName.split(' ').slice(1).join(' ');
          updateData.last_name = lastNameParts || null;
        }
        
        // Fill whatsapp_phone if empty
        if (!existingCustomer.whatsapp_phone) {
          updateData.whatsapp_phone = normalizedPhone;
        }
        
        const { data: updatedCustomer, error: updateError } = await supabase
          .from('customers')
          .update(updateData)
          .eq('phone', normalizedPhone)
          .select()
          .single();
        
        if (updateError) {
          console.error('Error updating customer:', updateError);
          customer = existingCustomer;
        } else {
          customer = updatedCustomer;
        }
      } else {
        // Create new customer with WhatsApp name
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            phone: normalizedPhone,
            whatsapp_phone: normalizedPhone,
            name: whatsappName,
            first_name: whatsappName.split(' ')[0] || whatsappName,
            last_name: whatsappName.split(' ').slice(1).join(' ') || null,
            whatsapp_name: whatsappName,
            last_active: new Date().toISOString(),
            business_id: businessId,
          })
          .select()
          .single();
        
        if (customerError) {
          console.error('Error creating customer:', customerError);
          continue;
        }
        customer = newCustomer;
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
            business_id: businessId,
          })
          .select()
          .single();

        if (newConversationError) {
          console.error('Error creating conversation:', newConversationError);
          continue;
        }
        conversation = newConversation;
      }

      // Handle reactions
      if (message.type === 'reaction') {
        console.log('Processing reaction:', message.reaction);
        
        // Find the original message by external_message_id
        const { data: originalMessage } = await supabase
          .from('messages')
          .select('id')
          .eq('external_message_id', message.reaction.message_id)
          .maybeSingle();
        
        if (originalMessage) {
          // Insert or update reaction
          const { error: reactionError } = await supabase
            .from('message_reactions')
            .upsert({
              message_id: originalMessage.id,
              emoji: message.reaction.emoji,
              user_id: null, // Customer reaction
            }, {
              onConflict: 'message_id,user_id'
            });
          
          if (reactionError) {
            console.error('Error creating reaction:', reactionError);
          } else {
            console.log('Reaction processed successfully');
          }
        }
        continue; // Don't create a message for reactions
      }

      // Determine replied_to_message_id if this is a reply
      let repliedToMessageId = null;
      if (message.context?.id) {
        const { data: repliedMessage } = await supabase
          .from('messages')
          .select('id')
          .eq('external_message_id', message.context.id)
          .maybeSingle();
        
        if (repliedMessage) {
          repliedToMessageId = repliedMessage.id;
        }
      }

      // Create message
      let messageContent = '';
      let metadata = null;
      
      if (message.type === 'text') {
        messageContent = message.text.body;
      } else if (message.type === 'button') {
        // WhatsApp Interactive Button Response
        const buttonText = message.button?.text || 'Unknown';
        const buttonPayload = message.button?.payload || '';
        messageContent = `${buttonText}`;
        
        // Store button payload in message metadata
        metadata = {
          button_clicked: true,
          button_text: buttonText,
          button_payload: buttonPayload
        };
        
        console.log(`Button clicked: ${buttonText} (payload: ${buttonPayload})`);
      } else if (message.type === 'image') {
        messageContent = message.image.caption || 'Image received';
      } else if (message.type === 'document') {
        messageContent = `Document: ${message.document.filename || 'Unknown'}`;
      } else if (message.type === 'video') {
        messageContent = message.video.caption || 'Video received';
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
          replied_to_message_id: repliedToMessageId,
          business_id: businessId,
          metadata: metadata,
        })
        .select()
        .single();

      if (messageError) {
        console.error('Error creating message:', messageError);
        continue;
      }

      console.log('Message processed successfully:', newMessage.id);

      // Handle attachments - create instant proxy URL then process in background
      if (message.type === 'image' || message.type === 'document' || message.type === 'video' || message.type === 'audio' || message.type === 'voice') {
        handleAttachmentInstant(message, newMessage.id, customer.id, supabase, whatsappAccountId)
          .catch(err => console.error('Attachment processing error:', err));
      }

      // Queue notification for business users (non-blocking)
      try {
        const { data: business } = await supabase
          .from('businesses')
          .select('owner_id')
          .eq('id', businessId)
          .single();

        if (business?.owner_id) {
          const customerName = customer.name || customer.whatsapp_name || 'Unknown';
          const preview = messageContent.length > 50 
            ? messageContent.substring(0, 50) + '...' 
            : messageContent;
          
          await supabase.functions.invoke('queue-notification', {
            body: {
              userId: business.owner_id,
              businessId: businessId,
              notificationType: 'message',
              channel: 'whatsapp',
              priority: 'immediate',
              title: `New WhatsApp from ${customerName}`,
              message: preview,
              link: `/app/dashboard?conversation=${conversation.id}`
            }
          });
        }
      } catch (notifError) {
        console.error('Notification error:', notifError);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  }
}

async function handleAttachmentInstant(message: any, messageId: string, customerId: string, supabase: any, whatsappAccountId?: string) {
  const startTime = Date.now();
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

    if (!mediaId) {
      console.error('No media ID found for attachment');
      return;
    }

    console.log(`[Attachment] Processing: ${filename} (${mimeType}), mediaId: ${mediaId}`);

    // Get access token (prefer account-specific, fallback to env)
    let accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    
    if (whatsappAccountId) {
      const { data: account } = await supabase
        .from('whatsapp_accounts')
        .select('access_token')
        .eq('id', whatsappAccountId)
        .single();
      
      if (account?.access_token) {
        accessToken = account.access_token;
      }
    }

    // Fetch media metadata first to get file size
    const metadataStart = Date.now();
    const mediaResponse = await fetch(
      `https://graph.facebook.com/v18.0/${mediaId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!mediaResponse.ok) {
      console.error('[Attachment] Failed to get media metadata');
      return;
    }

    const mediaData = await mediaResponse.json();
    const mediaUrl = mediaData.url;
    const fileSize = mediaData.file_size || 0;
    console.log(`[Attachment] Got metadata in ${Date.now() - metadataStart}ms, size: ${fileSize} bytes`);

    // INSTANT: Create proxy URL immediately for realtime display (WITH SIZE)
    const proxyUrl = `https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/whatsapp-media-proxy?mediaId=${mediaId}${whatsappAccountId ? `&accountId=${whatsappAccountId}` : ''}`;
    
    const { data: instantAttachment, error: instantError } = await supabase
      .from('message_attachments')
      .insert({
        message_id: messageId,
        filename,
        url: proxyUrl,
        type: mimeType,
        size: fileSize,
        duration_seconds: duration || null,
      })
      .select()
      .single();

    if (instantError) {
      console.error('[Attachment] Error creating instant attachment:', instantError);
      return;
    }

    console.log(`[Attachment] Created instant attachment with proxy URL in ${Date.now() - startTime}ms`);

    // BACKGROUND: Download and upload to permanent storage with retry
    const attachmentId = instantAttachment.id;
    const maxRetries = 3;
    const retryDelays = [2000, 5000, 10000]; // Exponential backoff: 2s, 5s, 10s
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const downloadStart = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const fileResponse = await fetch(mediaUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!fileResponse.ok) {
          throw new Error(`HTTP ${fileResponse.status}: ${fileResponse.statusText}`);
        }

        const fileBuffer = await fileResponse.arrayBuffer();
        const file = new Uint8Array(fileBuffer);
        console.log(`[Attachment] Downloaded ${file.length} bytes in ${Date.now() - downloadStart}ms (attempt ${attempt + 1})`);

        // Upload to Supabase Storage
        const uploadStart = Date.now();
        const filePath = `customers/${customerId}/media/${Date.now()}_${filename}`;
        const { error: uploadError } = await supabase.storage
          .from('customer_bills')
          .upload(filePath, file, {
            contentType: mimeType,
            upsert: false,
          });

        if (uploadError) {
          console.error('[Attachment] Error uploading to storage:', uploadError);
          return;
        }

        console.log(`[Attachment] Uploaded to storage in ${Date.now() - uploadStart}ms`);

        // Get permanent public URL
        const { data: publicUrlData } = supabase.storage
          .from('customer_bills')
          .getPublicUrl(filePath);

        const publicUrl = publicUrlData?.publicUrl;

        // UPDATE: Replace proxy URL with permanent Storage URL (triggers realtime update)
        const { error: updateError } = await supabase
          .from('message_attachments')
          .update({
            url: publicUrl,
            size: file.length,
          })
          .eq('id', attachmentId);

        if (updateError) {
          console.error('[Attachment] Error updating with permanent URL:', updateError);
        } else {
          const totalTime = Date.now() - startTime;
          console.log(`[Attachment] ✓ Fully processed: ${filename} (${file.length} bytes) in ${totalTime}ms`);
        }
        
        // Success - break retry loop
        break;
        
      } catch (fetchError: any) {
        const isLastAttempt = attempt === maxRetries - 1;
        
        if (fetchError.name === 'AbortError') {
          console.error(`[Attachment] Download timeout (attempt ${attempt + 1}/${maxRetries})`);
        } else {
          console.error(`[Attachment] Download error (attempt ${attempt + 1}/${maxRetries}):`, fetchError.message);
        }
        
        if (!isLastAttempt) {
          const delay = retryDelays[attempt];
          console.log(`[Attachment] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error(`[Attachment] Failed after ${maxRetries} attempts`);
        }
      }
    }
  } catch (error) {
    console.error('[Attachment] Unexpected error:', error);
  }
}
