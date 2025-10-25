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

    const { call_record_id } = await req.json();

    if (!call_record_id) {
      throw new Error('call_record_id is required');
    }

    // Get call record
    const { data: callRecord, error: callError } = await supabase
      .from('call_records')
      .select('*, businesses(subscription_tier, voice_minutes_used_period, voice_period_start, voice_period_end)')
      .eq('id', call_record_id)
      .single();

    if (callError || !callRecord) {
      throw new Error(`Call record not found: ${callError?.message}`);
    }

    // Get voice pricing config for tier
    const { data: pricingConfig, error: pricingError } = await supabase
      .from('voice_pricing_config')
      .select('*')
      .eq('tier', callRecord.businesses.subscription_tier)
      .eq('is_active', true)
      .single();

    if (pricingError || !pricingConfig) {
      throw new Error(`Pricing config not found: ${pricingError?.message}`);
    }

    // Calculate duration in minutes
    const durationMinutes = (callRecord.duration_seconds || 0) / 60;
    const direction = callRecord.direction; // 'inbound' or 'outbound'
    const callType = callRecord.from?.startsWith('+1800') || callRecord.from?.startsWith('+1888') || callRecord.from?.startsWith('+1877') || callRecord.from?.startsWith('+1866')
      ? 'tollfree' : 'local';

    // Calculate Twilio base costs (in cents)
    let twilioBaseCost = 0;
    let ourPriceCents = 0;

    if (direction === 'inbound') {
      if (callType === 'local') {
        twilioBaseCost = durationMinutes * pricingConfig.twilio_inbound_cost_cents;
        ourPriceCents = durationMinutes * pricingConfig.overage_inbound_cents;
      } else {
        twilioBaseCost = durationMinutes * 2.20; // $0.022/min for tollfree inbound
        ourPriceCents = durationMinutes * 4; // $0.04/min
      }
    } else if (direction === 'outbound') {
      twilioBaseCost = durationMinutes * pricingConfig.twilio_outbound_cost_cents;
      ourPriceCents = durationMinutes * pricingConfig.overage_outbound_cents;
    }

    // Add recording costs
    let recordingCost = 0;
    if (callRecord.recording_url && pricingConfig.can_record) {
      recordingCost = durationMinutes * pricingConfig.twilio_recording_cost_cents;
      // Add small markup for recording
      recordingCost += durationMinutes * 0.2; // $0.002/min markup
    }

    // Add transcription costs
    let transcriptionCost = 0;
    if (callRecord.transcript && pricingConfig.can_transcribe) {
      transcriptionCost = durationMinutes * pricingConfig.twilio_transcription_cost_cents;
      // Markup for transcription
      const transcriptionMarkup = (durationMinutes * pricingConfig.overage_transcription_cents) - transcriptionCost;
      transcriptionCost = durationMinutes * pricingConfig.overage_transcription_cents;
    }

    const totalTwilioCost = Math.round(twilioBaseCost + (recordingCost / 2) + (transcriptionCost / 1.6));
    const totalOurPrice = Math.round(ourPriceCents + (recordingCost / 2) + transcriptionCost);
    const ourMarkup = totalOurPrice - totalTwilioCost;

    // Check if within tier limits
    const currentPeriodMinutes = callRecord.businesses.voice_minutes_used_period || 0;
    const includedMinutes = direction === 'inbound' 
      ? pricingConfig.included_inbound_minutes 
      : pricingConfig.included_outbound_minutes;

    const withinPlanLimit = currentPeriodMinutes + durationMinutes <= includedMinutes;

    // Calculate billable amount
    const billableAmount = withinPlanLimit ? 0 : totalOurPrice;

    // Update call record with cost data
    const { error: updateError } = await supabase
      .from('call_records')
      .update({
        twilio_cost_cents: totalTwilioCost,
        billable_duration_seconds: callRecord.duration_seconds,
        recording_cost_cents: Math.round(recordingCost),
        transcription_cost_cents: Math.round(transcriptionCost),
        total_cost_cents: totalOurPrice,
        within_plan_limit: withinPlanLimit,
        charged_to_credits: !withinPlanLimit
      })
      .eq('id', call_record_id);

    if (updateError) {
      console.error('Error updating call record:', updateError);
    }

    // Update business voice minutes used
    if (withinPlanLimit) {
      await supabase
        .from('businesses')
        .update({
          voice_minutes_used_period: currentPeriodMinutes + durationMinutes
        })
        .eq('id', callRecord.business_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        callRecordId: call_record_id,
        durationMinutes: Math.round(durationMinutes * 100) / 100,
        twilioBaseCost: totalTwilioCost,
        ourMarkup,
        totalCost: totalOurPrice,
        billableAmount,
        withinPlanLimit,
        breakdown: {
          callCost: Math.round(twilioBaseCost),
          recordingCost: Math.round(recordingCost),
          transcriptionCost: Math.round(transcriptionCost),
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error calculating call cost:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
