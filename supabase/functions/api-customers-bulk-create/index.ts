import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { formatPhone } from "../_shared/phoneUtils.ts";

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
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate API key
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key_hash', apiKey)
      .eq('is_active', true)
      .maybeSingle();
    
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

    // Use shared phone formatting utility

    const { customers } = await req.json();

    if (!Array.isArray(customers) || customers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'customers array is required and must not be empty' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (customers.length > 1000) {
      return new Response(
        JSON.stringify({ error: 'Maximum 1000 customers per batch' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const results = {
      total: customers.length,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as any[],
    };

    // Process customers in batches
    for (const customer of customers) {
      try {
        // Validate required fields
        if (!customer.name) {
          results.failed++;
          results.errors.push({
            customer,
            error: 'Missing required field: name',
          });
          continue;
        }

        // Check if customer already exists (by email or normalized phone)
        let existingCustomer = null;
        const normalizedPhone = customer.phone ? formatPhone(customer.phone) : null;
        
        if (customer.email) {
          const { data } = await supabase
            .from('customers')
            .select('id')
            .eq('business_id', keyData.business_id)
            .eq('email', customer.email)
            .maybeSingle();
          existingCustomer = data;
        }
        
        if (!existingCustomer && normalizedPhone) {
          const { data } = await supabase
            .from('customers')
            .select('id')
            .eq('business_id', keyData.business_id)
            .eq('phone', normalizedPhone)
            .maybeSingle();
          existingCustomer = data;
        }

        const customerData = {
          name: customer.name,
          first_name: customer.first_name,
          last_name: customer.last_name,
          phone: normalizedPhone,
          email: customer.email,
          address: customer.address,
          notes: customer.notes,
          business_id: keyData.business_id,
        };

        if (existingCustomer) {
          // Update existing customer
          const { error: updateError } = await supabase
            .from('customers')
            .update(customerData)
            .eq('id', existingCustomer.id);

          if (updateError) throw updateError;
          results.updated++;
        } else {
          // Create new customer
          const { error: insertError } = await supabase
            .from('customers')
            .insert(customerData);

          if (insertError) throw insertError;
          results.created++;
        }
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          customer,
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in api-customers-bulk-create:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
