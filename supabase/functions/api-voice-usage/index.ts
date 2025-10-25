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
      .select('business_id, businesses(subscription_tier)')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single();

    if (apiError || !apiAccess) {
      throw new Error('Invalid API key');
    }

    const url = new URL(req.url);
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');

    // Default to current month if no dates provided
    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get aggregated usage for the period
    const { data: usage, error: usageError } = await supabase
      .from('voice_call_usage')
      .select('*')
      .eq('business_id', apiAccess.business_id)
      .gte('period_start', start.toISOString())
      .lte('period_end', end.toISOString())
      .order('period_start', { ascending: false });

    if (usageError) {
      throw new Error(`Error fetching usage: ${usageError.message}`);
    }

    // Get pricing config
    const { data: pricing } = await supabase
      .from('voice_pricing_config')
      .select('*')
      .eq('tier', apiAccess.businesses.subscription_tier)
      .single();

    // Calculate totals
    const totals = usage?.reduce((acc, record) => ({
      inbound_minutes: acc.inbound_minutes + (record.inbound_minutes_local || 0) + (record.inbound_minutes_tollfree || 0),
      outbound_minutes: acc.outbound_minutes + (record.outbound_minutes_local || 0) + (record.outbound_minutes_tollfree || 0),
      recording_minutes: acc.recording_minutes + (record.recording_minutes || 0),
      transcription_minutes: acc.transcription_minutes + (record.transcription_minutes || 0),
      total_cost_cents: acc.total_cost_cents + (record.total_cost_cents || 0),
      overage_minutes: acc.overage_minutes + (record.overage_minutes || 0)
    }), {
      inbound_minutes: 0,
      outbound_minutes: 0,
      recording_minutes: 0,
      transcription_minutes: 0,
      total_cost_cents: 0,
      overage_minutes: 0
    });

    return new Response(
      JSON.stringify({
        success: true,
        period: {
          start: start.toISOString(),
          end: end.toISOString()
        },
        usage: totals,
        plan_limits: {
          included_inbound_minutes: pricing?.included_inbound_minutes || 0,
          included_outbound_minutes: pricing?.included_outbound_minutes || 0,
          included_transcription_minutes: pricing?.included_transcription_minutes || 0
        },
        details: usage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching voice usage:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
