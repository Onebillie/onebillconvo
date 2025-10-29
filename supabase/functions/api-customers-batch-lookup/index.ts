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
      return new Response(
        JSON.stringify({ error: 'API key is required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Validate API key
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('*, businesses(*)')
      .eq('key_hash', apiKey)
      .eq('is_active', true)
      .single();

    if (apiKeyError || !apiKeyData) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last_used_at
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyData.id);

    // Normalize phone number helper
    const normalizePhone = (phoneNum: string): string => {
      if (!phoneNum) return phoneNum;
      let cleaned = phoneNum.replace(/[\s\-\(\)\.]/g, '');
      if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
      if (cleaned.startsWith('00')) cleaned = cleaned.substring(2);
      if (cleaned.startsWith('353')) return cleaned;
      if (cleaned.startsWith('0')) return '353' + cleaned.substring(1);
      if (cleaned.length === 9 && /^[1-9]/.test(cleaned)) return '353' + cleaned;
      return cleaned;
    };

    const { identifiers } = await req.json();

    if (!identifiers || !Array.isArray(identifiers) || identifiers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'identifiers array is required (max 100)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (identifiers.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Maximum 100 identifiers per request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build query to find customers by multiple identifier types
    const business_id = apiKeyData.business_id;
    let query = supabase
      .from('customers')
      .select('*')
      .eq('business_id', business_id);

    // Build OR conditions for all identifiers with normalized phones
    const emails = identifiers.filter(i => i.email).map(i => i.email);
    const phones = identifiers.filter(i => i.phone).map(i => normalizePhone(i.phone));
    const ids = identifiers.filter(i => i.id).map(i => i.id);
    const externalIds = identifiers.filter(i => i.external_id).map(i => i.external_id);

    const orConditions = [];
    if (emails.length > 0) orConditions.push(`email.in.(${emails.join(',')})`);
    if (phones.length > 0) orConditions.push(`phone.in.(${phones.join(',')})`);
    if (ids.length > 0) orConditions.push(`id.in.(${ids.join(',')})`);
    if (externalIds.length > 0) orConditions.push(`external_id.in.(${externalIds.join(',')})`);

    if (orConditions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Each identifier must have at least one field: id, email, phone, or external_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    query = query.or(orConditions.join(','));

    const { data: customers, error } = await query;

    if (error) {
      console.error('Error fetching customers:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch customers' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        customers: customers || [],
        count: customers?.length || 0
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in batch lookup:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});