import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-embed-token',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const embedToken = req.headers.get('x-embed-token');

    if (!embedToken) {
      return new Response(
        JSON.stringify({ error: 'Missing embed token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify embed token
    const { data: tokenData, error: tokenError } = await supabase
      .from('embed_tokens')
      .select('business_id, businesses(is_frozen, pricing_model)')
      .eq('token', embedToken)
      .eq('is_active', true)
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: 'Invalid embed token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (tokenData.businesses.is_frozen) {
      return new Response(
        JSON.stringify({ error: 'Account suspended' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { conversation_id, customer_id, content, action } = body;

    if (action === 'get_messages') {
      // Fetch messages for the conversation
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('id, content, sender_type, created_at, is_read')
        .eq('conversation_id', conversation_id)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch messages' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, messages }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'send_message') {
      if (!content || !conversation_id) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Insert message
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id,
          content,
          sender_type: 'customer',
          channel: 'embed'
        })
        .select()
        .single();

      if (messageError) {
        console.error('Error creating message:', messageError);
        return new Response(
          JSON.stringify({ error: 'Failed to send message' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update billing usage for per-message pricing
      if (tokenData.businesses.pricing_model === 'per_message') {
        await supabase.rpc('increment_message_count', {
          business_uuid: tokenData.business_id
        });

        // Update billing usage table
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        await supabase
          .from('billing_usage')
          .upsert({
            business_id: tokenData.business_id,
            period_start: periodStart.toISOString(),
            period_end: periodEnd.toISOString(),
            messages_sent: 1
          }, {
            onConflict: 'business_id,period_start',
            ignoreDuplicates: false
          });
      }

      return new Response(
        JSON.stringify({ success: true, message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'mark_resolved') {
      const { resolution_type, resolution_value } = body;

      if (!conversation_id || !resolution_type) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Mark conversation as resolved
      await supabase.rpc('mark_conversation_resolved', {
        _conversation_id: conversation_id,
        _resolution_type: resolution_type,
        _resolution_value: resolution_value
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in embed-message:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
