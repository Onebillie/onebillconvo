import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get API key from header
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      throw new Error('API key required');
    }

    // Verify API key and get business
    const { data: apiAccess, error: apiError } = await supabase
      .from('api_access')
      .select('business_id')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single();

    if (apiError || !apiAccess) {
      throw new Error('Invalid API key');
    }

    // Get business voice credit info
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('voice_credit_balance, voice_minutes_used_period, voice_period_start, voice_period_end, subscription_tier')
      .eq('id', apiAccess.business_id)
      .single();

    if (businessError || !business) {
      throw new Error('Business not found');
    }

    // Get pricing config for tier
    const { data: pricing } = await supabase
      .from('voice_pricing_config')
      .select('*')
      .eq('tier', business.subscription_tier)
      .single();

    const now = new Date();
    const periodEnd = new Date(business.voice_period_end || now);
    const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    const includedMinutesUsed = business.voice_minutes_used_period || 0;
    const includedMinutesLimit = (pricing?.included_inbound_minutes || 0) + (pricing?.included_outbound_minutes || 0);
    const includedMinutesRemaining = Math.max(0, includedMinutesLimit - includedMinutesUsed);

    return new Response(
      JSON.stringify({
        success: true,
        voice_credit_balance: business.voice_credit_balance || 0,
        included_minutes: {
          used: includedMinutesUsed,
          limit: includedMinutesLimit,
          remaining: includedMinutesRemaining,
          percentage_used: includedMinutesLimit > 0 ? Math.round((includedMinutesUsed / includedMinutesLimit) * 100) : 0
        },
        billing_period: {
          start: business.voice_period_start,
          end: business.voice_period_end,
          days_remaining: daysRemaining
        },
        tier: business.subscription_tier
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching voice balance:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
