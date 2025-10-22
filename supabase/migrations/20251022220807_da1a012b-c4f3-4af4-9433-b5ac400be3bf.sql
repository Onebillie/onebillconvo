-- Enable realtime for conversation_statuses table to get instant status tag updates
ALTER TABLE public.conversation_statuses REPLICA IDENTITY FULL;

-- Add to realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'conversation_statuses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_statuses;
  END IF;
END $$;