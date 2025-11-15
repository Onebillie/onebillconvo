import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { phoneNumber, businessId } = await req.json();

    if (!phoneNumber) {
      return new Response(JSON.stringify({ error: 'Phone number is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Looking up customer for phone:', phoneNumber);

    // Normalize phone number (remove +, spaces, etc.)
    const normalizedPhone = phoneNumber.replace(/[\s\+\-\(\)]/g, '');

    // Look up customer by phone or whatsapp_phone
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, name, email, phone, whatsapp_phone, avatar, last_contact_method')
      .or(`phone.eq.${normalizedPhone},whatsapp_phone.eq.${normalizedPhone}`)
      .limit(1)
      .single();

    if (customerError && customerError.code !== 'PGRST116') {
      console.error('Error looking up customer:', customerError);
    }

    if (!customer) {
      console.log('No customer found for phone:', phoneNumber);
      return new Response(JSON.stringify({ 
        found: false,
        phoneNumber: phoneNumber
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Found customer:', customer.name);

    // Get active conversation if exists
    let conversationId = null;
    if (businessId) {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('customer_id', customer.id)
        .eq('business_id', businessId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (conversation) {
        conversationId = conversation.id;
      }
    }

    return new Response(JSON.stringify({ 
      found: true,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        avatar: customer.avatar,
        lastContactMethod: customer.last_contact_method
      },
      conversationId
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in call-incoming-lookup:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
