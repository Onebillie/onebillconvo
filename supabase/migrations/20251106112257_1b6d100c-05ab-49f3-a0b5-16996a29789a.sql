-- Add attachment_id column to onebill_submissions table to directly link submissions to attachments
ALTER TABLE public.onebill_submissions 
  ADD COLUMN IF NOT EXISTS attachment_id UUID REFERENCES public.message_attachments(id);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_onebill_submissions_attachment_id 
  ON public.onebill_submissions(attachment_id);

-- Add comment explaining the column
COMMENT ON COLUMN public.onebill_submissions.attachment_id IS 'Links submission to original message attachment, regardless of URL transformations (PDF to PNG conversion, etc)';