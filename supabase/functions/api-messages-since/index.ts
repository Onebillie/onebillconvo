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
    const since = url.searchParams.get('since');
    const conversation_id = url.searchParams.get('conversation_id');
    const customer_id = url.searchParams.get('customer_id');
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const include_attachments = url.searchParams.get('include_attachments') === 'true';

    if (!since) {
      return new Response(
        JSON.stringify({ error: 'since timestamp is required (ISO 8601 format)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const business_id = apiKeyData.business_id;

    // Build query for messages
    let query = supabase
      .from('messages')
      .select(`
        *,
        conversation:conversations!inner(
          id,
          customer_id,
          business_id,
          status,
          customers(id, name, email, phone, external_id)
        )
      `)
      .eq('conversation.business_id', business_id)
      .gt('created_at', since)
      .order('created_at', { ascending: true })
      .limit(limit);

    // Optional filters
    if (conversation_id) {
      query = query.eq('conversation_id', conversation_id);
    }

    if (customer_id) {
      query = query.eq('conversation.customer_id', customer_id);
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error('Error fetching messages:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch messages' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    return new Response(
      JSON.stringify({
        messages: messages || [],
        count: messages?.length || 0,
        has_more: messages?.length === limit
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in messages-since:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});