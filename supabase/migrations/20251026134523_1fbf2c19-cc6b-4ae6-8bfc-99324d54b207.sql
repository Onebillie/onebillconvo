-- Create marketing templates table
CREATE TABLE IF NOT EXISTS public.marketing_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'promo', 'invoice', 'newsletter', 'update', 'referral'
  industry TEXT, -- 'utilities', 'finance', 'retail', 'hospitality', 'general'
  channels TEXT[] DEFAULT ARRAY['email'], -- channels this template supports
  
  -- Content for each channel
  email_subject TEXT,
  email_content TEXT,
  sms_content TEXT,
  whatsapp_content TEXT,
  
  -- Template metadata
  thumbnail_url TEXT,
  is_public BOOLEAN DEFAULT false, -- public templates in gallery
  usage_count INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketing_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their business templates"
  ON public.marketing_templates FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
    OR is_public = true
  );

CREATE POLICY "Users can create templates for their business"
  ON public.marketing_templates FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their business templates"
  ON public.marketing_templates FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their business templates"
  ON public.marketing_templates FOR DELETE
  USING (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

-- Create index for performance
CREATE INDEX idx_marketing_templates_business ON public.marketing_templates(business_id);
CREATE INDEX idx_marketing_templates_public ON public.marketing_templates(is_public) WHERE is_public = true;
CREATE INDEX idx_marketing_templates_category ON public.marketing_templates(category);

-- Update trigger for updated_at
CREATE TRIGGER update_marketing_templates_updated_at
  BEFORE UPDATE ON public.marketing_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enhance marketing_campaigns table to support template references
ALTER TABLE public.marketing_campaigns 
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.marketing_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS merge_tags JSONB DEFAULT '{}'::jsonb;