import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse Twilio's form-encoded webhook data
    const formData = await req.formData();
    const callSid = formData.get('CallSid') as string;
    const transcriptionText = formData.get('TranscriptionText') as string;
    const transcriptionStatus = formData.get('TranscriptionStatus') as string;
    const transcriptionUrl = formData.get('TranscriptionUrl') as string;

    console.log('Transcription callback received:', {
      callSid,
      status: transcriptionStatus,
      textLength: transcriptionText?.length || 0
    });

    if (!callSid) {
      throw new Error('CallSid is required');
    }

    // Find the call record
    const { data: callRecord, error: findError } = await supabase
      .from('call_records')
      .select('id, business_id')
      .eq('call_sid', callSid)
      .single();

    if (findError || !callRecord) {
      console.error('Call record not found:', findError);
      throw new Error(`Call record not found for SID: ${callSid}`);
    }

    // Update call record with transcript
    if (transcriptionStatus === 'completed' && transcriptionText) {
      const { error: updateError } = await supabase
        .from('call_records')
        .update({
          transcript: transcriptionText,
          transcript_url: transcriptionUrl
        })
        .eq('id', callRecord.id);

      if (updateError) {
        console.error('Error updating transcript:', updateError);
        throw new Error(`Failed to update transcript: ${updateError.message}`);
      }

      console.log(`Transcript saved for call ${callRecord.id}`);

      // Queue notification for business owner about new transcript
      const { data: business } = await supabase
        .from('businesses')
        .select('owner_id')
        .eq('id', callRecord.business_id)
        .single();

      if (business?.owner_id) {
        await supabase.functions.invoke('queue-notification', {
          body: {
            user_id: business.owner_id,
            type: 'info',
            title: 'Call Transcript Available',
            message: `A new call transcript is now available for review.`,
            link_url: `/app/dashboard?call=${callRecord.id}`
          }
        });
      }
    } else if (transcriptionStatus === 'failed') {
      console.error('Transcription failed for call:', callSid);
      
      await supabase
        .from('call_records')
        .update({
          transcript: 'Transcription failed',
          transcript_url: null
        })
        .eq('id', callRecord.id);
    }

    // Return TwiML response
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/xml'
        }
      }
    );

  } catch (error) {
    console.error('Error processing transcription callback:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
