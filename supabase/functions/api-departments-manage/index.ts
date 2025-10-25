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

    const method = req.method;

    // GET - List all queues/departments
    if (method === 'GET') {
      const { data: queues, error } = await supabase
        .from('call_queues')
        .select('*')
        .eq('business_id', apiKeyData.business_id)
        .order('name');

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        departments: queues || []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST - Create new department/queue
    if (method === 'POST') {
      const body = await req.json();
      const { name, display_name, phone_number, routing_strategy, business_hours, max_wait_time, music_url, after_hours_action } = body;

      if (!name) {
        return new Response(JSON.stringify({ error: 'name is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: queue, error } = await supabase
        .from('call_queues')
        .insert({
          business_id: apiKeyData.business_id,
          name,
          display_name: display_name || name,
          phone_number,
          routing_strategy: routing_strategy || 'round-robin',
          business_hours: business_hours || {},
          max_wait_time: max_wait_time || 300,
          music_url,
          after_hours_action: after_hours_action || 'voicemail',
          enabled: true
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        department: queue
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PUT - Update department/queue
    if (method === 'PUT') {
      const body = await req.json();
      const { queue_id, ...updates } = body;

      if (!queue_id) {
        return new Response(JSON.stringify({ error: 'queue_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: queue, error } = await supabase
        .from('call_queues')
        .update(updates)
        .eq('id', queue_id)
        .eq('business_id', apiKeyData.business_id)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        department: queue
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE - Delete department/queue
    if (method === 'DELETE') {
      const url = new URL(req.url);
      const queueId = url.searchParams.get('queue_id');

      if (!queueId) {
        return new Response(JSON.stringify({ error: 'queue_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabase
        .from('call_queues')
        .delete()
        .eq('id', queueId)
        .eq('business_id', apiKeyData.business_id);

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        message: 'Department deleted'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error managing departments:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
