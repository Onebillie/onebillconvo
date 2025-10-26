-- ============================================
-- PHASE 2: AUDIENCE SEGMENTATION
-- ============================================

CREATE TABLE IF NOT EXISTS public.audience_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Segment filters
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Example: {
  --   "tags": ["VIP", "premium"],
  --   "status": ["active", "trial"],
  --   "last_contacted_days": 30,
  --   "channels": ["email", "whatsapp"],
  --   "custom_fields": {"plan": "premium", "spend_gt": 1000}
  -- }
  
  -- Calculated stats
  member_count INTEGER DEFAULT 0,
  last_calculated_at TIMESTAMPTZ,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- PHASE 4: ANALYTICS & TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS public.campaign_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  
  -- Delivery metrics
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,
  
  -- Engagement metrics
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  replied_count INTEGER DEFAULT 0,
  unsubscribed_count INTEGER DEFAULT 0,
  
  -- Conversion metrics
  conversion_count INTEGER DEFAULT 0,
  conversion_value DECIMAL(10,2) DEFAULT 0,
  
  -- By channel
  metrics_by_channel JSONB DEFAULT '{}'::jsonb,
  
  -- Time-based tracking
  hourly_stats JSONB DEFAULT '[]'::jsonb,
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaign_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  
  event_type TEXT NOT NULL, -- 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed', 'converted'
  channel TEXT NOT NULL, -- 'email', 'sms', 'whatsapp'
  
  -- Event details
  event_data JSONB DEFAULT '{}'::jsonb,
  user_agent TEXT,
  ip_address TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Track link clicks in campaigns
CREATE TABLE IF NOT EXISTS public.campaign_link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  
  link_url TEXT NOT NULL,
  click_count INTEGER DEFAULT 1,
  first_clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  user_agent TEXT,
  ip_address TEXT
);

-- ============================================
-- PHASE 5: REFERRAL SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS public.referral_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  
  -- Referral settings
  referral_type TEXT NOT NULL DEFAULT 'link', -- 'link', 'code'
  reward_type TEXT NOT NULL, -- 'discount', 'credit', 'free_month', 'custom'
  reward_value DECIMAL(10,2),
  reward_description TEXT,
  
  -- Limits
  max_referrals_per_user INTEGER,
  expires_at TIMESTAMPTZ,
  
  -- Stats
  total_referrals INTEGER DEFAULT 0,
  successful_referrals INTEGER DEFAULT 0,
  
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.referral_campaigns(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  
  referral_code TEXT NOT NULL UNIQUE,
  referral_link TEXT,
  
  -- Stats
  clicks INTEGER DEFAULT 0,
  successful_referrals INTEGER DEFAULT 0,
  
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referral_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id UUID NOT NULL REFERENCES public.referral_codes(id) ON DELETE CASCADE,
  referee_customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  
  conversion_type TEXT NOT NULL, -- 'signup', 'purchase', 'subscription'
  conversion_value DECIMAL(10,2),
  
  reward_issued BOOLEAN DEFAULT false,
  reward_issued_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_audience_segments_business ON public.audience_segments(business_id);
CREATE INDEX idx_campaign_analytics_campaign ON public.campaign_analytics(campaign_id);
CREATE INDEX idx_campaign_events_campaign ON public.campaign_events(campaign_id);
CREATE INDEX idx_campaign_events_type ON public.campaign_events(event_type);
CREATE INDEX idx_campaign_events_created ON public.campaign_events(created_at);
CREATE INDEX idx_campaign_link_clicks_campaign ON public.campaign_link_clicks(campaign_id);
CREATE INDEX idx_referral_campaigns_business ON public.referral_campaigns(business_id);
CREATE INDEX idx_referral_codes_code ON public.referral_codes(referral_code);
CREATE INDEX idx_referral_codes_campaign ON public.referral_codes(campaign_id);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Audience Segments
ALTER TABLE public.audience_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their business segments"
  ON public.audience_segments FOR SELECT
  USING (business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can create segments for their business"
  ON public.audience_segments FOR INSERT
  WITH CHECK (business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their business segments"
  ON public.audience_segments FOR UPDATE
  USING (business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their business segments"
  ON public.audience_segments FOR DELETE
  USING (business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid()));

-- Campaign Analytics (read-only for users)
ALTER TABLE public.campaign_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view analytics for their campaigns"
  ON public.campaign_analytics FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM public.marketing_campaigns 
      WHERE business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid())
    )
  );

-- Campaign Events (read-only)
ALTER TABLE public.campaign_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events for their campaigns"
  ON public.campaign_events FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM public.marketing_campaigns 
      WHERE business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid())
    )
  );

-- Campaign Link Clicks (read-only)
ALTER TABLE public.campaign_link_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view link clicks for their campaigns"
  ON public.campaign_link_clicks FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM public.marketing_campaigns 
      WHERE business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid())
    )
  );

-- Referral Campaigns
ALTER TABLE public.referral_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their business referral campaigns"
  ON public.referral_campaigns FOR SELECT
  USING (business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can create referral campaigns"
  ON public.referral_campaigns FOR INSERT
  WITH CHECK (business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their referral campaigns"
  ON public.referral_campaigns FOR UPDATE
  USING (business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid()));

-- Referral Codes (readable by all, managed by system)
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view referral codes for their campaigns"
  ON public.referral_codes FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM public.referral_campaigns 
      WHERE business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid())
    )
  );

-- Referral Conversions (readable by campaign owners)
ALTER TABLE public.referral_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view conversions for their referral campaigns"
  ON public.referral_conversions FOR SELECT
  USING (
    referral_code_id IN (
      SELECT id FROM public.referral_codes 
      WHERE campaign_id IN (
        SELECT id FROM public.referral_campaigns 
        WHERE business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid())
      )
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_audience_segments_updated_at
  BEFORE UPDATE ON public.audience_segments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_referral_campaigns_updated_at
  BEFORE UPDATE ON public.referral_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8 character alphanumeric code
    new_code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE referral_code = new_code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;