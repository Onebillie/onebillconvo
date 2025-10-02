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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();
    console.log('Email webhook received:', JSON.stringify(body, null, 2));

    // Resend webhook format
    const { type, data } = body;

    // Handle delivery and read status updates
    if (type === 'email.delivered') {
      const messageId = data.email_id;
      if (messageId) {
        await supabase
          .from('messages')
          .update({ status: 'delivered' })
          .eq('external_message_id', messageId)
          .eq('platform', 'email');
        
        console.log('Email marked as delivered:', messageId);
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (type === 'email.opened') {
      const messageId = data.email_id;
      if (messageId) {
        await supabase
          .from('messages')
          .update({ status: 'read', is_read: true })
          .eq('external_message_id', messageId)
          .eq('platform', 'email');
        
        console.log('Email marked as read:', messageId);
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (type === 'email.bounced' || type === 'email.complained') {
      const messageId = data.email_id;
      if (messageId) {
        await supabase
          .from('messages')
          .update({ status: 'failed' })
          .eq('external_message_id', messageId)
          .eq('platform', 'email');
        
        console.log('Email marked as failed:', messageId);
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (type === 'email.received') {
      const { from, to, subject, html, text } = data;
      const fromEmail = from.email || from;
      const content = text || html || '';

      // Check if message already exists (prevent duplicates)
      const messageId = data.email_id || data.message_id;
      if (messageId) {
        const { data: existingMessage } = await supabase
          .from('messages')
          .select('id')
          .eq('external_message_id', messageId)
          .maybeSingle();

        if (existingMessage) {
          console.log('Email already processed, skipping');
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Find customer by email OR phone
      let { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .or(`email.eq.${fromEmail},phone.eq.${fromEmail}`)
        .maybeSingle();

      if (customerError) {
        console.error('Error finding customer:', customerError);
      }

      // Create customer if doesn't exist
      if (!customer) {
        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert({
            email: fromEmail,
            name: from.name || fromEmail.split('@')[0],
            phone: '',
            last_active: new Date().toISOString(),
            last_contact_method: 'email',
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating customer:', createError);
          throw createError;
        }
        customer = newCustomer;
      } else {
        // Update last active and contact method
        await supabase
          .from('customers')
          .update({
            last_active: new Date().toISOString(),
            last_contact_method: 'email',
          })
          .eq('id', customer.id);
      }

      // Find or create active conversation
      let { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('customer_id', customer.id)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (convError) {
        console.error('Error finding conversation:', convError);
      }

      if (!conversation) {
        const { data: newConv, error: createConvError } = await supabase
          .from('conversations')
          .insert({
            customer_id: customer.id,
            status: 'active',
          })
          .select()
          .single();

        if (createConvError) {
          console.error('Error creating conversation:', createConvError);
          throw createConvError;
        }
        conversation = newConv;
      }

      // Create message
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          customer_id: customer.id,
          content: content,
          direction: 'inbound',
          platform: 'email',
          channel: 'email',
          external_message_id: messageId || null,
          is_read: false,
        });

      if (messageError) {
        console.error('Error creating message:', messageError);
        throw messageError;
      }

      console.log('Email message processed successfully');

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
              title: 'New Email Message',
              body: `From: ${fromEmail}`,
              icon: '/favicon.ico',
              tag: `email-${conversation.id}`,
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
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Email webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
