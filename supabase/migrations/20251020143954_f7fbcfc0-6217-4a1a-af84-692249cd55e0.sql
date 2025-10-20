-- Create AI usage tracking table for billing
CREATE TABLE IF NOT EXISTS public.ai_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  responses_used INT DEFAULT 0,
  overage_charges DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_business_period ON public.ai_usage_tracking(business_id, period_start);

-- Enable RLS
ALTER TABLE public.ai_usage_tracking ENABLE ROW LEVEL SECURITY;

-- Business members can view their AI usage
CREATE POLICY "Business members can view AI usage" ON public.ai_usage_tracking
  FOR SELECT USING (
    user_belongs_to_business(auth.uid(), business_id) 
    OR has_role(auth.uid(), 'superadmin')
  );

-- System can insert/update AI usage (for edge functions)
CREATE POLICY "System can manage AI usage" ON public.ai_usage_tracking
  FOR ALL USING (true) WITH CHECK (true);

-- Create canned responses table
CREATE TABLE IF NOT EXISTS public.canned_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  shortcut TEXT,
  category TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Create index for shortcuts
CREATE INDEX IF NOT EXISTS idx_canned_responses_business ON public.canned_responses(business_id);
CREATE INDEX IF NOT EXISTS idx_canned_responses_shortcut ON public.canned_responses(business_id, shortcut) WHERE shortcut IS NOT NULL;

-- Enable RLS
ALTER TABLE public.canned_responses ENABLE ROW LEVEL SECURITY;

-- Business members can view canned responses
CREATE POLICY "Business members can view canned responses" ON public.canned_responses
  FOR SELECT USING (
    user_belongs_to_business(auth.uid(), business_id) 
    OR has_role(auth.uid(), 'superadmin')
  );

-- Business admins can manage canned responses
CREATE POLICY "Business admins can manage canned responses" ON public.canned_responses
  FOR ALL USING (
    (business_id IN (
      SELECT bu.business_id FROM business_users bu 
      WHERE bu.user_id = auth.uid() 
      AND bu.role IN ('owner', 'admin')
    ))
    OR has_role(auth.uid(), 'superadmin')
  );