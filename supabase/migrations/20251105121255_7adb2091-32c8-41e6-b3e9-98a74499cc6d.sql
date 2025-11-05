-- Add columns to message_attachments for storing parsed data and OneBill submission info
ALTER TABLE public.message_attachments 
ADD COLUMN IF NOT EXISTS parsed_data JSONB,
ADD COLUMN IF NOT EXISTS parsed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS onebill_submitted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onebill_response JSONB,
ADD COLUMN IF NOT EXISTS onebill_submitted_at TIMESTAMP WITH TIME ZONE;

-- Add index for faster queries on parsed attachments
CREATE INDEX IF NOT EXISTS idx_message_attachments_parsed 
ON public.message_attachments(parsed_at) 
WHERE parsed_data IS NOT NULL;

-- Add index for OneBill submitted attachments
CREATE INDEX IF NOT EXISTS idx_message_attachments_onebill 
ON public.message_attachments(onebill_submitted_at) 
WHERE onebill_submitted = TRUE;