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

    const url = new URL(req.url);
    const messageId = url.searchParams.get('message_id');
    const campaignId = url.searchParams.get('campaign_id');
    const customerId = url.searchParams.get('customer_id');
    const ctaId = url.searchParams.get('cta_id');

    if (!messageId) {
      throw new Error('message_id is required');
    }

    console.log('Tracking CTA click:', { messageId, campaignId, customerId, ctaId });

    // Update message clicked_at
    await supabase
      .from('messages')
      .update({ 
        clicked_at: new Date().toISOString(),
        delivery_status: 'clicked'
      })
      .eq('id', messageId);

    // Log click event
    await supabase.from('message_logs').insert({
      message_id: messageId,
      event_type: 'clicked',
      status: 'success',
      platform: 'tracking',
      metadata: { cta_id: ctaId, referrer: req.headers.get('referer') }
    });

    // Update campaign recipient if applicable
    if (campaignId && customerId) {
      await supabase
        .from('campaign_recipients')
        .update({
          status: 'clicked',
          clicked_at: new Date().toISOString()
        })
        .eq('campaign_id', campaignId)
        .eq('customer_id', customerId);

      // Increment campaign clicked_count
      const { data: campaign } = await supabase
        .from('marketing_campaigns')
        .select('clicked_count')
        .eq('id', campaignId)
        .single();

      if (campaign) {
        await supabase
          .from('marketing_campaigns')
          .update({ clicked_count: (campaign.clicked_count || 0) + 1 })
          .eq('id', campaignId);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('CTA tracking error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
