import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('business_id, active')
      .eq('key_prefix', apiKey.substring(0, 16))
      .single();

    if (keyError || !keyData || !keyData.active) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('key_prefix', apiKey.substring(0, 16));

    const payload = await req.json();
    const { 
      name, 
      first_name, 
      last_name, 
      email, 
      phone, 
      whatsapp_phone,
      address,
      notes,
      external_id,
      custom_fields 
    } = payload;

    if (!name && !first_name && !last_name) {
      return new Response(JSON.stringify({ error: 'Must provide name or first_name/last_name' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const customerData = {
      business_id: keyData.business_id,
      name: name || `${first_name || ''} ${last_name || ''}`.trim(),
      first_name,
      last_name,
      email,
      phone,
      whatsapp_phone: whatsapp_phone || phone,
      address,
      notes,
      external_id,
      custom_fields: custom_fields || {},
    };

    const { data: customer, error: createError } = await supabase
      .from('customers')
      .insert(customerData)
      .select()
      .single();

    if (createError) {
      console.error('Error creating customer:', createError);
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      customer 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in api-customer-create:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
