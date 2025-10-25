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
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key is required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Validate API key
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('*, businesses(*)')
      .eq('key_hash', apiKey)
      .eq('is_active', true)
      .single();

    if (apiKeyError || !apiKeyData) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last_used_at
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyData.id);

    const url = new URL(req.url);
    const customer_id = url.searchParams.get('customer_id');
    const email = url.searchParams.get('email');
    const phone = url.searchParams.get('phone');
    const external_id = url.searchParams.get('external_id');
    const include_messages = url.searchParams.get('include_messages') === 'true';
    const include_attachments = url.searchParams.get('include_attachments') === 'true';

    if (!customer_id && !email && !phone && !external_id) {
      return new Response(
        JSON.stringify({ error: 'One of customer_id, email, phone, or external_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const business_id = apiKeyData.business_id;

    // First, find the customer
    let customerQuery = supabase
      .from('customers')
      .select('*')
      .eq('business_id', business_id);

    if (customer_id) {
      customerQuery = customerQuery.eq('id', customer_id);
    } else if (email) {
      customerQuery = customerQuery.eq('email', email);
    } else if (phone) {
      customerQuery = customerQuery.eq('phone', phone);
    } else if (external_id) {
      customerQuery = customerQuery.eq('external_id', external_id);
    }

    const { data: customer, error: customerError } = await customerQuery.single();

    if (customerError || !customer) {
      return new Response(
        JSON.stringify({ error: 'Customer not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all conversations for this customer
    let conversationsQuery = supabase
      .from('conversations')
      .select('*')
      .eq('customer_id', customer.id)
      .eq('business_id', business_id)
      .order('last_message_at', { ascending: false });

    const { data: conversations, error: conversationsError } = await conversationsQuery;

    if (conversationsError) {
      console.error('Error fetching conversations:', conversationsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch conversations' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If include_messages is true, fetch messages for each conversation
    if (include_messages && conversations) {
      for (const conversation of conversations) {
        let messagesQuery = supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: true });

        const { data: messages } = await messagesQuery;
        conversation.messages = messages || [];

        // If include_attachments is true, fetch attachments for each message
        if (include_attachments && messages) {
          for (const message of messages) {
            const { data: attachments } = await supabase
              .from('message_attachments')
              .select('*')
              .eq('message_id', message.id);
            
            message.attachments = attachments || [];
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        customer,
        conversations: conversations || [],
        conversation_count: conversations?.length || 0
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in conversations-by-customer:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});