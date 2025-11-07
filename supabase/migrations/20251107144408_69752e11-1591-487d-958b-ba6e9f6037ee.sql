-- Add retry management fields to onebill_submissions table
ALTER TABLE public.onebill_submissions
ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS retry_delay_seconds INTEGER,
ADD COLUMN IF NOT EXISTS manual_payload_override JSONB;

-- Create index on next_retry_at for efficient retry scheduling queries
CREATE INDEX IF NOT EXISTS idx_onebill_submissions_next_retry 
ON public.onebill_submissions(next_retry_at) 
WHERE submission_status = 'failed' AND next_retry_at IS NOT NULL;

-- Create index on submission_status for retry queries
CREATE INDEX IF NOT EXISTS idx_onebill_submissions_status_retry 
ON public.onebill_submissions(submission_status, retry_count, next_retry_at);