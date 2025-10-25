-- Voice pricing configuration per tier
CREATE TABLE IF NOT EXISTS voice_pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT NOT NULL UNIQUE,
  
  -- Included minutes per month
  included_inbound_minutes INTEGER DEFAULT 0,
  included_outbound_minutes INTEGER DEFAULT 0,
  included_transcription_minutes INTEGER DEFAULT 0,
  included_phone_numbers INTEGER DEFAULT 0,
  
  -- Overage rates (cents per minute)
  overage_inbound_cents INTEGER DEFAULT 2,
  overage_outbound_cents INTEGER DEFAULT 3,
  overage_transcription_cents INTEGER DEFAULT 8,
  
  -- Twilio base costs (cents per minute) for margin calculation
  twilio_inbound_cost_cents DECIMAL(10,4) DEFAULT 0.85,
  twilio_outbound_cost_cents DECIMAL(10,4) DEFAULT 1.40,
  twilio_recording_cost_cents DECIMAL(10,4) DEFAULT 0.25,
  twilio_transcription_cost_cents DECIMAL(10,4) DEFAULT 5.00,
  
  -- Features enabled
  can_record BOOLEAN DEFAULT false,
  can_transcribe BOOLEAN DEFAULT false,
  can_transfer BOOLEAN DEFAULT false,
  can_conference BOOLEAN DEFAULT false,
  can_make_outbound BOOLEAN DEFAULT false,
  recording_retention_days INTEGER DEFAULT 30,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Voice call usage tracking
CREATE TABLE IF NOT EXISTS voice_call_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) NOT NULL,
  call_record_id UUID REFERENCES call_records(id),
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  
  -- Call minutes breakdown by type
  inbound_minutes_local DECIMAL(10,2) DEFAULT 0,
  outbound_minutes_local DECIMAL(10,2) DEFAULT 0,
  inbound_minutes_tollfree DECIMAL(10,2) DEFAULT 0,
  outbound_minutes_tollfree DECIMAL(10,2) DEFAULT 0,
  internal_minutes DECIMAL(10,2) DEFAULT 0,
  conference_minutes DECIMAL(10,2) DEFAULT 0,
  
  -- Feature usage minutes
  recording_minutes DECIMAL(10,2) DEFAULT 0,
  transcription_minutes DECIMAL(10,2) DEFAULT 0,
  
  -- Cost tracking (in cents)
  twilio_cost_cents INTEGER DEFAULT 0,
  our_markup_cents INTEGER DEFAULT 0,
  total_cost_cents INTEGER DEFAULT 0,
  
  -- Plan tracking
  within_plan_limit BOOLEAN DEFAULT true,
  overage_minutes DECIMAL(10,2) DEFAULT 0,
  
  -- Credits
  credits_used INTEGER DEFAULT 0,
  credits_remaining INTEGER,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Voice credit bundles
CREATE TABLE IF NOT EXISTS voice_credit_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  minutes INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  stripe_price_id TEXT,
  savings_percent INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_voice_usage_business_period ON voice_call_usage(business_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_voice_usage_call ON voice_call_usage(call_record_id);
CREATE INDEX IF NOT EXISTS idx_voice_pricing_tier ON voice_pricing_config(tier);

-- Add cost tracking columns to call_records
ALTER TABLE call_records 
ADD COLUMN IF NOT EXISTS twilio_cost_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS billable_duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS recording_cost_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS transcription_cost_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cost_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS within_plan_limit BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS charged_to_credits BOOLEAN DEFAULT false;

-- Add voice-specific columns to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS voice_credit_balance INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS voice_minutes_used_period INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS voice_period_start TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS voice_period_end TIMESTAMP DEFAULT (NOW() + INTERVAL '1 month');

-- Insert pricing configuration for each tier
INSERT INTO voice_pricing_config (tier, included_inbound_minutes, included_outbound_minutes, included_transcription_minutes, included_phone_numbers, overage_inbound_cents, overage_outbound_cents, overage_transcription_cents, can_record, can_transcribe, can_transfer, can_conference, can_make_outbound, recording_retention_days) VALUES
('free', 0, 0, 0, 0, 2, 3, 8, false, false, false, false, false, 0),
('starter', 100, 0, 0, 1, 3, 3, 8, true, false, false, false, false, 30),
('professional', 500, 200, 100, 3, 2, 3, 8, true, true, true, true, true, 90),
('enterprise', 999999, 999999, 999999, 999999, 2, 2, 6, true, true, true, true, true, 365)
ON CONFLICT (tier) DO NOTHING;

-- Insert voice credit bundles
INSERT INTO voice_credit_bundles (name, minutes, price_cents, savings_percent, is_active) VALUES
('500 Minutes Pack', 500, 1000, 20, true),
('2000 Minutes Pack', 2000, 3500, 30, true),
('5000 Minutes Pack', 5000, 7500, 35, true)
ON CONFLICT DO NOTHING;