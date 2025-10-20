-- Add metadata column to messages table for storing button click data
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;

-- Create GIN index for efficient button message queries
CREATE INDEX IF NOT EXISTS idx_messages_metadata_button 
ON messages USING GIN (metadata) 
WHERE metadata ? 'button_clicked';

-- Add comment
COMMENT ON COLUMN messages.metadata IS 'Stores additional message data like WhatsApp button clicks, interactive list selections, etc.';