import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { callId, signalType, signalData, targetUserId } = await req.json();

    if (!callId || !signalType || !targetUserId) {
      throw new Error('Missing required fields');
    }

    console.log(`Signal relay: ${signalType} for call ${callId}`);

    // Handle different signal types
    if (signalType === 'answer') {
      // Update call status to accepted
      const { error: updateError } = await supabase
        .from('staff_calls')
        .update({
          call_status: 'accepted',
          answered_at: new Date().toISOString()
        })
        .eq('id', callId);

      if (updateError) {
        console.error('Failed to update call status:', updateError);
      }
    } else if (signalType === 'reject') {
      // Update call status to rejected
      await supabase
        .from('staff_calls')
        .update({
          call_status: 'rejected',
          ended_at: new Date().toISOString()
        })
        .eq('id', callId);
    } else if (signalType === 'end') {
      // Calculate duration and update call
      const { data: call } = await supabase
        .from('staff_calls')
        .select('answered_at')
        .eq('id', callId)
        .single();

      let duration = 0;
      if (call?.answered_at) {
        duration = Math.floor((Date.now() - new Date(call.answered_at).getTime()) / 1000);
      }

      await supabase
        .from('staff_calls')
        .update({
          call_status: 'ended',
          ended_at: new Date().toISOString(),
          duration_seconds: duration
        })
        .eq('id', callId);
    }

    // Relay signal to target user via realtime
    const channel = supabase.channel(`staff-calls:${targetUserId}`);
    await channel.send({
      type: 'broadcast',
      event: 'call_signal',
      payload: {
        callId,
        signalType,
        signalData,
        fromUserId: user.id
      }
    });

    console.log(`Signal ${signalType} relayed to ${targetUserId}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error relaying signal:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
