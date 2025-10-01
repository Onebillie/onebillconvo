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

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN')!;
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_ID')!;
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { to, message, attachments } = await req.json();

    if (!to || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean phone number (remove + and leading zeros)
    const cleanPhoneNumber = to.replace(/^\+/, '').replace(/^00/, '');

    let whatsappPayload: any = {
      messaging_product: 'whatsapp',
      to: cleanPhoneNumber,
      type: 'text',
      text: {
        body: message
      }
    };

    // Handle attachments if present
    if (attachments && attachments.length > 0) {
      const attachment = attachments[0]; // WhatsApp supports one attachment per message
      
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
      console.error('WhatsApp API error:', responseData);
      console.error('Request payload:', JSON.stringify(whatsappPayload, null, 2));
      return new Response(
        JSON.stringify({ error: 'Failed to send message', details: responseData }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find customer and conversation
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
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
          .insert({ customer_id: customer.id, status: 'active' })
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
            content: message,
            direction: 'outbound',
            platform: 'whatsapp',
            external_message_id: responseData.messages[0].id,
            thread_id: conversation.id,
            is_read: true,
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