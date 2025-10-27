-- Optimize realtime updates for messages table
-- This ensures UPDATE events include full row data for instant sync across devices

ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Verify messages table is in realtime publication (should already be there)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

-- Also ensure message_attachments are in realtime for file sync
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'message_attachments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_attachments;
  END IF;
END $$;

-- Optimize message_attachments for realtime too
ALTER TABLE public.message_attachments REPLICA IDENTITY FULL;

-- Add helpful comment
COMMENT ON TABLE public.messages IS 'Messages table with full realtime replication for instant cross-device sync';