import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { attachmentId, parsedData } = await req.json();

    if (!attachmentId || !parsedData) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: attachmentId and parsedData' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the OneBill API configuration from environment or database
    const ONEBILL_API_URL = Deno.env.get('ONEBILL_API_URL');
    const ONEBILL_API_KEY = Deno.env.get('ONEBILL_API_KEY');

    if (!ONEBILL_API_URL) {
      console.warn('OneBill API URL not configured');
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'OneBill API not configured',
          parsedData 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare the payload for OneBill
    const payload = {
      attachmentId,
      timestamp: new Date().toISOString(),
      data: parsedData,
    };

    console.log('Sending to OneBill API:', ONEBILL_API_URL);

    // Send to OneBill API
    const response = await fetch(ONEBILL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ONEBILL_API_KEY ? { 'Authorization': `Bearer ${ONEBILL_API_KEY}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('OneBill API error:', response.status, responseData);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'OneBill API request failed',
          status: response.status,
          details: responseData 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update attachment with OneBill response
    await supabaseClient
      .from('message_attachments')
      .update({ 
        onebill_submitted: true,
        onebill_response: responseData,
        onebill_submitted_at: new Date().toISOString()
      })
      .eq('id', attachmentId);

    console.log('Successfully sent to OneBill');

    return new Response(
      JSON.stringify({ 
        success: true,
        onebillResponse: responseData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in onebill-submit:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
