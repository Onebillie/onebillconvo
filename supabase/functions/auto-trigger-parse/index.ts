import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This edge function listens for new pending attachment_parse_results
// and triggers the parse-attachment function
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all pending parse results
    const { data: pendingResults, error } = await supabase
      .from('attachment_parse_results')
      .select('*')
      .eq('parse_status', 'pending')
      .limit(10);

    if (error) {
      console.error('[AUTO-TRIGGER] Error fetching pending results:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pendingResults || pendingResults.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending attachments to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[AUTO-TRIGGER] Processing ${pendingResults.length} pending attachments`);

    // Trigger parse-attachment for each pending result
    const results = await Promise.allSettled(
      pendingResults.map(async (result) => {
        console.log(`[AUTO-TRIGGER] Triggering parse for attachment ${result.attachment_id}`);
        
        const { error: invokeError } = await supabase.functions.invoke('parse-attachment', {
          body: {
            attachmentId: result.attachment_id,
            messageId: result.message_id,
            forceReparse: false
          }
        });

        if (invokeError) {
          console.error(`[AUTO-TRIGGER] Failed to trigger parse for ${result.attachment_id}:`, invokeError);
          throw invokeError;
        }

        return result.attachment_id;
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`[AUTO-TRIGGER] Completed: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: pendingResults.length,
        successful,
        failed
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[AUTO-TRIGGER] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
