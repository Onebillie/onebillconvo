-- Add message audit trail and action tracking fields
ALTER TABLE public.messages 
  ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS edited_by UUID,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS deleted_by UUID,
  ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS starred_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS starred_by UUID,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS pinned_by UUID,
  ADD COLUMN IF NOT EXISTS forwarded_from UUID REFERENCES public.messages(id),
  ADD COLUMN IF NOT EXISTS original_content TEXT;

-- Create index for better query performance on starred and pinned messages
CREATE INDEX IF NOT EXISTS idx_messages_starred ON public.messages(is_starred) WHERE is_starred = TRUE;
CREATE INDEX IF NOT EXISTS idx_messages_pinned ON public.messages(is_pinned) WHERE is_pinned = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN public.messages.is_edited IS 'Tracks if message was edited';
COMMENT ON COLUMN public.messages.is_deleted IS 'Soft delete flag';
COMMENT ON COLUMN public.messages.is_starred IS 'Message starred by user';
COMMENT ON COLUMN public.messages.is_pinned IS 'Message pinned in conversation';
COMMENT ON COLUMN public.messages.original_content IS 'Original content before edit for audit trail';