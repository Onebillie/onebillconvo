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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { to, from, mode = 'browser' } = await req.json();

    if (!to) {
      return new Response(JSON.stringify({ error: 'Missing destination number' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get business
    const { data: businessUser } = await supabase
      .from('business_users')
      .select('business_id, businesses(name)')
      .eq('user_id', user.id)
      .single();

    if (!businessUser) {
      return new Response(JSON.stringify({ error: 'No business found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get Twilio credentials from call_settings
    const { data: settings } = await supabase
      .from('call_settings')
      .select('twilio_account_sid, twilio_auth_token')
      .eq('business_id', businessUser.business_id)
      .single();

    let accountSid = settings?.twilio_account_sid;
    let authToken = settings?.twilio_auth_token;

    // Fallback to environment variables
    if (!accountSid) {
      accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    }

    if (!accountSid || !authToken) {
      return new Response(JSON.stringify({ 
        error: 'Twilio not configured',
        message: 'Please configure Twilio credentials to make calls'
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create call via Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;
    
    const formData = new URLSearchParams();
    formData.append('To', to);
    formData.append('From', from || Deno.env.get('TWILIO_PHONE_NUMBER') || '');
    
    if (mode === 'browser') {
      formData.append('Twiml', `<Response><Dial><Client>${user.id}</Client></Dial></Response>`);
    } else {
      // Call back to agent's phone
      formData.append('Url', `${Deno.env.get('SUPABASE_URL')}/functions/v1/call-bridge?to=${to}`);
    }

    formData.append('StatusCallback', `${Deno.env.get('SUPABASE_URL')}/functions/v1/call-status-callback`);
    formData.append('StatusCallbackEvent', 'initiated ringing answered completed');

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });

    const callData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error('Twilio error:', callData);
      return new Response(JSON.stringify({ error: callData.message }), {
        status: twilioResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create call record
    const { data: callRecord } = await supabase
      .from('call_records')
      .insert({
        business_id: businessUser.business_id,
        twilio_call_sid: callData.sid,
        direction: 'outbound',
        from_number: from,
        to_number: to,
        status: 'initiated',
        agent_id: user.id,
        metadata: { mode }
      })
      .select()
      .single();

    // Update agent availability
    await supabase
      .from('agent_availability')
      .update({ current_call_sid: callData.sid })
      .eq('user_id', user.id);

    return new Response(JSON.stringify({ 
      success: true,
      call: callRecord,
      twilio_sid: callData.sid
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error initiating outbound call:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
