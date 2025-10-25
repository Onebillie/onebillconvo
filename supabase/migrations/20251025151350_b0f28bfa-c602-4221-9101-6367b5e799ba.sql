-- Add priority field to conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 3;

-- Add priority field to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 3;

-- Add metadata field to conversations if not exists
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add metadata field to messages if not exists
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add index for faster priority sorting
CREATE INDEX IF NOT EXISTS idx_conversations_priority 
ON conversations(business_id, priority DESC, created_at DESC);

-- Create customer merge suggestions table
CREATE TABLE IF NOT EXISTS customer_merge_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_ids UUID[] NOT NULL,
  match_type TEXT NOT NULL,
  match_value TEXT,
  status TEXT DEFAULT 'pending',
  created_via TEXT,
  priority TEXT DEFAULT 'medium',
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for customer_merge_suggestions
ALTER TABLE customer_merge_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view merge suggestions for their business"
ON customer_merge_suggestions FOR SELECT
USING (
  business_id IN (
    SELECT business_id FROM business_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update merge suggestions for their business"
ON customer_merge_suggestions FOR UPDATE
USING (
  business_id IN (
    SELECT business_id FROM business_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert merge suggestions for their business"
ON customer_merge_suggestions FOR INSERT
WITH CHECK (
  business_id IN (
    SELECT business_id FROM business_users WHERE user_id = auth.uid()
  )
);