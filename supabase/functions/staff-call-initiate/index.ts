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

    const { calleeId, businessId, offer } = await req.json();

    if (!calleeId || !businessId) {
      throw new Error('Missing required fields');
    }

    console.log(`Call initiation: ${user.id} -> ${calleeId}`);

    // Create call record
    const { data: call, error: callError } = await supabase
      .from('staff_calls')
      .insert({
        business_id: businessId,
        caller_id: user.id,
        callee_id: calleeId,
        call_status: 'ringing',
        metadata: { offer }
      })
      .select()
      .single();

    if (callError) {
      console.error('Call creation error:', callError);
      throw callError;
    }

    // Get caller profile
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single();

    // Send realtime notification to callee via channel
    const channel = supabase.channel(`staff-calls:${calleeId}`);
    await channel.send({
      type: 'broadcast',
      event: 'incoming_call',
      payload: {
        callId: call.id,
        callerId: user.id,
        callerName: callerProfile?.full_name || 'Unknown',
        callerAvatar: callerProfile?.avatar_url,
        offer
      }
    });

    console.log(`Call ${call.id} created and notification sent`);

    return new Response(
      JSON.stringify({ success: true, call }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error initiating call:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
