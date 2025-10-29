-- Ensure conversations update promptly when new messages arrive
DROP TRIGGER IF EXISTS trg_update_conversation_last_message ON public.messages;
CREATE TRIGGER trg_update_conversation_last_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_last_message();

-- Performance indexes for fast loading and consistent ordering
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at
  ON public.messages (conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id
  ON public.message_attachments (message_id);
