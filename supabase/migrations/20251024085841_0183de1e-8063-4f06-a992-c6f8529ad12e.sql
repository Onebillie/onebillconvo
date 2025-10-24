-- Add credit expiry tracking to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS credit_expiry_date TIMESTAMP WITH TIME ZONE;

-- Add index for efficient expiry checks
CREATE INDEX IF NOT EXISTS idx_businesses_credit_expiry 
ON businesses(credit_expiry_date) 
WHERE credit_expiry_date IS NOT NULL;

-- Create table to track credit expiry warnings (avoid duplicate notifications)
CREATE TABLE IF NOT EXISTS credit_expiry_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  warning_type TEXT NOT NULL CHECK (warning_type IN ('30_days', '14_days', '7_days', '3_days', '1_day', 'expired')),
  credits_amount INTEGER NOT NULL,
  expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(business_id, warning_type, expiry_date)
);

-- Enable RLS on credit_expiry_warnings
ALTER TABLE credit_expiry_warnings ENABLE ROW LEVEL SECURITY;

-- RLS policy: Business owners can view their warnings
CREATE POLICY "Business members can view credit warnings" ON credit_expiry_warnings
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

-- Add index for efficient warning checks
CREATE INDEX IF NOT EXISTS idx_credit_warnings_business_type 
ON credit_expiry_warnings(business_id, warning_type, expiry_date);