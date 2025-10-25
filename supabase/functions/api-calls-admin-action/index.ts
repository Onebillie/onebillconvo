import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify API key has admin permissions
    const { data: apiKeyData } = await supabase
      .from('api_keys')
      .select('business_id, permissions')
      .eq('key_hash', apiKey)
      .eq('is_active', true)
      .single();

    if (!apiKeyData) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { call_sid, action, supervisor_id } = body;

    if (!call_sid || !action) {
      return new Response(JSON.stringify({ error: 'call_sid and action are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get call record
    const { data: call } = await supabase
      .from('call_records')
      .select('*')
      .eq('twilio_call_sid', call_sid)
      .eq('business_id', apiKeyData.business_id)
      .single();

    if (!call) {
      return new Response(JSON.stringify({ error: 'Call not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');

    if (!accountSid || !authToken) {
      return new Response(JSON.stringify({ error: 'Twilio not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const auth = btoa(`${accountSid}:${authToken}`);
    let twilioResponse;

    // Handle different admin actions
    switch (action) {
      case 'monitor':
        // Silent monitoring - supervisor can listen but not speak
        twilioResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              'Twiml': `<Response><Dial><Conference beep="false" statusCallback="${Deno.env.get('SUPABASE_URL')}/functions/v1/call-status-callback">${call_sid}</Conference></Dial></Response>`,
              'To': supervisor_id,
              'From': call.from_number,
            }),
          }
        );
        break;

      case 'barge':
        // Barge-in - supervisor can speak to both parties
        twilioResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${call_sid}.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              'Twiml': `<Response><Dial><Conference coach="${supervisor_id}">${call_sid}</Conference></Dial></Response>`,
            }),
          }
        );
        break;

      case 'whisper':
        // Whisper - supervisor can speak only to agent
        twilioResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${call_sid}.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              'Twiml': `<Response><Dial><Conference coach="${supervisor_id}" muted="true">${call_sid}</Conference></Dial></Response>`,
            }),
          }
        );
        break;

      case 'disconnect':
        // End the call
        twilioResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${call_sid}.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              'Status': 'completed',
            }),
          }
        );
        break;

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    if (!twilioResponse?.ok) {
      throw new Error('Failed to perform admin action');
    }

    // Log the admin action
    await supabase.from('call_events').insert({
      call_record_id: call.id,
      event_type: `admin_${action}`,
      event_data: { supervisor_id, action }
    });

    return new Response(JSON.stringify({
      success: true,
      action,
      call_sid
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error performing admin action:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
