-- Add unlimited flag to businesses table
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS is_unlimited BOOLEAN DEFAULT false;

-- Mark the two internal businesses as unlimited
UPDATE businesses 
SET is_unlimited = true 
WHERE slug IN ('business-c7dc40b9', 'onebillchat');

-- Create pricing configuration table for superadmin
CREATE TABLE IF NOT EXISTS pricing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text NOT NULL UNIQUE,
  display_name text NOT NULL,
  monthly_price integer NOT NULL DEFAULT 0,
  message_limit integer NOT NULL DEFAULT 0,
  seat_limit integer NOT NULL DEFAULT 1,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default pricing tiers
INSERT INTO pricing_config (tier, display_name, monthly_price, message_limit, seat_limit, features) VALUES
('free', 'Free', 0, 100, 1, '["Basic support", "100 messages/month"]'),
('starter', 'Starter', 2900, 1000, 3, '["Email support", "1,000 messages/month", "3 team seats"]'),
('professional', 'Professional', 9900, 10000, 10, '["Priority support", "10,000 messages/month", "10 team seats", "API access"]'),
('enterprise', 'Enterprise', 29900, 999999, 50, '["Dedicated support", "Unlimited messages", "50 team seats", "API access", "Custom integrations"]')
ON CONFLICT (tier) DO NOTHING;

-- Enable RLS
ALTER TABLE pricing_config ENABLE ROW LEVEL SECURITY;

-- Policies for pricing_config
CREATE POLICY "Anyone can view pricing"
ON pricing_config FOR SELECT
USING (true);

CREATE POLICY "Superadmins can manage pricing"
ON pricing_config FOR ALL
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- Create credit bundles table
CREATE TABLE IF NOT EXISTS credit_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  credits integer NOT NULL,
  price integer NOT NULL,
  stripe_price_id text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE credit_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view credit bundles"
ON credit_bundles FOR SELECT
USING (true);

CREATE POLICY "Superadmins can manage credit bundles"
ON credit_bundles FOR ALL
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- Create low credit warnings table
CREATE TABLE IF NOT EXISTS credit_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  warning_type text NOT NULL CHECK (warning_type IN ('low', 'critical', 'expired')),
  threshold_percent integer NOT NULL,
  sent_at timestamptz DEFAULT now(),
  UNIQUE(business_id, warning_type, sent_at)
);

ALTER TABLE credit_warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business members can view their warnings"
ON credit_warnings FOR SELECT
USING (user_belongs_to_business(auth.uid(), business_id) OR has_role(auth.uid(), 'superadmin'::app_role));