import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('business_id, active')
      .eq('key_prefix', apiKey.substring(0, 16))
      .single();

    if (keyError || !keyData || !keyData.active) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('key_prefix', apiKey.substring(0, 16));

    const url = new URL(req.url);
    const customerId = url.searchParams.get('customer_id');
    const conversationId = url.searchParams.get('conversation_id');
    const channel = url.searchParams.get('channel'); // whatsapp, email, sms, etc
    const direction = url.searchParams.get('direction'); // inbound, outbound
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');
    const limit = parseInt(url.searchParams.get('limit') || '100');

    if (!customerId && !conversationId) {
      return new Response(JSON.stringify({ error: 'Must provide customer_id or conversation_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // First verify customer belongs to business
    if (customerId) {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('id', customerId)
        .eq('business_id', keyData.business_id)
        .single();

      if (!customer) {
        return new Response(JSON.stringify({ error: 'Customer not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Build messages query
    let query = supabase
      .from('messages')
      .select(`
        id,
        content,
        subject,
        direction,
        platform,
        created_at,
        is_read,
        status,
        customer_id,
        conversation_id,
        message_attachments (
          id,
          filename,
          url,
          type,
          size
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    if (conversationId) {
      query = query.eq('conversation_id', conversationId);
    }

    if (channel) {
      query = query.eq('platform', channel);
    }

    if (direction) {
      query = query.eq('direction', direction);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: messages, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching messages:', fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get customer details for context
    const customerIds = [...new Set(messages.map(m => m.customer_id))];
    const { data: customers } = await supabase
      .from('customers')
      .select('id, name, email, phone, whatsapp_phone')
      .in('id', customerIds);

    const customerMap = new Map(customers?.map(c => [c.id, c]) || []);

    const enrichedMessages = messages.map(msg => ({
      ...msg,
      customer: customerMap.get(msg.customer_id),
      timestamp: msg.created_at,
    }));

    return new Response(JSON.stringify({ 
      messages: enrichedMessages,
      total: messages.length,
      filters_applied: {
        customer_id: customerId,
        conversation_id: conversationId,
        channel,
        direction,
        start_date: startDate,
        end_date: endDate,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in api-conversation-history:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
