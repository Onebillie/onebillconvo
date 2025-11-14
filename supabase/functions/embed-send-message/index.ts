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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Validate API key
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: apiKeyData, error: apiKeyError } = await supabaseAdmin
      .from('api_keys')
      .select('business_id, permission_level')
      .eq('key', apiKey)
      .eq('is_active', true)
      .single();

    if (apiKeyError || !apiKeyData) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check write permissions
    if (apiKeyData.permission_level === 'read_only') {
      return new Response(
        JSON.stringify({ error: 'API key does not have write permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { conversation_id, content, customer_id, business_id } = await req.json();

    if (!conversation_id || !content || !customer_id || !business_id) {
      return new Response(
        JSON.stringify({ error: 'conversation_id, content, customer_id, and business_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify conversation belongs to this business
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .select('business_id, customer_id')
      .eq('id', conversation_id)
      .single();

    if (convError || !conversation || conversation.business_id !== apiKeyData.business_id) {
      return new Response(
        JSON.stringify({ error: 'Conversation not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create message
    const { data: message, error: messageError } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id,
        customer_id,
        content,
        direction: 'outbound',
        platform: 'embed',
        is_read: true,
        status: 'sent'
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error creating message:', messageError);
      return new Response(
        JSON.stringify({ error: 'Failed to create message' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Created message ${message.id} in conversation ${conversation_id}`);

    return new Response(
      JSON.stringify({ success: true, message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in embed-send-message:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
