-- Create junction table for conversation multiple statuses
CREATE TABLE IF NOT EXISTS public.conversation_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  status_tag_id uuid REFERENCES public.conversation_status_tags(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(conversation_id, status_tag_id)
);

-- Enable RLS
ALTER TABLE public.conversation_statuses ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can manage conversation statuses"
ON public.conversation_statuses
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for better performance
CREATE INDEX idx_conversation_statuses_conversation ON public.conversation_statuses(conversation_id);
CREATE INDEX idx_conversation_statuses_status_tag ON public.conversation_statuses(status_tag_id);