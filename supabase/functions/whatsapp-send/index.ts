import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
    const { to, message, attachments, whatsapp_account_id, conversation_id, templateName, templateLanguage, templateVariables } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let accessToken: string | null = null;
    let phoneNumberId: string | null = null;
    let accountId = whatsapp_account_id;

    // If no account_id provided but conversation_id is, fetch from conversation
    if (!accountId && conversation_id) {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('whatsapp_account_id, business_id')
        .eq('id', conversation_id)
        .single();
      
      accountId = conversation?.whatsapp_account_id;
    }

    // If we have an account_id, fetch credentials from database
    if (accountId) {
      const { data: account, error: accountError } = await supabase
        .from('whatsapp_accounts')
        .select('access_token, phone_number_id, is_active')
        .eq('id', accountId)
        .eq('is_active', true)
        .single();

      if (account) {
        accessToken = account.access_token;
        phoneNumberId = account.phone_number_id;
        console.log('Using account-specific credentials for account:', accountId);
      }
    }

    // Fall back to default account if no specific account found
    if (!accessToken || !phoneNumberId) {
      const { data: defaultAccount } = await supabase
        .from('whatsapp_accounts')
        .select('access_token, phone_number_id, is_active, id')
        .eq('is_default', true)
        .eq('is_active', true)
        .single();

      if (defaultAccount) {
        accessToken = defaultAccount.access_token;
        phoneNumberId = defaultAccount.phone_number_id;
        accountId = defaultAccount.id;
        console.log('Using default WhatsApp account');
      }
    }

    if (!accessToken || !phoneNumberId) {
      return new Response(
        JSON.stringify({ 
          error: 'No WhatsApp account configured. Please add a WhatsApp account in Settings > WA Accounts.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!to) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: to' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!templateName && !message) {
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
      .single();

    let businessIdForIncrement: string | null = null;

    if (customerForLimit) {
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
            console.log(`Message limit reached for business ${customerForLimit.business_id}: ${currentCount}/${limit}`);
            return new Response(
              JSON.stringify({ 
                error: 'Message limit reached',
                code: 'LIMIT_REACHED',
                title: 'Message Limit Exceeded',
                details: `You've reached your ${limit} message limit. Upgrade at ${req.headers.get('origin')}/pricing`
              }),
              { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        // Store business_id to increment after successful send
        businessIdForIncrement = customerForLimit.business_id;
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
      
      // CRITICAL: Only add components if templateVariables is explicitly provided AND not empty
      // Meta's API requires this field ONLY when the template has variables
      // Sending components for templates without variables causes error #132000
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
      console.error('WhatsApp API error:', {
        to: cleanPhoneNumber,
        accountId,
        conversationId: conversation_id,
        errorCode,
        errorMessage,
        fullResponse: responseData
      });
      console.error('Request payload:', JSON.stringify(whatsappPayload, null, 2));
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send WhatsApp message',
          code: errorCode,
          title: 'WhatsApp Send Failed',
          details: responseData
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Increment message count only after successful send
    if (businessIdForIncrement) {
      console.log(`Incrementing message count for business: ${businessIdForIncrement}`);
      await supabase.rpc('increment_message_count', { business_uuid: businessIdForIncrement });
    }

    // Find customer and conversation
    const { data: customer } = await supabase
      .from('customers')
      .select('id, business_id')
      .eq('phone', cleanPhoneNumber)
      .single();

    if (customer) {
      let { data: conversation, error: conversationSelectError } = await supabase
        .from('conversations')
        .select('*')
        .eq('customer_id', customer.id)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (conversationSelectError) {
        console.error('Select conversation error:', conversationSelectError);
      }

      if (!conversation) {
        const { data: newConv, error: newConvError } = await supabase
          .from('conversations')
          .insert({ 
            customer_id: customer.id, 
            status: 'active',
            whatsapp_account_id: accountId,
            business_id: customer.business_id
          })
          .select()
          .single();
        if (newConvError) {
          console.error('Create conversation error:', newConvError);
        } else {
          conversation = newConv;
        }
      }

      if (conversation) {
        // Store outbound message in database
        await supabase
          .from('messages')
          .insert({
            conversation_id: conversation.id,
            customer_id: customer.id,
            content: message || `Template: ${templateName}`,
            direction: 'outbound',
            platform: 'whatsapp',
            external_message_id: responseData.messages[0].id,
            thread_id: conversation.id,
            is_read: true,
            business_id: customer.business_id
          });

        // Update conversation timestamp
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
