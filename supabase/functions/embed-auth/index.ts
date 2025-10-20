import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-embed-token',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const embedToken = req.headers.get('x-embed-token');
    const origin = req.headers.get('origin');

    if (!embedToken) {
      return new Response(
        JSON.stringify({ error: 'Missing embed token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify embed token
    const { data: tokenData, error: tokenError } = await supabase
      .from('embed_tokens')
      .select('*, businesses(id, name, is_frozen)')
      .eq('token', embedToken)
      .eq('is_active', true)
      .single();

    if (tokenError || !tokenData) {
      console.error('Invalid embed token:', embedToken);
      return new Response(
        JSON.stringify({ error: 'Invalid embed token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if business is frozen
    if (tokenData.businesses.is_frozen) {
      return new Response(
        JSON.stringify({ error: 'Account suspended' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify domain if allowed_domains is configured
    if (tokenData.allowed_domains && tokenData.allowed_domains.length > 0 && origin) {
      const isAllowed = tokenData.allowed_domains.some(domain => 
        origin.includes(domain) || origin.endsWith(domain)
      );
      
      if (!isAllowed) {
        console.error('Domain not allowed:', origin);
        return new Response(
          JSON.stringify({ error: 'Domain not authorized' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update usage stats
    await supabase
      .from('embed_tokens')
      .update({
        last_used_at: new Date().toISOString(),
        usage_count: tokenData.usage_count + 1
      })
      .eq('id', tokenData.id);

    // Parse request body for customer info
    const body = await req.json();
    const { customer_email, customer_name, customer_phone, custom_data } = body;

    // Create or find customer
    let customerId: string;
    
    if (customer_email) {
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('business_id', tokenData.business_id)
        .eq('email', customer_email)
        .single();

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            business_id: tokenData.business_id,
            name: customer_name || customer_email,
            email: customer_email,
            phone: customer_phone,
            metadata: custom_data
          })
          .select('id')
          .single();

        if (customerError) {
          console.error('Error creating customer:', customerError);
          return new Response(
            JSON.stringify({ error: 'Failed to create customer' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        customerId = newCustomer.id;
      }
    } else {
      // Anonymous customer
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          business_id: tokenData.business_id,
          name: customer_name || 'Anonymous',
          metadata: custom_data
        })
        .select('id')
        .single();

      if (customerError) {
        console.error('Error creating anonymous customer:', customerError);
        return new Response(
          JSON.stringify({ error: 'Failed to create customer' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      customerId = newCustomer.id;
    }

    // Find or create conversation
    const { data: existingConversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('business_id', tokenData.business_id)
      .eq('customer_id', customerId)
      .eq('channel', 'embed')
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let conversationId: string;

    if (existingConversation) {
      conversationId = existingConversation.id;
    } else {
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          business_id: tokenData.business_id,
          customer_id: customerId,
          channel: 'embed',
          status: 'active'
        })
        .select('id')
        .single();

      if (convError) {
        console.error('Error creating conversation:', convError);
        return new Response(
          JSON.stringify({ error: 'Failed to create conversation' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      conversationId = newConversation.id;
    }

    return new Response(
      JSON.stringify({
        success: true,
        session: {
          customer_id: customerId,
          conversation_id: conversationId,
          business_name: tokenData.businesses.name
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in embed-auth:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
