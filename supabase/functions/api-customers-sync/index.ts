import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

interface CustomerSyncData {
  external_id?: string;
  name: string;
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  address?: string;
  notes?: string;
  custom_fields?: Record<string, any>;
}

interface SyncResult {
  external_id?: string;
  customer_id: string;
  action: 'created' | 'updated';
  matched_by?: 'email' | 'phone' | 'external_id';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate API key
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('business_id, is_active')
      .eq('key_hash', apiKey)
      .single();

    if (keyError || !keyData?.is_active) {
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const businessId = keyData.business_id;

    // Update last_used_at
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('key_hash', apiKey);

    // Parse request body
    const body = await req.json();
    const customers: CustomerSyncData[] = body.customers || [];

    if (!Array.isArray(customers) || customers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'customers array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (customers.length > 1000) {
      return new Response(
        JSON.stringify({ error: 'Maximum 1000 customers per request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Phone normalization function
    const normalizePhone = (phone: string): string => {
      let cleaned = phone.replace(/[^\d+]/g, '');
      if (cleaned.startsWith('00')) {
        cleaned = '+' + cleaned.substring(2);
      } else if (cleaned.startsWith('0') && !cleaned.startsWith('00')) {
        cleaned = '+353' + cleaned.substring(1);
      } else if (!cleaned.startsWith('+')) {
        cleaned = '+353' + cleaned;
      }
      return cleaned;
    };

    // Process each customer
    const results: SyncResult[] = [];
    const errors: any[] = [];

    for (const customer of customers) {
      try {
        // Validate required fields
        if (!customer.name) {
          errors.push({
            customer,
            error: 'name is required'
          });
          continue;
        }

        const normalizedPhone = customer.phone ? normalizePhone(customer.phone) : null;
        
        // Try to find existing customer
        let existingCustomer = null;
        let matchedBy = null;

        // Try matching by external_id first
        if (customer.external_id) {
          const { data } = await supabase
            .from('customers')
            .select('id')
            .eq('business_id', businessId)
            .eq('external_id', customer.external_id)
            .maybeSingle();
          
          if (data) {
            existingCustomer = data;
            matchedBy = 'external_id';
          }
        }

        // Try matching by email
        if (!existingCustomer && customer.email) {
          const { data } = await supabase
            .from('customers')
            .select('id')
            .eq('business_id', businessId)
            .eq('email', customer.email)
            .maybeSingle();
          
          if (data) {
            existingCustomer = data;
            matchedBy = 'email';
          }
        }

        // Try matching by phone
        if (!existingCustomer && normalizedPhone) {
          const { data } = await supabase
            .from('customers')
            .select('id')
            .eq('business_id', businessId)
            .eq('phone', normalizedPhone)
            .maybeSingle();
          
          if (data) {
            existingCustomer = data;
            matchedBy = 'phone';
          }
        }

        const customerData = {
          business_id: businessId,
          name: customer.name,
          email: customer.email || null,
          phone: normalizedPhone,
          first_name: customer.first_name || null,
          last_name: customer.last_name || null,
          address: customer.address || null,
          notes: customer.notes || null,
          external_id: customer.external_id || null,
          custom_fields: customer.custom_fields || {},
        };

        if (existingCustomer) {
          // Update existing customer
          const { error: updateError } = await supabase
            .from('customers')
            .update(customerData)
            .eq('id', existingCustomer.id);

          if (updateError) throw updateError;

          results.push({
            external_id: customer.external_id,
            customer_id: existingCustomer.id,
            action: 'updated',
            matched_by: matchedBy as any
          });
        } else {
          // Create new customer
          const { data: newCustomer, error: createError } = await supabase
            .from('customers')
            .insert(customerData)
            .select('id')
            .single();

          if (createError) throw createError;

          results.push({
            external_id: customer.external_id,
            customer_id: newCustomer.id,
            action: 'created'
          });
        }
      } catch (error: any) {
        errors.push({
          customer,
          error: error.message
        });
      }
    }

    const created = results.filter(r => r.action === 'created').length;
    const updated = results.filter(r => r.action === 'updated').length;

    return new Response(
      JSON.stringify({
        success: true,
        results: {
          total: customers.length,
          created,
          updated,
          failed: errors.length,
          details: results,
          errors: errors.length > 0 ? errors : undefined
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in api-customers-sync:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
