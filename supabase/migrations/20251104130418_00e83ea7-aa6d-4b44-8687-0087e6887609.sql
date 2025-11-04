-- Create table to store attachment parse results
CREATE TABLE IF NOT EXISTS public.attachment_parse_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  attachment_id UUID NOT NULL,
  document_type TEXT,
  parse_status TEXT NOT NULL CHECK (parse_status IN ('pending', 'success', 'failed')),
  parsed_data JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attachment_parse_results ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view parse results for their business messages"
ON public.attachment_parse_results
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = attachment_parse_results.message_id
    AND m.business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- Create index for faster lookups
CREATE INDEX idx_attachment_parse_results_message_id ON public.attachment_parse_results(message_id);
CREATE INDEX idx_attachment_parse_results_attachment_id ON public.attachment_parse_results(attachment_id);

-- Add trigger for updated_at
CREATE TRIGGER update_attachment_parse_results_updated_at
  BEFORE UPDATE ON public.attachment_parse_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();