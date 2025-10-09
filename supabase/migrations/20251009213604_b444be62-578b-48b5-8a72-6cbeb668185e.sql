-- Add indexes for conversation and message search performance
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_status_tag_id ON conversations(status_tag_id) WHERE status_tag_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_assigned_to ON conversations(assigned_to) WHERE assigned_to IS NOT NULL;

-- Full text search indexes for message and customer search
CREATE INDEX IF NOT EXISTS idx_messages_content_search ON messages USING gin(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_customers_name_search ON customers USING gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(first_name, '') || ' ' || coalesce(last_name, '')));

-- Index for filtering by platform
CREATE INDEX IF NOT EXISTS idx_messages_platform ON messages(platform);