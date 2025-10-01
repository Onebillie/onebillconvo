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
    // Verify API key
    const apiKey = req.headers.get('x-api-key');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (apiKey !== serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey!);

    const url = new URL(req.url);
    const conversationId = url.searchParams.get('id');

    if (conversationId) {
      // Fetch single conversation with messages and attachments
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select(`
          *,
          customer:customers(*),
          messages(
            *,
            message_attachments(*)
          )
        `)
        .eq('id', conversationId)
        .single();

      if (convError) throw convError;

      return new Response(JSON.stringify(conversation), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // Fetch all conversations
      const { data: conversations, error: convsError } = await supabase
        .from('conversations')
        .select(`
          *,
          customer:customers(*),
          messages(
            *,
            message_attachments(*)
          )
        `)
        .order('updated_at', { ascending: false });

      if (convsError) throw convsError;

      return new Response(JSON.stringify(conversations), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in api-conversations:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
