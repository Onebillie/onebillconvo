-- Create message categories table for color-coding
CREATE TABLE IF NOT EXISTS public.message_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  background_color TEXT NOT NULL DEFAULT '#FFFFFF',
  text_color TEXT NOT NULL DEFAULT '#000000',
  border_color TEXT NOT NULL DEFAULT '#E5E7EB',
  icon TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, category_name)
);

-- Add category to messages
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'customer_service';

-- Add category to marketing campaigns
ALTER TABLE public.marketing_campaigns 
ADD COLUMN IF NOT EXISTS message_category TEXT DEFAULT 'marketing';

-- Create customer segments table for advanced segmentation
CREATE TABLE IF NOT EXISTS public.customer_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  filters JSONB NOT NULL DEFAULT '{}',
  is_dynamic BOOLEAN DEFAULT true,
  customer_count INTEGER DEFAULT 0,
  last_calculated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create marketing automation workflows table
CREATE TABLE IF NOT EXISTS public.marketing_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL, -- 'manual', 'date', 'behavior', 'segment'
  trigger_config JSONB NOT NULL DEFAULT '{}',
  workflow_steps JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT false,
  total_enrolled INTEGER DEFAULT 0,
  total_completed INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create workflow enrollments table
CREATE TABLE IF NOT EXISTS public.workflow_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES public.marketing_workflows(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'paused', 'failed'
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  last_step_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- Create social media comments table
CREATE TABLE IF NOT EXISTS public.social_media_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'facebook', 'instagram'
  post_id TEXT NOT NULL,
  comment_id TEXT NOT NULL UNIQUE,
  parent_comment_id TEXT,
  customer_id UUID REFERENCES public.customers(id),
  commenter_name TEXT NOT NULL,
  commenter_username TEXT,
  commenter_profile_picture TEXT,
  content TEXT NOT NULL,
  sentiment TEXT, -- 'positive', 'neutral', 'negative'
  is_hidden BOOLEAN DEFAULT false,
  is_replied BOOLEAN DEFAULT false,
  conversation_id UUID REFERENCES public.conversations(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  replied_at TIMESTAMPTZ
);

-- Create pricing tiers table for flexible pricing
CREATE TABLE IF NOT EXISTS public.pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  base_price NUMERIC(10,2) NOT NULL,
  marketing_messages_included INTEGER DEFAULT 0,
  marketing_campaigns_limit INTEGER,
  features JSONB NOT NULL DEFAULT '{}',
  stripe_price_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default message categories
INSERT INTO public.message_categories (business_id, category_name, display_name, background_color, text_color, border_color, icon, is_default)
SELECT 
  b.id,
  'customer_service',
  'Customer Service',
  '#FFFFFF',
  '#000000',
  '#E5E7EB',
  'MessageCircle',
  true
FROM public.businesses b
ON CONFLICT (business_id, category_name) DO NOTHING;

INSERT INTO public.message_categories (business_id, category_name, display_name, background_color, text_color, border_color, icon, is_default)
SELECT 
  b.id,
  'marketing',
  'Marketing',
  '#FEF3C7',
  '#92400E',
  '#F59E0B',
  'Megaphone',
  true
FROM public.businesses b
ON CONFLICT (business_id, category_name) DO NOTHING;

INSERT INTO public.message_categories (business_id, category_name, display_name, background_color, text_color, border_color, icon, is_default)
SELECT 
  b.id,
  'utility',
  'Utility/Template',
  '#FFEDD5',
  '#9A3412',
  '#FB923C',
  'FileText',
  true
FROM public.businesses b
ON CONFLICT (business_id, category_name) DO NOTHING;

INSERT INTO public.message_categories (business_id, category_name, display_name, background_color, text_color, border_color, icon, is_default)
SELECT 
  b.id,
  'automated',
  'AI Automated',
  '#DBEAFE',
  '#1E40AF',
  '#3B82F6',
  'Bot',
  true
FROM public.businesses b
ON CONFLICT (business_id, category_name) DO NOTHING;

INSERT INTO public.message_categories (business_id, category_name, display_name, background_color, text_color, border_color, icon, is_default)
SELECT 
  b.id,
  'internal',
  'Internal Note',
  '#F3E8FF',
  '#6B21A8',
  '#A855F7',
  'StickyNote',
  true
FROM public.businesses b
ON CONFLICT (business_id, category_name) DO NOTHING;

-- Insert marketing pricing tiers
INSERT INTO public.pricing_tiers (tier_name, display_name, base_price, marketing_messages_included, marketing_campaigns_limit, features, is_active)
VALUES 
  ('marketing_starter', 'Starter Marketing', 19.00, 2000, 5, 
   '{"channels": ["email", "sms"], "segmentation": "basic", "analytics": "basic", "team_members": 1}', true),
  ('marketing_professional', 'Professional Marketing', 49.00, 10000, null, 
   '{"channels": ["whatsapp", "email", "sms", "facebook", "instagram"], "segmentation": "advanced", "analytics": "advanced", "ab_testing": true, "automation": "drip", "team_members": 5}', true),
  ('marketing_enterprise', 'Enterprise Marketing', 149.00, null, null, 
   '{"channels": ["whatsapp", "email", "sms", "facebook", "instagram"], "segmentation": "unlimited", "analytics": "custom", "ab_testing": true, "automation": "full", "whitelabel": true, "team_members": null}', true)
ON CONFLICT (tier_name) DO NOTHING;

-- Enable RLS
ALTER TABLE public.message_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_categories
CREATE POLICY "Business members can view message categories"
  ON public.message_categories FOR SELECT
  USING (user_belongs_to_business(auth.uid(), business_id) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Business admins can manage message categories"
  ON public.message_categories FOR ALL
  USING (
    business_id IN (
      SELECT bu.business_id FROM public.business_users bu
      WHERE bu.user_id = auth.uid() AND bu.role IN ('owner', 'admin')
    ) OR has_role(auth.uid(), 'superadmin'::app_role)
  );

-- RLS Policies for customer_segments
CREATE POLICY "Business members can view segments"
  ON public.customer_segments FOR SELECT
  USING (user_belongs_to_business(auth.uid(), business_id));

CREATE POLICY "Business admins can manage segments"
  ON public.customer_segments FOR ALL
  USING (
    business_id IN (
      SELECT bu.business_id FROM public.business_users bu
      WHERE bu.user_id = auth.uid() AND bu.role IN ('owner', 'admin')
    )
  );

-- RLS Policies for marketing_workflows
CREATE POLICY "Business members can view workflows"
  ON public.marketing_workflows FOR SELECT
  USING (user_belongs_to_business(auth.uid(), business_id));

CREATE POLICY "Business admins can manage workflows"
  ON public.marketing_workflows FOR ALL
  USING (
    business_id IN (
      SELECT bu.business_id FROM public.business_users bu
      WHERE bu.user_id = auth.uid() AND bu.role IN ('owner', 'admin')
    )
  );

-- RLS Policies for workflow_enrollments
CREATE POLICY "Business members can view enrollments"
  ON public.workflow_enrollments FOR SELECT
  USING (
    workflow_id IN (
      SELECT id FROM public.marketing_workflows 
      WHERE user_belongs_to_business(auth.uid(), business_id)
    )
  );

-- RLS Policies for social_media_comments
CREATE POLICY "Business members can view social comments"
  ON public.social_media_comments FOR SELECT
  USING (user_belongs_to_business(auth.uid(), business_id));

CREATE POLICY "Business members can manage social comments"
  ON public.social_media_comments FOR ALL
  USING (user_belongs_to_business(auth.uid(), business_id));

-- RLS Policies for pricing_tiers
CREATE POLICY "Anyone can view pricing tiers"
  ON public.pricing_tiers FOR SELECT
  USING (is_active = true);

CREATE POLICY "Superadmins can manage pricing tiers"
  ON public.pricing_tiers FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_category ON public.messages(category);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_category ON public.marketing_campaigns(message_category);
CREATE INDEX IF NOT EXISTS idx_customer_segments_business ON public.customer_segments(business_id);
CREATE INDEX IF NOT EXISTS idx_marketing_workflows_business ON public.marketing_workflows(business_id);
CREATE INDEX IF NOT EXISTS idx_workflow_enrollments_workflow ON public.workflow_enrollments(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_enrollments_customer ON public.workflow_enrollments(customer_id);
CREATE INDEX IF NOT EXISTS idx_social_comments_business ON public.social_media_comments(business_id);
CREATE INDEX IF NOT EXISTS idx_social_comments_platform ON public.social_media_comments(platform, post_id);