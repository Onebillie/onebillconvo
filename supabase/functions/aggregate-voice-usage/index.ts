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

    // Get date range (default to yesterday)
    const { start_date, end_date } = await req.json().catch(() => ({}));
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const startDate = start_date ? new Date(start_date) : yesterday;
    const endDate = end_date ? new Date(end_date) : new Date(yesterday.setHours(23, 59, 59, 999));

    console.log(`Aggregating voice usage from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Query all call records from the date range
    const { data: calls, error: callsError } = await supabase
      .from('call_records')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .eq('status', 'completed');

    if (callsError) {
      throw new Error(`Error fetching calls: ${callsError.message}`);
    }

    console.log(`Found ${calls?.length || 0} completed calls to aggregate`);

    if (!calls || calls.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No calls to aggregate', callsProcessed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group calls by business_id
    const businessCallMap = new Map<string, any[]>();
    
    for (const call of calls) {
      if (!businessCallMap.has(call.business_id)) {
        businessCallMap.set(call.business_id, []);
      }
      businessCallMap.get(call.business_id)!.push(call);
    }

    const aggregationResults = [];

    // Process each business
    for (const [businessId, businessCalls] of businessCallMap.entries()) {
      let inboundMinutesLocal = 0;
      let outboundMinutesLocal = 0;
      let inboundMinutesTollfree = 0;
      let outboundMinutesTollfree = 0;
      let recordingMinutes = 0;
      let transcriptionMinutes = 0;
      let twilioTotalCost = 0;
      let ourTotalMarkup = 0;
      let totalCost = 0;
      let overageMinutes = 0;

      for (const call of businessCalls) {
        const durationMinutes = (call.duration_seconds || 0) / 60;
        const isTollfree = call.from?.match(/\+1(800|888|877|866)/);

        if (call.direction === 'inbound') {
          if (isTollfree) {
            inboundMinutesTollfree += durationMinutes;
          } else {
            inboundMinutesLocal += durationMinutes;
          }
        } else if (call.direction === 'outbound') {
          if (isTollfree) {
            outboundMinutesTollfree += durationMinutes;
          } else {
            outboundMinutesLocal += durationMinutes;
          }
        }

        if (call.recording_url) {
          recordingMinutes += durationMinutes;
        }

        if (call.transcript) {
          transcriptionMinutes += durationMinutes;
        }

        twilioTotalCost += call.twilio_cost_cents || 0;
        totalCost += call.total_cost_cents || 0;

        if (!call.within_plan_limit) {
          overageMinutes += durationMinutes;
        }
      }

      ourTotalMarkup = totalCost - twilioTotalCost;

      // Determine period boundaries
      const periodStart = new Date(startDate);
      periodStart.setDate(1);
      periodStart.setHours(0, 0, 0, 0);

      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      periodEnd.setDate(0);
      periodEnd.setHours(23, 59, 59, 999);

      // Insert or update aggregated usage
      const { error: insertError } = await supabase
        .from('voice_call_usage')
        .upsert({
          business_id: businessId,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          inbound_minutes_local: inboundMinutesLocal,
          outbound_minutes_local: outboundMinutesLocal,
          inbound_minutes_tollfree: inboundMinutesTollfree,
          outbound_minutes_tollfree: outboundMinutesTollfree,
          recording_minutes: recordingMinutes,
          transcription_minutes: transcriptionMinutes,
          twilio_cost_cents: Math.round(twilioTotalCost),
          our_markup_cents: Math.round(ourTotalMarkup),
          total_cost_cents: Math.round(totalCost),
          overage_minutes: overageMinutes,
          within_plan_limit: overageMinutes === 0
        }, {
          onConflict: 'business_id,period_start'
        });

      if (insertError) {
        console.error(`Error aggregating for business ${businessId}:`, insertError);
      } else {
        aggregationResults.push({
          businessId,
          callsProcessed: businessCalls.length,
          totalMinutes: inboundMinutesLocal + outboundMinutesLocal + inboundMinutesTollfree + outboundMinutesTollfree,
          totalCostCents: Math.round(totalCost)
        });
      }
    }

    console.log(`Aggregation complete: ${aggregationResults.length} businesses processed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Aggregated usage for ${aggregationResults.length} businesses`,
        callsProcessed: calls.length,
        results: aggregationResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error aggregating voice usage:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
