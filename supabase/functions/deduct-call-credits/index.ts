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

    const { business_id, cost_cents, call_record_id, duration_minutes } = await req.json();

    if (!business_id || cost_cents === undefined) {
      throw new Error('business_id and cost_cents are required');
    }

    // Get current business balance
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('voice_credit_balance, subscription_tier, owner_id')
      .eq('id', business_id)
      .single();

    if (businessError || !business) {
      throw new Error(`Business not found: ${businessError?.message}`);
    }

    const currentBalance = business.voice_credit_balance || 0;
    const costInMinutes = Math.ceil(cost_cents / 2); // Approximate: $0.02/min avg

    // Check if sufficient credits
    if (currentBalance < costInMinutes) {
      // Insufficient credits - log warning but allow call (grace period)
      console.warn(`Insufficient voice credits for business ${business_id}: ${currentBalance} < ${costInMinutes}`);
      
      // Send low balance notification
      await supabase.functions.invoke('queue-notification', {
        body: {
          user_id: business.owner_id,
          type: 'billing',
          title: 'Voice Credits Depleted',
          message: `You have run out of voice calling credits. Purchase more to continue making calls.`,
          priority: 'high'
        }
      });

      return new Response(
        JSON.stringify({
          success: false,
          reason: 'insufficient_credits',
          currentBalance,
          requiredCredits: costInMinutes,
          deficit: costInMinutes - currentBalance
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduct credits
    const newBalance = currentBalance - costInMinutes;
    const { error: updateError } = await supabase
      .from('businesses')
      .update({ voice_credit_balance: newBalance })
      .eq('id', business_id);

    if (updateError) {
      throw new Error(`Failed to deduct credits: ${updateError.message}`);
    }

    // Log usage in voice_call_usage table
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    await supabase
      .from('voice_call_usage')
      .insert({
        business_id,
        call_record_id,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        total_cost_cents: cost_cents,
        credits_used: costInMinutes,
        credits_remaining: newBalance,
        within_plan_limit: false
      });

    // Check balance thresholds and send alerts
    const warningThreshold = 50; // 50 minutes
    const criticalThreshold = 10; // 10 minutes

    if (newBalance <= criticalThreshold && currentBalance > criticalThreshold) {
      await supabase.functions.invoke('queue-notification', {
        body: {
          user_id: business.owner_id,
          type: 'billing',
          title: 'Critical: Voice Credits Low',
          message: `Only ${newBalance} voice calling minutes remaining. Purchase more now to avoid service interruption.`,
          priority: 'urgent'
        }
      });
    } else if (newBalance <= warningThreshold && currentBalance > warningThreshold) {
      await supabase.functions.invoke('queue-notification', {
        body: {
          user_id: business.owner_id,
          type: 'billing',
          title: 'Voice Credits Running Low',
          message: `You have ${newBalance} voice calling minutes remaining. Consider purchasing more credits.`,
          priority: 'high'
        }
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        previousBalance: currentBalance,
        creditsDeducted: costInMinutes,
        newBalance,
        costCents: cost_cents
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error deducting call credits:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
