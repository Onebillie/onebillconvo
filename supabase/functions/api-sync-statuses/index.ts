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

    const body = await req.json();
    const { action, statuses } = body;

    if (!action || !['push', 'pull', 'sync'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be push, pull, or sync' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let result;

    if (action === 'pull') {
      // Get all status tags for this business
      const { data: tags, error: tagsError } = await supabase
        .from('conversation_status_tags')
        .select('*')
        .eq('business_id', keyData.business_id);

      if (tagsError) throw tagsError;

      result = { statuses: tags };
    } else if (action === 'push' || action === 'sync') {
      if (!statuses || !Array.isArray(statuses)) {
        return new Response(
          JSON.stringify({ error: 'statuses array is required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const results = [];
      const errors = [];

      for (const status of statuses) {
        const { name, color, icon, external_id } = status;

        if (!name) {
          errors.push({ status, error: 'name is required' });
          continue;
        }

        try {
          const { data, error } = await supabase
            .from('conversation_status_tags')
            .upsert({
              business_id: keyData.business_id,
              name,
              color: color || '#3b82f6',
              icon: icon || null,
            }, {
              onConflict: 'business_id,name',
            })
            .select()
            .single();

          if (error) throw error;

          results.push({
            id: data.id,
            name: data.name,
            external_id,
            status: 'synced',
          });
        } catch (error) {
          errors.push({
            status: name,
            error: error.message,
          });
        }
      }

      result = {
        success: results.length,
        failed: errors.length,
        results,
        errors,
      };
    }

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in api-sync-statuses:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});