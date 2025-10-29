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

    const { callSid, targetStaffUserId, transferType = 'cold', notes } = await req.json();

    if (!callSid || !targetStaffUserId) {
      throw new Error('Missing required fields');
    }

    console.log(`Transferring call ${callSid} to staff ${targetStaffUserId}`);

    // Get target staff's Twilio client identity
    const { data: targetProfile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', targetStaffUserId)
      .single();

    if (profileError || !targetProfile) {
      throw new Error('Target staff member not found');
    }

    // Get call settings for Twilio credentials
    const { data: callSettings, error: settingsError } = await supabase
      .from('call_settings')
      .select('twilio_phone_number, twilio_account_sid, twilio_auth_token')
      .limit(1)
      .single();

    if (settingsError || !callSettings) {
      throw new Error('Twilio credentials not configured');
    }

    const twilioAccountSid = callSettings.twilio_account_sid;
    const twilioAuthToken = callSettings.twilio_auth_token;
    
    if (!twilioAccountSid || !twilioAuthToken) {
      throw new Error('Twilio credentials missing');
    }

    // Create Twilio client identity for target staff
    const targetClientIdentity = `staff_${targetStaffUserId}`;

    // Update call via Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls/${callSid}.json`;
    
    let twimlUrl: string;
    if (transferType === 'warm') {
      // Warm transfer - put caller on hold, dial target, then connect
      twimlUrl = `data:text/xml,${encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say>Transferring you now.</Say>
          <Dial>
            <Client>${targetClientIdentity}</Client>
          </Dial>
        </Response>`)}`;
    } else {
      // Cold transfer - directly connect to target
      twimlUrl = `data:text/xml,${encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Dial>
            <Client>${targetClientIdentity}</Client>
          </Dial>
        </Response>`)}`;
    }

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        Url: twimlUrl,
      }),
    });

    if (!twilioResponse.ok) {
      const error = await twilioResponse.text();
      console.error('Twilio API error:', error);
      throw new Error(`Twilio transfer failed: ${error}`);
    }

    // Update call record
    const { error: updateError } = await supabase
      .from('call_records')
      .update({
        metadata: {
          transferred_to: targetStaffUserId,
          transferred_at: new Date().toISOString(),
          transfer_type: transferType,
          transfer_notes: notes
        }
      })
      .eq('call_sid', callSid);

    if (updateError) {
      console.error('Failed to update call record:', updateError);
    }

    // Send InMail notification to receiving staff
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    await supabase
      .from('internal_messages')
      .insert({
        sender_id: user.id,
        recipient_id: targetStaffUserId,
        subject: 'Incoming Call Transfer',
        content: `${senderProfile?.full_name || 'A team member'} is transferring a call to you${notes ? `\n\nNotes: ${notes}` : ''}`,
        message_type: 'task_reminder',
        priority: 'high',
        metadata: { call_sid: callSid, transfer_type: transferType }
      });

    console.log(`Call ${callSid} transferred successfully`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error transferring call:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
