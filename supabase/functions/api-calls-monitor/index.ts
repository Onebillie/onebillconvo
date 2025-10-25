import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify API key
    const { data: apiKeyData } = await supabase
      .from('api_keys')
      .select('business_id, permissions')
      .eq('key_hash', apiKey)
      .eq('is_active', true)
      .single();

    if (!apiKeyData) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get active calls
    const { data: activeCalls } = await supabase
      .from('call_records')
      .select(`
        *,
        agent:agent_id(id, full_name, email)
      `)
      .eq('business_id', apiKeyData.business_id)
      .in('status', ['initiated', 'ringing', 'in-progress', 'queued'])
      .order('created_at', { ascending: false });

    // Get agent availability
    const { data: agents } = await supabase
      .from('agent_availability')
      .select(`
        *,
        agent:agent_id(id, full_name, email)
      `)
      .eq('business_id', apiKeyData.business_id);

    // Get queue stats
    const { data: queues } = await supabase
      .from('call_queues')
      .select('*')
      .eq('business_id', apiKeyData.business_id)
      .eq('enabled', true);

    // Calculate metrics
    const metrics = {
      active_calls: activeCalls?.length || 0,
      available_agents: agents?.filter(a => a.status === 'available').length || 0,
      busy_agents: agents?.filter(a => a.status === 'on-call').length || 0,
      total_agents: agents?.length || 0,
      queued_calls: activeCalls?.filter(c => c.status === 'queued').length || 0,
    };

    return new Response(JSON.stringify({
      success: true,
      metrics,
      active_calls: activeCalls || [],
      agents: agents || [],
      queues: queues || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error monitoring calls:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
