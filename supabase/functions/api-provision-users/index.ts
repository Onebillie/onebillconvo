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

    // Update last_used_at
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyData.id);

    const body = await req.json();
    const { users } = body;

    if (!users || !Array.isArray(users)) {
      return new Response(
        JSON.stringify({ error: 'users array is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const results = [];
    const errors = [];

    for (const user of users) {
      const { email, password, full_name, role = 'member' } = user;

      if (!email || !password) {
        errors.push({ email, error: 'Email and password are required' });
        continue;
      }

      try {
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name }
        });

        if (authError) throw authError;

        // Create profile
        await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email,
            full_name: full_name || email,
          });

        // Add to business
        await supabase
          .from('business_users')
          .insert({
            business_id: keyData.business_id,
            user_id: authData.user.id,
            role: role,
          });

        // Assign agent role by default
        await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: 'agent',
          });

        results.push({
          email,
          user_id: authData.user.id,
          role,
          status: 'created',
        });
      } catch (error) {
        errors.push({
          email,
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: results.length,
        failed: errors.length,
        results,
        errors,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in api-provision-users:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});