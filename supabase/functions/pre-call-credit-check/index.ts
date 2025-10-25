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

    const { business_id, direction = 'outbound', estimated_duration_minutes = 5 } = await req.json();

    if (!business_id) {
      throw new Error('business_id is required');
    }

    // Get business info
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('subscription_tier, voice_credit_balance, voice_minutes_used_period, is_frozen')
      .eq('id', business_id)
      .single();

    if (businessError || !business) {
      throw new Error(`Business not found: ${businessError?.message}`);
    }

    // Check if account is frozen
    if (business.is_frozen) {
      return new Response(
        JSON.stringify({
          allowed: false,
          reason: 'account_frozen',
          message: 'Your account is frozen. Please contact support.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get pricing config
    const { data: pricingConfig, error: pricingError } = await supabase
      .from('voice_pricing_config')
      .select('*')
      .eq('tier', business.subscription_tier)
      .eq('is_active', true)
      .single();

    if (pricingError || !pricingConfig) {
      throw new Error(`Pricing config not found: ${pricingError?.message}`);
    }

    // Check if tier allows outbound calls
    if (direction === 'outbound' && !pricingConfig.can_make_outbound) {
      return new Response(
        JSON.stringify({
          allowed: false,
          reason: 'tier_restriction',
          message: 'Your current plan does not include outbound calling. Please upgrade.',
          upgradeRequired: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check plan limits
    const currentPeriodMinutes = business.voice_minutes_used_period || 0;
    const includedMinutes = direction === 'inbound' 
      ? pricingConfig.included_inbound_minutes 
      : pricingConfig.included_outbound_minutes;

    const remainingIncludedMinutes = Math.max(0, includedMinutes - currentPeriodMinutes);
    const withinPlanLimit = remainingIncludedMinutes >= estimated_duration_minutes;

    // Estimate cost if over plan limit
    let estimatedCostCents = 0;
    let estimatedCostMinutes = 0;

    if (!withinPlanLimit) {
      const overageMinutes = estimated_duration_minutes - remainingIncludedMinutes;
      const overageRate = direction === 'inbound' 
        ? pricingConfig.overage_inbound_cents 
        : pricingConfig.overage_outbound_cents;
      
      estimatedCostCents = Math.round(overageMinutes * overageRate);
      estimatedCostMinutes = Math.ceil(estimatedCostCents / 2); // Approximate conversion

      // Check if sufficient voice credits
      const currentCredits = business.voice_credit_balance || 0;
      
      if (currentCredits < estimatedCostMinutes) {
        return new Response(
          JSON.stringify({
            allowed: false,
            reason: 'insufficient_credits',
            message: `Insufficient voice credits. You have ${currentCredits} minutes, but need approximately ${estimatedCostMinutes} minutes for this call.`,
            currentCredits,
            requiredCredits: estimatedCostMinutes,
            deficit: estimatedCostMinutes - currentCredits,
            purchaseCreditsUrl: '/settings?tab=billing'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Call is allowed
    return new Response(
      JSON.stringify({
        allowed: true,
        withinPlanLimit,
        remainingIncludedMinutes,
        estimatedCostCents,
        estimatedCostMinutes,
        currentCredits: business.voice_credit_balance || 0,
        message: withinPlanLimit 
          ? `Call included in your plan. ${remainingIncludedMinutes} minutes remaining.`
          : `Call will cost approximately ${estimatedCostMinutes} voice credits (~$${(estimatedCostCents / 100).toFixed(2)}).`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error checking call credits:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
