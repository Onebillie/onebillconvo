import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

function normalizePhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('00353')) return cleaned.substring(2);
  if (cleaned.startsWith('353')) return cleaned;
  if (cleaned.startsWith('0') && cleaned.length === 10) return '353' + cleaned.substring(1);
  if (cleaned.length === 9) return '353' + cleaned;
  return cleaned;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Validate API key
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('business_id, is_active')
      .eq('key_hash', apiKey)
      .eq('is_active', true)
      .single();

    if (keyError || !keyData) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last used
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('key_hash', apiKey);

    const { identifiers } = await req.json();

    if (!identifiers || typeof identifiers !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Invalid request. Expected { identifiers: { email?, phone?, external_id? } }' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Customer check request:', identifiers);

    const { email, phone, external_id } = identifiers;
    const matches: any[] = [];

    // Build query conditions
    const conditions: string[] = [];
    if (email) conditions.push(`email.eq.${email}`);
    if (external_id) conditions.push(`external_id.eq.${external_id}`);
    
    let phoneConditions: string[] = [];
    if (phone) {
      const normalized = normalizePhone(phone);
      phoneConditions = [
        `phone.eq.${phone}`,
        `phone.eq.${normalized}`,
        `whatsapp_phone.eq.${phone}`,
        `whatsapp_phone.eq.${normalized}`,
      ];
    }

    // Search for matching customers
    let query = supabase
      .from('customers')
      .select('*')
      .eq('business_id', keyData.business_id);

    if (conditions.length > 0 || phoneConditions.length > 0) {
      const allConditions = [...conditions, ...phoneConditions];
      query = query.or(allConditions.join(','));
    } else {
      // No identifiers provided
      return new Response(
        JSON.stringify({
          exists: false,
          matches: [],
          recommendation: 'create_new',
          message: 'No identifiers provided',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: customers, error: searchError } = await query;

    if (searchError) throw searchError;

    // Process matches
    for (const customer of customers || []) {
      const matchedBy: string[] = [];
      let confidence: 'high' | 'medium' | 'low' = 'low';

      if (email && customer.email === email) {
        matchedBy.push('email');
        confidence = 'high';
      }
      if (external_id && customer.external_id === external_id) {
        matchedBy.push('external_id');
        confidence = 'high';
      }
      if (phone) {
        const normalized = normalizePhone(phone);
        const customerPhone = normalizePhone(customer.phone || '');
        const customerWhatsApp = normalizePhone(customer.whatsapp_phone || '');
        
        if (customerPhone === normalized || customerWhatsApp === normalized) {
          matchedBy.push('phone');
          if (confidence !== 'high') confidence = 'medium';
        }
      }

      // Get conversation data
      const { data: conversations, count } = await supabase
        .from('conversations')
        .select('id, status, updated_at', { count: 'exact' })
        .eq('customer_id', customer.id)
        .order('updated_at', { ascending: false });

      const activeConversations = conversations?.filter(c => c.status === 'open') || [];
      const lastMessage = conversations?.[0];

      matches.push({
        customer_id: customer.id,
        matched_by: matchedBy,
        confidence,
        customer: {
          id: customer.id,
          name: customer.name,
          first_name: customer.first_name,
          last_name: customer.last_name,
          email: customer.email,
          phone: customer.phone,
          whatsapp_phone: customer.whatsapp_phone,
          external_id: customer.external_id,
          has_active_conversations: activeConversations.length > 0,
          conversation_count: count || 0,
          last_message_at: lastMessage?.updated_at,
          created_at: customer.created_at,
          updated_at: customer.updated_at,
        },
      });
    }

    // Determine recommendation
    let recommendation = 'create_new';
    if (matches.length > 0) {
      const highConfidenceMatches = matches.filter(m => m.confidence === 'high');
      if (highConfidenceMatches.length === 1) {
        recommendation = 'update_existing';
      } else if (highConfidenceMatches.length > 1) {
        recommendation = 'review_duplicates';
      } else {
        recommendation = 'possible_match';
      }
    }

    console.log('Customer check result:', { matches: matches.length, recommendation });

    return new Response(
      JSON.stringify({
        exists: matches.length > 0,
        matches,
        recommendation,
        message: matches.length === 0 
          ? 'No matching customers found' 
          : `Found ${matches.length} potential match(es)`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in api-customer-check:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
