import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the incoming request - Twilio sends form data or query params
    const url = new URL(req.url);
    let toNumber = url.searchParams.get('To');
    
    // If not in query params, try form data
    if (!toNumber && req.method === 'POST') {
      const formData = await req.formData();
      toNumber = formData.get('To') as string;
    }

    if (!toNumber) {
      console.error('No To number provided');
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Invalid call parameters</Say></Response>', {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        status: 400,
      });
    }

    // Normalize the number to E.164 format
    toNumber = toNumber.trim().replace(/\s+/g, '');
    
    // Ensure E.164 format: +353...
    if (!toNumber.startsWith('+')) {
      if (toNumber.startsWith('353')) {
        toNumber = '+' + toNumber;
      } else if (toNumber.startsWith('0')) {
        toNumber = '+353' + toNumber.substring(1);
      } else {
        toNumber = '+353' + toNumber;
      }
    }
    
    console.log('Bridging call to (E.164):', toNumber);

    // Get Twilio settings for caller ID
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Try to get business-specific settings, fallback to env
    let callerId = Deno.env.get('TWILIO_PHONE_NUMBER') || '+12345678900';
    let recordingEnabled = Deno.env.get('RECORDING_ENABLED') === 'true';

    // Optional: fetch from call_settings if you want business-specific config
    // For now, we'll use env variables as fallback
    
    const statusCallbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/call-status-callback`;

    // Generate TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial 
    timeout="25" 
    callerId="${callerId}" 
    answerOnBridge="true"
    record="${recordingEnabled ? 'record-from-answer' : 'do-not-record'}"
    action="${statusCallbackUrl}"
    method="POST">
    <Number>${toNumber}</Number>
  </Dial>
</Response>`;

    console.log('Returning TwiML:', twiml);

    return new Response(twiml, {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Error in call-bridge:', error);
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>An error occurred. Please try again later.</Say>
</Response>`;

    return new Response(errorTwiml, {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      status: 500,
    });
  }
});
