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

    if (action === 'get_messages') {
      const { data: messages } = await supabase.from('messages').select('*')
        .eq('conversation_id', session.conversation_id).order('created_at', { ascending: true });
      return new Response(JSON.stringify({ messages }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'send_message') {
      const { message, content } = body;
      const { data: newMessage } = await supabase.from('messages').insert({
        conversation_id: session.conversation_id, customer_id: session.customer_id,
        content: message || content, direction: 'inbound', channel: 'embed', status: 'delivered'
      }).select().single();
      
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
