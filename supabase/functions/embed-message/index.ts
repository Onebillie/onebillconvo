import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const sessionToken = req.headers.get('x-session-token');
    if (!sessionToken) {
      return new Response(JSON.stringify({ error: 'Missing session token' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: session } = await supabase.from('embed_sessions').select('*')
      .eq('session_token', sessionToken).gt('expires_at', new Date().toISOString()).single();

    if (!session) {
      return new Response(JSON.stringify({ error: 'Invalid or expired session' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'validate_session') {
      // Session already validated above, just return success
      return new Response(JSON.stringify({ valid: true }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'get_messages') {
      // PRIVACY-FIRST: Only return messages created during or after this session
      // This prevents any historical messages from being visible in the widget
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', session.conversation_id)
        .gte('created_at', session.created_at)
        .order('created_at', { ascending: true });
      
      return new Response(JSON.stringify({ messages }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'send_message') {
      const { message, content } = body;
      const messageContent = message || content;
      
      if (!messageContent || !messageContent.trim()) {
        return new Response(JSON.stringify({ error: 'Message content is required' }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      console.log('[embed-message] Sending message:', {
        conversationId: session.conversation_id,
        customerId: session.customer_id,
        contentLength: messageContent.length
      });

      const { data: newMessage, error: insertError } = await supabase.from('messages').insert({
        conversation_id: session.conversation_id, 
        customer_id: session.customer_id,
        content: messageContent, 
        direction: 'inbound', 
        platform: 'embed',
        status: 'delivered',
        priority: 5,
        metadata: { source: 'website_widget', requires_urgent_response: true }
      }).select().single();

      if (insertError) {
        console.error('[embed-message] Error inserting message:', insertError);
        return new Response(JSON.stringify({ error: 'Failed to send message', details: insertError.message }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      console.log('[embed-message] Message inserted successfully:', { messageId: newMessage.id });

      // Update customer's last_contact_method to embed
      await supabase
        .from('customers')
        .update({ last_contact_method: 'embed' })
        .eq('id', session.customer_id);

      // Push to CRM webhook if configured
      const { data: conversation } = await supabase
        .from('conversations')
        .select('business_id')
        .eq('id', session.conversation_id)
        .single();

      if (conversation) {
        const { data: settings } = await supabase
          .from('business_settings')
          .select('message_webhook_url, message_webhook_enabled, message_webhook_secret')
          .eq('business_id', conversation.business_id)
          .single();

        if (settings?.message_webhook_enabled && settings.message_webhook_url) {
          const { data: customer } = await supabase
            .from('customers')
            .select('*')
            .eq('id', session.customer_id)
            .single();

          const webhookPayload = {
            event: 'customer.created_via_chatbot',
            timestamp: new Date().toISOString(),
            business_id: conversation.business_id,
            data: {
              customer,
              message: {
                id: newMessage.id,
                content: messageContent,
                created_at: newMessage.created_at,
                platform: 'website'
              }
            }
          };

          fetch(settings.message_webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookPayload),
          }).catch(err => console.error('CRM webhook failed:', err));
        }
      }

      // Send notifications asynchronously (fire-and-forget) to avoid blocking response
      Promise.resolve().then(async () => {
        try {
          // Get conversation details for notifications
          const { data: conversation } = await supabase.from('conversations')
            .select('business_id, assigned_to, customer_id, customers(name)')
            .eq('id', session.conversation_id)
            .single();

          if (!conversation) return;

          const customerName = conversation.customers?.name || 'Customer';
          
          // Get all business users for notification if no specific assignment
          const targetUsers = conversation.assigned_to 
            ? [conversation.assigned_to]
            : await supabase.from('business_users')
                .select('user_id')
                .eq('business_id', conversation.business_id)
                .then(({ data }) => data?.map(u => u.user_id) || []);

          // Send notifications to each target user
          for (const userId of Array.isArray(targetUsers) ? targetUsers : [targetUsers]) {
            // Create in-app notification
            await supabase.from('notifications').insert({
              user_id: userId,
              type: 'message',
              title: `New message from ${customerName}`,
              message: message || content,
              link_url: `/app/dashboard?conversation=${session.conversation_id}`,
              priority: 5,
              related_conversation_id: session.conversation_id
            });

            // Send push notification
            try {
              await supabase.functions.invoke('send-push-notification', {
                body: {
                  userId,
                  title: `💬 ${customerName}`,
                  body: message || content,
                  data: {
                    type: 'embed_message',
                    conversationId: session.conversation_id,
                    url: `/app/dashboard?conversation=${session.conversation_id}`
                  }
                }
              });
            } catch (error) {
              console.error('Failed to send push notification:', error);
            }
          }
        } catch (error) {
          console.error('Error sending notifications:', error);
        }
      });
      
      // Return success immediately without waiting for notifications
      return new Response(JSON.stringify({ success: true, message: newMessage }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), 
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
