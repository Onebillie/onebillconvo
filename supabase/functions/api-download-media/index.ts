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
      return new Response(JSON.stringify({ error: 'Missing API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    // Validate API key
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('id, business_id, permissions')
      .eq('key_hash', apiKey)
      .eq('is_active', true)
      .single();
    
    if (keyError || !keyData) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyData.id);

    const url = new URL(req.url);
    const conversationId = url.searchParams.get('conversation_id');
    const customerId = url.searchParams.get('customer_id');
    const fromDate = url.searchParams.get('from_date');
    const toDate = url.searchParams.get('to_date');

    // Build query
    let query = supabase
      .from('message_attachments')
      .select(`
        *,
        messages!inner(
          id,
          conversation_id,
          customer_id,
          created_at,
          conversations!inner(business_id)
        )
      `)
      .eq('messages.conversations.business_id', keyData.business_id);

    if (conversationId) {
      query = query.eq('messages.conversation_id', conversationId);
    }

    if (customerId) {
      query = query.eq('messages.customer_id', customerId);
    }

    if (fromDate) {
      query = query.gte('messages.created_at', fromDate);
    }

    if (toDate) {
      query = query.lte('messages.created_at', toDate);
    }

    const { data: attachments, error: attachmentsError } = await query;

    if (attachmentsError) throw attachmentsError;

    // Format response with download URLs
    const media = attachments.map(attachment => ({
      id: attachment.id,
      filename: attachment.filename,
      type: attachment.type,
      size: attachment.size,
      url: attachment.url,
      created_at: attachment.created_at,
      conversation_id: attachment.messages?.conversation_id,
      customer_id: attachment.messages?.customer_id,
      message_id: attachment.message_id,
    }));

    return new Response(
      JSON.stringify({
        total: media.length,
        media,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in api-download-media:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});