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
    
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('*')
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
    const { name, email, phone, business_id, whatsapp_phone, address, notes } = body;

    if (!name || !phone || !business_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: name, phone, business_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Normalize phone number for consistent matching
    const normalizePhone = (phoneNum: string): string => {
      let cleaned = phoneNum.replace(/[\s\-\(\)\.]/g, '');
      if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
      if (cleaned.startsWith('00')) cleaned = cleaned.substring(2);
      if (cleaned.startsWith('353')) return cleaned;
      if (cleaned.startsWith('0')) return '353' + cleaned.substring(1);
      if (cleaned.length === 9 && /^[1-9]/.test(cleaned)) return '353' + cleaned;
      return cleaned;
    };
    
    const normalizedPhone = normalizePhone(phone);
    const normalizedWhatsApp = whatsapp_phone ? normalizePhone(whatsapp_phone) : normalizedPhone;

    // Check for existing customer with same email or phone
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('business_id', business_id)
      .or(`email.eq.${email || 'null'},phone.eq.${normalizedPhone}`)
      .maybeSingle();

    if (existingCustomer) {
      return new Response(
        JSON.stringify({ error: 'Customer with this email or phone already exists', customer_id: existingCustomer.id }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: customer, error: createError } = await supabase
      .from('customers')
      .insert({
        name,
        email,
        phone: normalizedPhone,
        business_id,
        whatsapp_phone: normalizedWhatsApp,
        address,
        notes,
      })
      .select()
      .single();

    if (createError) throw createError;

    return new Response(JSON.stringify(customer), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in api-customers-create:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
