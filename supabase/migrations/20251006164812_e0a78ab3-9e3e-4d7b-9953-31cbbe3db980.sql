-- Phase 1: Database Schema Updates for Running Costs & AI Providers

-- ==============================================
-- 1. Platform Costs Tracking
-- ==============================================
CREATE TABLE IF NOT EXISTS public.platform_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month DATE NOT NULL UNIQUE,
  lovable_ai_cost DECIMAL(10,2) DEFAULT 0,
  lovable_credits_cost DECIMAL(10,2) DEFAULT 0,
  supabase_db_cost DECIMAL(10,2) DEFAULT 0,
  supabase_storage_cost DECIMAL(10,2) DEFAULT 0,
  supabase_bandwidth_cost DECIMAL(10,2) DEFAULT 0,
  whatsapp_api_cost DECIMAL(10,2) DEFAULT 0,
  email_service_cost DECIMAL(10,2) DEFAULT 0,
  sms_cost DECIMAL(10,2) DEFAULT 0,
  other_costs JSONB DEFAULT '{}',
  fixed_monthly_costs DECIMAL(10,2) DEFAULT 0,
  total_cost DECIMAL(10,2) GENERATED ALWAYS AS (
    COALESCE(lovable_ai_cost, 0) + COALESCE(lovable_credits_cost, 0) + 
    COALESCE(supabase_db_cost, 0) + COALESCE(supabase_storage_cost, 0) + 
    COALESCE(supabase_bandwidth_cost, 0) + COALESCE(whatsapp_api_cost, 0) + 
    COALESCE(email_service_cost, 0) + COALESCE(sms_cost, 0) + 
    COALESCE(fixed_monthly_costs, 0)
  ) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for platform_costs
ALTER TABLE public.platform_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage platform costs"
ON public.platform_costs
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins can view platform costs"
ON public.platform_costs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_platform_costs_updated_at
BEFORE UPDATE ON public.platform_costs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================
-- 2. AI Providers Configuration
-- ==============================================
CREATE TABLE IF NOT EXISTS public.ai_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL, -- 'openai', 'anthropic', 'google', 'xai', 'lovable'
  display_name TEXT NOT NULL, -- 'ChatGPT', 'Claude', 'Gemini', 'Grok', 'Lovable AI'
  api_key TEXT, -- Encrypted, nullable for default provider
  model TEXT NOT NULL, -- 'gpt-4', 'claude-3-opus', 'gemini-pro', 'grok-1'
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  configuration JSONB DEFAULT '{"temperature": 0.7, "max_tokens": 500}',
  monthly_cost DECIMAL(10,2) DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, provider_name)
);

-- RLS for ai_providers
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business admins can manage AI providers"
ON public.ai_providers
FOR ALL
TO authenticated
USING (
  business_id IN (
    SELECT bu.business_id FROM public.business_users bu
    WHERE bu.user_id = auth.uid() AND bu.role IN ('owner', 'admin')
  ) OR has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  business_id IN (
    SELECT bu.business_id FROM public.business_users bu
    WHERE bu.user_id = auth.uid() AND bu.role IN ('owner', 'admin')
  ) OR has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "Business members can view AI providers"
ON public.ai_providers
FOR SELECT
TO authenticated
USING (
  user_belongs_to_business(auth.uid(), business_id) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
);

-- Trigger for updated_at
CREATE TRIGGER update_ai_providers_updated_at
BEFORE UPDATE ON public.ai_providers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================
-- 3. API Usage Logs
-- ==============================================
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INT,
  response_time_ms INT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_business_id ON public.api_usage_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON public.api_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_api_key_id ON public.api_usage_logs(api_key_id);

-- RLS for api_usage_logs
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business members can view their API usage"
ON public.api_usage_logs
FOR SELECT
TO authenticated
USING (
  user_belongs_to_business(auth.uid(), business_id) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "System can insert API usage logs"
ON public.api_usage_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ==============================================
-- 4. Webhooks
-- ==============================================
CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  secret TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  last_status_code INT,
  failure_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for webhooks
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business admins can manage webhooks"
ON public.webhooks
FOR ALL
TO authenticated
USING (
  business_id IN (
    SELECT bu.business_id FROM public.business_users bu
    WHERE bu.user_id = auth.uid() AND bu.role IN ('owner', 'admin')
  ) OR has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  business_id IN (
    SELECT bu.business_id FROM public.business_users bu
    WHERE bu.user_id = auth.uid() AND bu.role IN ('owner', 'admin')
  ) OR has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "Business members can view webhooks"
ON public.webhooks
FOR SELECT
TO authenticated
USING (
  user_belongs_to_business(auth.uid(), business_id) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
);

-- Trigger for updated_at
CREATE TRIGGER update_webhooks_updated_at
BEFORE UPDATE ON public.webhooks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================
-- 5. Update Existing Tables
-- ==============================================

-- Add churn tracking to businesses
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancellation_feedback JSONB,
ADD COLUMN IF NOT EXISTS trial_converted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_conversion_date TIMESTAMPTZ;

-- Add API tier restrictions to api_keys
ALTER TABLE public.api_keys 
ADD COLUMN IF NOT EXISTS min_subscription_tier TEXT DEFAULT 'professional',
ADD COLUMN IF NOT EXISTS rate_limit_per_hour INT DEFAULT 1000;

-- Update ai_assistant_config to support multiple providers
ALTER TABLE public.ai_assistant_config 
ADD COLUMN IF NOT EXISTS ai_provider_id UUID REFERENCES public.ai_providers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS fallback_provider_id UUID REFERENCES public.ai_providers(id) ON DELETE SET NULL;

-- ==============================================
-- 6. Indexes for Performance
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_businesses_subscription_status ON public.businesses(subscription_status);
CREATE INDEX IF NOT EXISTS idx_businesses_subscription_tier ON public.businesses(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_businesses_trial_ends_at ON public.businesses(trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_ai_providers_business_id ON public.ai_providers(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_providers_is_default ON public.ai_providers(is_default) WHERE is_default = true;