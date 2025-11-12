import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { logMessageEvent } from '../_shared/messageLogger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const requestId = `whatsapp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const { 
      to, 
      message, 
      attachments, 
      whatsapp_account_id, 
      conversation_id, 
      templateName, 
      templateLanguage, 
      templateVariables,
      message_id // NEW: Accept pre-created message ID from persist-first strategy
    } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get WhatsApp account credentials with deterministic selection
    let accessToken: string | null = null;
    let phoneNumberId: string | null = null;
    let whatsappAccountId: string | null = null;
    let businessId: string | null = null;

    // Priority 1: Get from conversation if conversation_id provided
    if (conversation_id) {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('whatsapp_account_id, business_id')
        .eq('id', conversation_id)
        .maybeSingle();

      if (conversation?.whatsapp_account_id) {
        const { data: account } = await supabase
          .from('whatsapp_accounts')
          .select('id, access_token, phone_number_id, is_active')
          .eq('id', conversation.whatsapp_account_id)
          .eq('is_active', true)
          .maybeSingle();

        if (account) {
          accessToken = account.access_token;
          phoneNumberId = account.phone_number_id;
          whatsappAccountId = account.id;
          businessId = conversation.business_id;
          console.log(`[${requestId}] Using WhatsApp account from conversation: ${whatsappAccountId}`);
        }
      }
    }

    // Priority 2: Use specified whatsapp_account_id
    if (!accessToken && whatsapp_account_id) {
      const { data: account } = await supabase
        .from('whatsapp_accounts')
        .select('id, access_token, phone_number_id, is_active, business_id')
        .eq('id', whatsapp_account_id)
        .eq('is_active', true)
        .maybeSingle();

      if (account) {
        accessToken = account.access_token;
        phoneNumberId = account.phone_number_id;
        whatsappAccountId = account.id;
        businessId = account.business_id;
        console.log(`[${requestId}] Using specified WhatsApp account: ${whatsappAccountId}`);
      }
    }

    // Priority 3: Fall back to default account (deterministic: most recently created)
    if (!accessToken || !phoneNumberId) {
      const { data: defaultAccount } = await supabase
        .from('whatsapp_accounts')
        .select('id, access_token, phone_number_id, is_active, business_id, created_at')
        .eq('is_default', true)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (defaultAccount) {
        accessToken = defaultAccount.access_token;
        phoneNumberId = defaultAccount.phone_number_id;
        whatsappAccountId = defaultAccount.id;
        businessId = businessId || defaultAccount.business_id;
        console.log(`[${requestId}] Using default WhatsApp account: ${whatsappAccountId}`);
      }
    }

    if (!accessToken || !phoneNumberId) {
      console.error(`[${requestId}] No WhatsApp credentials found. conversation_id: ${conversation_id}, whatsapp_account_id: ${whatsapp_account_id}, to: ${to}`);
      
      // Update pending message to failed if message_id provided
      if (message_id) {
        await supabase
          .from('messages')
          .update({ 
            status: 'failed', 
            delivery_status: 'failed',
            metadata: { last_error: 'No active WhatsApp account found' }
          })
          .eq('id', message_id);
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'No active WhatsApp account found',
          code: 'NO_WHATSAPP_ACCOUNT',
          title: 'WhatsApp Not Configured',
          details: 'Please configure a WhatsApp account in Settings > WA Accounts and ensure it is set as default.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Using WhatsApp account: ${whatsappAccountId}, to: ${to}, conversation_id: ${conversation_id || 'none'}, message_id: ${message_id || 'none'}, templateName: ${templateName || 'none'}`);

    if (!to) {
      if (message_id) {
        await supabase
          .from('messages')
          .update({ status: 'failed', delivery_status: 'failed', metadata: { last_error: 'Missing required field: to' } })
          .eq('id', message_id);
      }
      return new Response(
        JSON.stringify({ error: 'Missing required field: to' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!templateName && !message) {
      if (message_id) {
        await supabase
          .from('messages')
          .update({ status: 'failed', delivery_status: 'failed', metadata: { last_error: 'Missing required field: message or templateName' } })
          .eq('id', message_id);
      }
      return new Response(
        JSON.stringify({ error: 'Missing required field: message or templateName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean phone number (remove + and leading zeros)
    const cleanPhoneNumber = to.replace(/^\+/, '').replace(/^00/, '');

    // Check message limit (but don't increment yet - will do after success)
    const { data: customerForLimit } = await supabase
      .from('customers')
      .select('business_id')
      .eq('phone', cleanPhoneNumber)
      .maybeSingle();

    let businessIdForIncrement: string | null = businessId;

    if (customerForLimit) {
      businessIdForIncrement = customerForLimit.business_id;
      const { data: business } = await supabase
        .from('businesses')
        .select('subscription_tier, message_count_current_period, is_unlimited')
        .eq('id', customerForLimit.business_id)
        .single();

      if (business) {
        // Skip limit check for unlimited accounts
        if (!business.is_unlimited) {
          const limits: Record<string, number> = {
            free: 100,
            starter: 1000,
            professional: 10000,
            enterprise: 999999
          };
          const limit = limits[business.subscription_tier] || 0;

          const currentCount = business.message_count_current_period || 0;
          if (currentCount >= limit) {
            console.log(`[${requestId}] Message limit reached for business ${customerForLimit.business_id}: ${currentCount}/${limit}`);
            
            if (message_id) {
              await supabase
                .from('messages')
                .update({ 
                  status: 'failed', 
                  delivery_status: 'failed',
                  metadata: { last_error: `Message limit reached: ${currentCount}/${limit}` }
                })
                .eq('id', message_id);
            }
            
            return new Response(
              JSON.stringify({ 
                error: 'Message limit reached',
                code: 'LIMIT_REACHED',
                title: 'Message Limit Exceeded',
                details: `You've reached your ${limit} message limit. Upgrade your plan to continue sending.`
              }),
              { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }
    }

    let whatsappPayload: any;

    // Check if this is a template message
    if (templateName) {
      // Template message payload
      whatsappPayload = {
        messaging_product: 'whatsapp',
        to: cleanPhoneNumber,
        type: 'template',
        template: {
          name: templateName,
          language: { code: templateLanguage || 'en' }
        }
      };
      
      if (templateVariables !== undefined && templateVariables !== null && Array.isArray(templateVariables) && templateVariables.length > 0) {
        whatsappPayload.template.components = [
          {
            type: 'body',
            parameters: templateVariables.map((v: string) => ({
              type: 'text',
              text: v
            }))
          }
        ];
        console.log('Sending template:', templateName, 'with', templateVariables.length, 'variables');
      } else {
        console.log('Sending template:', templateName, 'without variables');
      }
    } else if (attachments && attachments.length > 0) {
      // Handle attachments
      const attachment = attachments[0];
      
      if (attachment.type.startsWith('image/')) {
        whatsappPayload = {
          messaging_product: 'whatsapp',
          to: cleanPhoneNumber,
          type: 'image',
          image: {
            link: attachment.url,
            caption: message
          }
        };
      } else if (attachment.type.startsWith('video/')) {
        whatsappPayload = {
          messaging_product: 'whatsapp',
          to: cleanPhoneNumber,
          type: 'video',
          video: {
            link: attachment.url,
            caption: message
          }
        };
      } else if (attachment.type.startsWith('audio/')) {
        whatsappPayload = {
          messaging_product: 'whatsapp',
          to: cleanPhoneNumber,
          type: 'audio',
          audio: {
            link: attachment.url
          }
        };
      } else if (attachment.type === 'application/pdf' || attachment.type.startsWith('application/')) {
        whatsappPayload = {
          messaging_product: 'whatsapp',
          to: cleanPhoneNumber,
          type: 'document',
          document: {
            link: attachment.url,
            caption: message,
            filename: attachment.filename
          }
        };
      } else {
        console.log(`[${requestId}] Unsupported attachment type: ${attachment.type}, sending as document`);
        whatsappPayload = {
          messaging_product: 'whatsapp',
          to: cleanPhoneNumber,
          type: 'document',
          document: {
            link: attachment.url,
            caption: message,
            filename: attachment.filename
          }
        };
      }
    } else {
      // Regular text message
      whatsappPayload = {
        messaging_product: 'whatsapp',
        to: cleanPhoneNumber,
        type: 'text',
        text: {
          body: message
        }
      };
    }

    // Send message to WhatsApp API
    const whatsappResponse = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(whatsappPayload),
      }
    );

    const responseData = await whatsappResponse.json();

    if (!whatsappResponse.ok) {
      const errorCode = responseData?.error?.code || 'UNKNOWN';
      const errorMessage = responseData?.error?.message || 'Unknown error';
      console.error(`[${requestId}] WhatsApp API error:`, {
        to: cleanPhoneNumber,
        accountId: whatsappAccountId,
        conversationId: conversation_id,
        errorCode,
        errorMessage,
        fullResponse: JSON.stringify(responseData)
      });
      console.error(`[${requestId}] Request payload:`, JSON.stringify(whatsappPayload, null, 2));
      
      // Update pending message to failed if message_id provided
      if (message_id) {
        await supabase
          .from('messages')
          .update({ 
            status: 'failed', 
            delivery_status: 'failed',
            metadata: { last_error: errorMessage, error_code: errorCode }
          })
          .eq('id', message_id);
      }
      
      return new Response(
        JSON.stringify({ 
          error: `Meta API Error: ${errorMessage}`,
          code: errorCode,
          title: 'WhatsApp Send Failed',
          details: responseData
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Increment message count only after successful send
    if (businessIdForIncrement) {
      console.log(`[${requestId}] Incrementing message count for business: ${businessIdForIncrement}`);
      await supabase.rpc('increment_message_count', { business_uuid: businessIdForIncrement });
    } else {
      console.log(`[${requestId}] No business_id found for message count increment`);
    }

    // PERSIST-FIRST STRATEGY: Update existing message OR insert new one
    if (message_id) {
      // The message already exists with correct content from persist-first creation
      // Only update delivery-related fields, do NOT overwrite content
      const { error: updateError } = await supabase
        .from('messages')
        .update({
          external_message_id: responseData.messages[0].id,
          delivery_status: 'sent',
          status: 'sent',
        })
        .eq('id', message_id);
      
      if (updateError) {
        console.error(`[${requestId}] Error updating pending message:`, updateError);
      } else {
        console.log(`[${requestId}] Updated pending message ${message_id} with WhatsApp message ID`);
        
        // Log events
        await logMessageEvent(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
          message_id,
          'sent',
          'success',
          'whatsapp',
          { message_id: responseData.messages[0].id }
        );
        
        // Handle attachments
        if (attachments && attachments.length > 0) {
          const attachment = attachments[0];
          await supabase
            .from('message_attachments')
            .insert({
              message_id: message_id,
              filename: attachment.filename,
              url: attachment.url,
              type: attachment.type,
              size: attachment.size || 0,
            });
        }
      }
    } else {
      // Legacy path: Create new message (backward compatibility)
      // Get template content if using a template
      let templateContent = message;
      if (templateName && businessId) {
        const { data: template } = await supabase
          .from('message_templates')
          .select('content')
          .eq('name', templateName)
          .eq('business_id', businessId)
          .maybeSingle();
        
        if (template?.content) {
          templateContent = template.content;
          
          // Replace variables in template
          if (templateVariables && Array.isArray(templateVariables)) {
            templateVariables.forEach((val: string, idx: number) => {
              templateContent = templateContent.replace(`{{${idx + 1}}}`, val);
            });
          }
        } else {
          // Fallback if template not found
          templateContent = message || `Template: ${templateName}`;
        }
      }
      
      let conversation = null;
      let customer = null;
      
      if (conversation_id) {
        const { data: convData } = await supabase
          .from('conversations')
          .select('id, customer_id, business_id, customers(id, business_id)')
          .eq('id', conversation_id)
          .single();
        
        if (convData) {
          conversation = convData;
          customer = convData.customers;
        }
      }
      
      if (!conversation) {
        const { data: customerData } = await supabase
          .from('customers')
          .select('id, business_id')
          .eq('phone', cleanPhoneNumber)
          .maybeSingle();

        if (customerData) {
          customer = customerData;
          
          let { data: convData } = await supabase
            .from('conversations')
            .select('*')
            .eq('customer_id', customer.id)
            .eq('status', 'active')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!convData) {
            const { data: newConv } = await supabase
              .from('conversations')
              .insert({ 
                customer_id: customer.id, 
                status: 'active',
                whatsapp_account_id: whatsappAccountId,
                business_id: customer.business_id
              })
              .select()
              .single();
            convData = newConv;
          }
          
          conversation = convData;
        }
      }

      if (conversation && customer) {
        const { data: outboundMsg, error: msgError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversation.id,
            customer_id: customer.id,
            content: templateContent,
            template_name: templateName,
            template_content: templateContent,
            template_variables: templateVariables ? { variables: templateVariables } : null,
            direction: 'outbound',
            platform: 'whatsapp',
            external_message_id: responseData.messages[0].id,
            delivery_status: 'sent',
            status: 'sent',
            thread_id: conversation.id,
            is_read: true,
            business_id: customer.business_id
          })
          .select()
          .single();

        if (outboundMsg) {
          await logMessageEvent(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
            outboundMsg.id,
            'created',
            'success',
            'whatsapp',
            { to: cleanPhoneNumber, template: templateName }
          );

          await logMessageEvent(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
            outboundMsg.id,
            'sent',
            'success',
            'whatsapp',
            { message_id: responseData.messages[0].id }
          );
        }

        if (msgError) {
          console.error(`[${requestId}] Error creating message record:`, msgError);
        } else if (attachments && attachments.length > 0 && outboundMsg) {
          const attachment = attachments[0];
          await supabase
            .from('message_attachments')
            .insert({
              message_id: outboundMsg.id,
              filename: attachment.filename,
              url: attachment.url,
              type: attachment.type,
              size: attachment.size || 0,
            });
        }

        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversation.id);
      }
    }

    return new Response(
      JSON.stringify({ success: true, messageId: responseData.messages[0].id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Send message error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
