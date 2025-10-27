import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversation_id, phone, customer_name } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let results = {
      from_logs: 0,
      conversations_checked: 0,
      messages_recovered: 0,
      customer_name: customer_name || 'Unknown'
    };

    // Strategy A: Recover from message_logs
    let query = supabase
      .from('message_logs')
      .select('*')
      .eq('platform', 'whatsapp')
      .eq('event_type', 'sent')
      .order('created_at', { ascending: false })
      .limit(100);

    if (conversation_id) {
      query = query.eq('metadata->>conversation_id', conversation_id);
    }

    const { data: logs, error: logsError } = await query;

    if (!logsError && logs) {
      results.conversations_checked = logs.length;

      for (const log of logs) {
        // Check if message already exists
        const { data: existing } = await supabase
          .from('messages')
          .select('id')
          .eq('id', log.message_id)
          .maybeSingle();

        if (!existing && log.metadata) {
          const metadata = log.metadata as any;
          const conversationId = metadata.conversation_id || conversation_id;

          if (conversationId) {
            // Get conversation details
            const { data: conv } = await supabase
              .from('conversations')
              .select('customer_id, business_id')
              .eq('id', conversationId)
              .maybeSingle();

            if (conv) {
              // Reconstruct message
              const { error: insertError } = await supabase
                .from('messages')
                .insert({
                  id: log.message_id,
                  conversation_id: conversationId,
                  customer_id: conv.customer_id,
                  content: '[Message recovered from logs]',
                  direction: 'outbound',
                  platform: 'whatsapp',
                  status: 'sent',
                  delivery_status: 'sent',
                  is_read: true,
                  business_id: conv.business_id,
                  created_at: log.created_at,
                  metadata: { backfilled: true, recovered_from: 'message_logs' }
                });

              if (!insertError) {
                results.from_logs++;
                results.messages_recovered++;
                console.log(`Recovered message ${log.message_id} from logs`);
              }
            }
          }
        }
      }
    }

    // Strategy B: Check for specific customer by phone
    if (phone && !conversation_id) {
      const normalizedPhone = phone.replace(/^\+/, '').replace(/^00/, '');
      
      const { data: customer } = await supabase
        .from('customers')
        .select('id, business_id, name')
        .eq('phone', normalizedPhone)
        .maybeSingle();

      if (customer) {
        results.customer_name = customer.name || results.customer_name;

        // Find all conversations for this customer
        const { data: conversations } = await supabase
          .from('conversations')
          .select('id')
          .eq('customer_id', customer.id);

        if (conversations) {
          // Report on each conversation
          for (const conv of conversations) {
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .eq('direction', 'outbound');

            console.log(`Conversation ${conv.id}: ${count} outbound messages found`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        message: `Recovered ${results.messages_recovered} messages. Checked ${results.conversations_checked} log entries.`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Backfill error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
