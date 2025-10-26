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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    // Verify API key
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('*, business_id')
      .eq('key_hash', apiKey)
      .eq('is_active', true)
      .single();
    
    if (keyError || !keyData) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update last used timestamp
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyData.id);

    const businessId = keyData.business_id;
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const templateId = pathParts[pathParts.length - 1];
    
    // Handle GET /api-templates - List templates
    if (req.method === 'GET' && !templateId) {
      const category = url.searchParams.get('category');
      const channel = url.searchParams.get('channel');
      
      let query = supabase
        .from('marketing_templates')
        .select('*')
        .or(`business_id.eq.${businessId},is_public.eq.true`)
        .order('created_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      if (channel) {
        query = query.contains('channels', [channel]);
      }

      const { data: templates, error: templatesError } = await query;

      if (templatesError) throw templatesError;

      return new Response(JSON.stringify(templates), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle GET /api-templates/:id - Get single template
    if (req.method === 'GET' && templateId) {
      const { data: template, error: templateError } = await supabase
        .from('marketing_templates')
        .select('*')
        .eq('id', templateId)
        .or(`business_id.eq.${businessId},is_public.eq.true`)
        .single();

      if (templateError) throw templateError;

      return new Response(JSON.stringify(template), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle POST /api-templates - Create template
    if (req.method === 'POST') {
      const body = await req.json();
      
      const { data: template, error: createError } = await supabase
        .from('marketing_templates')
        .insert({
          ...body,
          business_id: businessId,
        })
        .select()
        .single();

      if (createError) throw createError;

      return new Response(JSON.stringify(template), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle PUT /api-templates/:id - Update template
    if (req.method === 'PUT' && templateId) {
      const body = await req.json();
      
      const { data: template, error: updateError } = await supabase
        .from('marketing_templates')
        .update(body)
        .eq('id', templateId)
        .eq('business_id', businessId)
        .select()
        .single();

      if (updateError) throw updateError;

      return new Response(JSON.stringify(template), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle DELETE /api-templates/:id - Delete template
    if (req.method === 'DELETE' && templateId) {
      const { error: deleteError } = await supabase
        .from('marketing_templates')
        .delete()
        .eq('id', templateId)
        .eq('business_id', businessId);

      if (deleteError) throw deleteError;

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in api-templates:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
