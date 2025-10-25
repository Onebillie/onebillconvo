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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    console.log('Email webhook received:', payload);

    // Support multiple email provider formats (SendGrid, Mailgun, etc.)
    const events = Array.isArray(payload) ? payload : [payload];

    for (const event of events) {
      const { 
        event: eventType, 
        email, 
        message_id,
        reason,
        timestamp 
      } = normalizeEvent(event);

      // Find message by external message ID or recipient email
      const { data: messages } = await supabase
        .from('messages')
        .select('id, conversation_id')
        .or(`platform_message_id.eq.${message_id},content.ilike.%${email}%`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!messages || messages.length === 0) {
        console.log('Message not found for email:', email, message_id);
        continue;
      }

      const message = messages[0];

      // Map event types to our status
      const statusMapping: Record<string, string> = {
        'delivered': 'delivered',
        'open': 'opened',
        'click': 'clicked',
        'bounce': 'bounced',
        'dropped': 'failed',
        'deferred': 'pending',
        'processed': 'sent'
      };

      const deliveryStatus = statusMapping[eventType] || eventType;

      // Update message delivery status
      const updateData: any = {
        delivery_status: deliveryStatus,
        updated_at: new Date().toISOString()
      };

      if (eventType === 'open' || eventType === 'opened') {
        updateData.opened_at = timestamp || new Date().toISOString();
      }
      if (eventType === 'click' || eventType === 'clicked') {
        updateData.clicked_at = timestamp || new Date().toISOString();
      }
      if (eventType === 'bounce' || eventType === 'bounced') {
        updateData.bounce_reason = reason || 'Unknown';
      }

      await supabase
        .from('messages')
        .update(updateData)
        .eq('id', message.id);

      // Log event
      await supabase.from('message_logs').insert({
        message_id: message.id,
        timestamp: timestamp || new Date().toISOString(),
        event_type: deliveryStatus,
        status: 'success',
        platform: 'email',
        metadata: event
      });

      // Update campaign recipient if this is from a campaign
      if (message_id) {
        await supabase
          .from('campaign_recipients')
          .update({
            status: deliveryStatus,
            ...(eventType === 'delivered' && { delivered_at: timestamp }),
            ...(eventType === 'open' && { opened_at: timestamp }),
            ...(eventType === 'click' && { clicked_at: timestamp })
          })
          .eq('message_id', message.id);
      }

      console.log(`Email event processed: ${eventType} for message ${message.id}`);
    }

    return new Response(
      JSON.stringify({ success: true, processed: events.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Email webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function normalizeEvent(event: any) {
  // SendGrid format
  if (event.sg_event_id) {
    return {
      event: event.event,
      email: event.email,
      message_id: event.sg_message_id,
      reason: event.reason,
      timestamp: new Date(event.timestamp * 1000).toISOString()
    };
  }

  // Mailgun format
  if (event['event-data']) {
    const data = event['event-data'];
    return {
      event: data.event,
      email: data.recipient,
      message_id: data.message?.headers?.['message-id'],
      reason: data['delivery-status']?.message,
      timestamp: new Date(data.timestamp * 1000).toISOString()
    };
  }

  // Generic format
  return {
    event: event.event || event.type,
    email: event.email || event.recipient,
    message_id: event.message_id || event.messageId,
    reason: event.reason || event.error,
    timestamp: event.timestamp || new Date().toISOString()
  };
}
