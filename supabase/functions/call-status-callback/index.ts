import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

Deno.serve(async (req) => {
  try {
    const formData = await req.formData();
    const callSid = formData.get('CallSid') as string;
    const callStatus = formData.get('CallStatus') as string;
    const duration = formData.get('CallDuration') as string;
    const recordingUrl = formData.get('RecordingUrl') as string;

    console.log('Call status callback:', { callSid, callStatus, duration });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Update call record
    const updateData: any = { status: callStatus };
    
    if (callStatus === 'completed' || callStatus === 'failed' || callStatus === 'no-answer') {
      updateData.ended_at = new Date().toISOString();
      if (duration) {
        updateData.duration_seconds = parseInt(duration);
      }
    }

    if (recordingUrl) {
      updateData.recording_url = recordingUrl;
    }

    const { data: callRecord } = await supabase
      .from('call_records')
      .update(updateData)
      .eq('twilio_call_sid', callSid)
      .select('*, businesses(id, name)')
      .single();

    // Log event
    await supabase
      .from('call_events')
      .insert({
        call_sid: callSid,
        event_type: callStatus,
        event_data: { duration, recordingUrl }
      });

    // Clear agent's current call if completed
    if (callStatus === 'completed' && callRecord?.agent_id) {
      await supabase
        .from('agent_availability')
        .update({ current_call_sid: null })
        .eq('user_id', callRecord.agent_id);
    }

    // Send webhook to CRM if configured
    if (callRecord?.businesses) {
      const { data: settings } = await supabase
        .from('call_settings')
        .select('crm_webhook_url, crm_webhook_token')
        .eq('business_id', callRecord.businesses.id)
        .single();

      if (settings?.crm_webhook_url) {
        const webhookPayload = {
          event: 'call.status',
          call_id: callRecord.id,
          call_sid: callSid,
          status: callStatus,
          direction: callRecord.direction,
          from: callRecord.from_number,
          to: callRecord.to_number,
          duration: duration ? parseInt(duration) : null,
          timestamp: new Date().toISOString()
        };

        try {
          await fetch(settings.crm_webhook_url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${settings.crm_webhook_token || ''}`
            },
            body: JSON.stringify(webhookPayload)
          });
        } catch (webhookError) {
          console.error('CRM webhook error:', webhookError);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in call status callback:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
