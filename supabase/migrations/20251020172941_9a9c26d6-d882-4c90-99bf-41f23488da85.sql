-- Add pricing configuration to businesses table
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS pricing_model TEXT DEFAULT 'per_message' CHECK (pricing_model IN ('per_message', 'per_resolution')),
ADD COLUMN IF NOT EXISTS price_per_message DECIMAL(10,4) DEFAULT 0.05,
ADD COLUMN IF NOT EXISTS price_per_resolution DECIMAL(10,4) DEFAULT 2.00,
ADD COLUMN IF NOT EXISTS monthly_base_fee DECIMAL(10,2) DEFAULT 0.00;

-- Add resolution tracking to conversations
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS resolution_type TEXT CHECK (resolution_type IN ('sold', 'closed', 'transferred', 'abandoned')),
ADD COLUMN IF NOT EXISTS resolution_value DECIMAL(10,2);

-- Create embed tokens table for widget authentication
CREATE TABLE IF NOT EXISTS embed_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  allowed_domains TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0
);

-- Create index for embed tokens
CREATE INDEX IF NOT EXISTS idx_embed_tokens_business ON embed_tokens(business_id);
CREATE INDEX IF NOT EXISTS idx_embed_tokens_token ON embed_tokens(token);

-- Create billing usage tracking table
CREATE TABLE IF NOT EXISTS billing_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  messages_sent INTEGER DEFAULT 0,
  conversations_resolved INTEGER DEFAULT 0,
  total_charge DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_usage_business ON billing_usage(business_id);
CREATE INDEX IF NOT EXISTS idx_billing_usage_period ON billing_usage(period_start, period_end);

-- Enable RLS
ALTER TABLE embed_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for embed_tokens
CREATE POLICY "Business owners can manage their embed tokens"
ON embed_tokens FOR ALL
USING (
  business_id IN (
    SELECT business_id FROM business_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Service role can access embed tokens"
ON embed_tokens FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- RLS Policies for billing_usage
CREATE POLICY "Business owners can view their billing usage"
ON billing_usage FOR SELECT
USING (
  business_id IN (
    SELECT business_id FROM business_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage billing usage"
ON billing_usage FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- Function to mark conversation as resolved
CREATE OR REPLACE FUNCTION mark_conversation_resolved(
  _conversation_id UUID,
  _resolution_type TEXT,
  _resolution_value DECIMAL DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE conversations
  SET 
    resolved_at = now(),
    resolution_type = _resolution_type,
    resolution_value = _resolution_value,
    updated_at = now()
  WHERE id = _conversation_id;
  
  -- Update billing usage if pricing is per-resolution
  UPDATE billing_usage
  SET conversations_resolved = conversations_resolved + 1
  WHERE business_id = (SELECT business_id FROM conversations WHERE id = _conversation_id)
    AND period_start <= now()
    AND period_end >= now();
END;
$$;