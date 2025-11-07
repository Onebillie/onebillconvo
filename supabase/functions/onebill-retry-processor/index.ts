import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 OneBill Retry Processor - Starting...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Query for submissions that need retry
    // Conditions: status='failed', retry_count < max_retries, (next_retry_at <= NOW() OR next_retry_at IS NULL)
    const now = new Date().toISOString();
    const { data: submissionsToRetry, error: queryError } = await supabase
      .from('onebill_submissions')
      .select('*')
      .eq('submission_status', 'failed')
      .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
      .limit(50); // Process up to 50 submissions per run

    if (queryError) {
      console.error('Error querying submissions:', queryError);
      throw queryError;
    }

    if (!submissionsToRetry || submissionsToRetry.length === 0) {
      console.log('✅ No submissions need retry at this time');
      return new Response(
        JSON.stringify({ message: 'No submissions to retry', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${submissionsToRetry.length} submissions to retry`);

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      maxRetriesReached: 0,
    };

    // Process each submission
    for (const submission of submissionsToRetry) {
      const retryCount = submission.retry_count || 0;
      const maxRetries = submission.max_retries || 3;

      // Check if max retries exceeded
      if (retryCount >= maxRetries) {
        console.log(`⚠️ Submission ${submission.id} has reached max retries (${maxRetries})`);
        results.maxRetriesReached++;
        continue;
      }

      console.log(`🔄 Processing retry ${retryCount + 1}/${maxRetries} for submission ${submission.id}`);

      try {
        // Update status to 'retrying'
        await supabase
          .from('onebill_submissions')
          .update({
            submission_status: 'retrying',
            last_retry_at: new Date().toISOString(),
          })
          .eq('id', submission.id);

        // Prepare payload - use manual override if exists, otherwise use submission fields
        let fields;
        if (submission.manual_payload_override) {
          console.log('Using manual payload override:', submission.manual_payload_override);
          fields = submission.manual_payload_override;
        } else {
          fields = {
            phone: submission.phone,
            ...(submission.mprn && { MPRN: submission.mprn }),
            ...(submission.mcc_type && { MCC: submission.mcc_type }),
            ...(submission.dg_type && { DG: submission.dg_type }),
            ...(submission.gprn && { gprn: submission.gprn }),
            ...(submission.utility && { utility: submission.utility }),
            ...(submission.read_value && { read_value: submission.read_value }),
          };
        }

        // Call onebill-submit function
        const { data: submitData, error: submitError } = await supabase.functions.invoke(
          'onebill-submit',
          {
            body: {
              submissionId: submission.id,
              fields,
              fileUrl: submission.file_url,
              fileName: submission.file_name,
              documentType: submission.document_type,
            },
          }
        );

        if (submitError || !submitData?.success) {
          throw new Error(submitError?.message || submitData?.error || 'Submission failed');
        }

        console.log(`✅ Retry successful for submission ${submission.id}`);
        results.successful++;
      } catch (error) {
        console.error(`❌ Retry failed for submission ${submission.id}:`, error);

        // Calculate exponential backoff for next retry
        const newRetryCount = retryCount + 1;
        const shouldRetry = newRetryCount < maxRetries;
        
        let nextRetryAt = null;
        let retryDelaySeconds = null;

        if (shouldRetry) {
          // Exponential backoff: 2^retry_count * 60 seconds
          retryDelaySeconds = Math.pow(2, newRetryCount) * 60;
          nextRetryAt = new Date(Date.now() + retryDelaySeconds * 1000).toISOString();
          console.log(`⏰ Next retry scheduled for ${nextRetryAt} (in ${retryDelaySeconds}s)`);
        } else {
          console.log(`⛔ Max retries reached for submission ${submission.id}`);
        }

        // Update submission with retry info
        await supabase
          .from('onebill_submissions')
          .update({
            submission_status: 'failed',
            retry_count: newRetryCount,
            next_retry_at: nextRetryAt,
            retry_delay_seconds: retryDelaySeconds,
            error_message: error instanceof Error ? error.message : String(error),
          })
          .eq('id', submission.id);

        results.failed++;
      }

      results.processed++;
    }

    console.log('📊 Retry processing complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Retry processing complete',
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Fatal error in retry processor:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
