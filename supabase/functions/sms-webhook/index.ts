import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const formData = await req.formData();
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;

    console.log('Received SMS:', { from, to, body, messageSid });

    // Find SMS account by phone number
    const { data: smsAccount, error: accountError } = await supabase
      .from('sms_accounts')
      .select('business_id')
      .eq('phone_number', to)
      .single();

    if (accountError || !smsAccount) {
      console.error('SMS account not found for:', to);
      return new Response('OK', { status: 200 });
    }

    // Find or create customer by phone
    let customer;
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id, business_id')
      .eq('phone', from)
      .eq('business_id', smsAccount.business_id)
      .single();

    if (existingCustomer) {
      customer = existingCustomer;
    } else {
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          name: from,
          phone: from,
          business_id: smsAccount.business_id,
          last_contact_method: 'sms',
        })
        .select()
        .single();

      if (customerError) {
        throw customerError;
      }
      customer = newCustomer;
    }

    // Find or create conversation
    let conversation;
    const { data: existingConversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('customer_id', customer.id)
      .eq('business_id', customer.business_id)
      .single();

    if (existingConversation) {
      conversation = existingConversation;
    } else {
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          customer_id: customer.id,
          business_id: customer.business_id,
          status: 'active',
        })
        .select()
        .single();

      if (convError) {
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
        content: body,
        direction: 'inbound',
        platform: 'sms',
        status: 'received',
        is_read: false,
        business_id: customer.business_id,
        external_message_id: messageSid,
      });

    if (messageError) {
      console.error('Error inserting message:', messageError);
    } else {
      // Trigger notifications for the new message
      try {
        const { data: business } = await supabase
          .from('businesses')
          .select('owner_id')
          .eq('id', customer.business_id)
          .single();

        if (business?.owner_id) {
          await supabase.functions.invoke('queue-notification', {
            body: {
              userId: business.owner_id,
              businessId: customer.business_id,
              notificationType: 'message',
              channel: 'sms',
              priority: 'immediate',
              title: `New SMS from ${customer.name || from}`,
              message: body.substring(0, 100) + (body.length > 100 ? '...' : ''),
              link: `/app/dashboard?conversation=${conversation.id}`
            }
          });
        }
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
      }
    }

    // Return TwiML response
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { 
        status: 200,
        headers: { 'Content-Type': 'text/xml' }
      }
    );

  } catch (error: any) {
    console.error('SMS webhook error:', error);
    return new Response('OK', { status: 200 });
  }
});