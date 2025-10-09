-- Add unique constraint to prevent duplicate messages by external ID
CREATE UNIQUE INDEX IF NOT EXISTS unique_external_message_id 
  ON messages(external_message_id) 
  WHERE external_message_id IS NOT NULL;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
  ON messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_external_id 
  ON messages(external_message_id) 
  WHERE external_message_id IS NOT NULL;

-- Add conversation pinning columns
ALTER TABLE conversations 
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

ALTER TABLE conversations 
  ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;

-- Add AI tracking to messages
ALTER TABLE messages 
  ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE;

ALTER TABLE messages 
  ADD COLUMN IF NOT EXISTS ai_confidence FLOAT;