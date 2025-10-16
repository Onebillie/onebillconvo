import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify API key
    const apiKey = req.headers.get('x-api-key');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    // Check if it's a valid API key from our database
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key_hash', apiKey)
      .eq('is_active', true)
      .single();
    
    if (keyError || !keyData) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update last used timestamp
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyData.id);

    const { customerId, channel, content, subject } = await req.json();

    // Get customer details
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (customerError) throw customerError;

    // Find or create conversation
    let { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('customer_id', customerId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!conversation) {
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({ customer_id: customerId, status: 'active' })
        .select()
        .single();

      if (createError) throw createError;
      conversation = newConv;
    }

    // Send message based on channel
    if (channel === 'whatsapp') {
      if (!customer.phone) {
        throw new Error('Customer has no phone number');
      }

      const { error: whatsappError } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          to: customer.phone,
          message: content,
          conversation_id: conversation.id,
        },
      });

      if (whatsappError) throw whatsappError;
    } else if (channel === 'email') {
      if (!customer.email) {
        throw new Error('Customer has no email address');
      }

      // Use the SMTP email sender which handles templating and bundling
      const { error: emailError } = await supabase.functions.invoke('email-send-smtp', {
        body: {
          to: customer.email,
          subject: subject || 'Message from your team',
          html: content,
          conversation_id: conversation.id,
          customer_id: customer.id,
        },
      });

      if (emailError) throw emailError;
    } else {
      throw new Error('Invalid channel. Use "whatsapp" or "email"');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        conversationId: conversation.id,
        message: 'Message sent successfully' 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in api-send-message:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
