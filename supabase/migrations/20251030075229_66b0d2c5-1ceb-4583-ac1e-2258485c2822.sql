-- Add conversation_starters field to widget_customization
ALTER TABLE widget_customization 
ADD COLUMN IF NOT EXISTS conversation_starters JSONB DEFAULT '[]';

-- Add last_presence_at to track session activity
ALTER TABLE embed_sessions
ADD COLUMN IF NOT EXISTS last_presence_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for faster presence lookups
CREATE INDEX IF NOT EXISTS idx_embed_sessions_last_presence 
ON embed_sessions(last_presence_at);