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

    // Verify API key
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

    const url = new URL(req.url);
    const callId = url.searchParams.get('call_id');

    if (!callId) {
      return new Response(JSON.stringify({ error: 'call_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get call with recording
    const { data: call, error: callError } = await supabase
      .from('call_records')
      .select('id, recording_url, recording_sid, voicemail_url, business_id')
      .eq('id', callId)
      .eq('business_id', apiKeyData.business_id)
      .single();

    if (callError) throw callError;

    if (!call) {
      return new Response(JSON.stringify({ error: 'Call not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!call.recording_url && !call.voicemail_url) {
      return new Response(JSON.stringify({ error: 'No recording available' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate short-lived signed URL (1 hour expiry)
    const recordingUrl = call.recording_url || call.voicemail_url;
    const expiresAt = new Date(Date.now() + 3600000).toISOString();

    return new Response(JSON.stringify({
      success: true,
      recording_url: recordingUrl,
      expires_at: expiresAt,
      call_id: call.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching recording:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
