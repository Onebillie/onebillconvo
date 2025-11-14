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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create service role client to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get API key from header
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key required in x-api-key header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate API key and get business_id
    const { data: apiKeyData, error: apiKeyError } = await supabaseAdmin
      .from('api_keys')
      .select('business_id, permission_level')
      .eq('key', apiKey)
      .eq('is_active', true)
      .single();

    if (apiKeyError || !apiKeyData) {
      console.error('API key validation error:', apiKeyError);
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { business_id, permission_level } = apiKeyData;

    // Update last_used_at for the API key
    await supabaseAdmin
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('key', apiKey);

    // Get customer_id from query params
    const url = new URL(req.url);
    const customerId = url.searchParams.get('customer_id');

    if (!customerId) {
      return new Response(
        JSON.stringify({ error: 'customer_id query parameter required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch customer data
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .eq('business_id', business_id)
      .single();

    if (customerError || !customer) {
      console.error('Customer fetch error:', customerError);
      return new Response(
        JSON.stringify({ error: 'Customer not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch conversations for this customer
    const { data: conversations, error: conversationsError } = await supabaseAdmin
      .from('conversations')
      .select(`
        *,
        status_tags:conversation_status_tags(id, name, color),
        assigned_user:profiles!conversations_assigned_to_fkey(id, full_name)
      `)
      .eq('customer_id', customerId)
      .eq('business_id', business_id)
      .order('last_message_at', { ascending: false });

    if (conversationsError) {
      console.error('Conversations fetch error:', conversationsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch conversations' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch business info
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('id, name, slug')
      .eq('id', business_id)
      .single();

    if (businessError) {
      console.error('Business fetch error:', businessError);
    }

    console.log(`Fetched ${conversations?.length || 0} conversations for customer ${customerId}`);

    return new Response(
      JSON.stringify({
        success: true,
        customer,
        conversations: conversations || [],
        business,
        permission_level
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in embed-fetch-customer-data:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
