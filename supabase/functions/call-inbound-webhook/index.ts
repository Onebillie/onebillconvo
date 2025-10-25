import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const callSid = formData.get('CallSid') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callStatus = formData.get('CallStatus') as string;

    console.log('Inbound call:', { callSid, from, to, callStatus });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find business by phone number
    const { data: business } = await supabase
      .from('businesses')
      .select('id, name')
      .ilike('name', '%OneBill%')
      .single();

    if (!business) {
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say>Sorry, this number is not configured.</Say>
          <Hangup/>
        </Response>`,
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // Get call settings (includes Twilio credentials)
    const { data: settings } = await supabase
      .from('call_settings')
      .select('*')
      .eq('business_id', business.id)
      .single();

    // Note: Twilio credentials are now stored in call_settings
    // They can be used here if needed for advanced call routing

    // Check business hours if configured
    const now = new Date();
    const currentHour = now.getHours();
    const isWithinHours = !settings?.business_hours_start || 
      (currentHour >= parseInt(settings.business_hours_start.split(':')[0]) && 
       currentHour < parseInt(settings.business_hours_end.split(':')[0]));

    // Create call record
    await supabase
      .from('call_records')
      .insert({
        business_id: business.id,
        twilio_call_sid: callSid,
        direction: 'inbound',
        from_number: from,
        to_number: to,
        status: 'ringing',
        metadata: { initial_status: callStatus }
      });

    // Log event
    await supabase
      .from('call_events')
      .insert({
        call_sid: callSid,
        event_type: 'ringing',
        event_data: { from, to, callStatus }
      });

    // Check for recording consent requirement
    let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>`;

    if (settings?.recording_enabled && settings?.require_consent) {
      twiml += `<Say>This call may be recorded for quality and training purposes.</Say>`;
    }

    if (!isWithinHours) {
      // After hours - voicemail
      twiml += `<Say>Thank you for calling. We are currently closed. Please leave a message after the beep.</Say>
        <Record maxLength="300" transcribe="true" transcribeCallback="/functions/v1/call-transcription-callback"/>
        <Say>Thank you. Goodbye.</Say>
        <Hangup/>`;
    } else {
      // Find available agent
      const { data: agents } = await supabase
        .from('agent_availability')
        .select('user_id, profiles(full_name)')
        .eq('status', 'available')
        .is('current_call_sid', null)
        .limit(1);

      if (agents && agents.length > 0) {
        const agent = agents[0];
        // Ring the agent's device
        twiml += `<Dial timeout="30" action="/functions/v1/call-status-callback">
          <Client>${agent.user_id}</Client>
        </Dial>
        <Say>Sorry, no agents are available. Please leave a message.</Say>
        <Record maxLength="300" transcribe="true"/>`;
      } else {
        // No agents available - queue or voicemail
        twiml += `<Say>All agents are currently busy. Please hold.</Say>
          <Enqueue waitUrl="/functions/v1/call-queue-music">support</Enqueue>`;
      }
    }

    twiml += `</Response>`;

    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' }
    });

  } catch (error) {
    console.error('Error handling inbound call:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>Sorry, an error occurred. Please try again later.</Say>
        <Hangup/>
      </Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }
});
