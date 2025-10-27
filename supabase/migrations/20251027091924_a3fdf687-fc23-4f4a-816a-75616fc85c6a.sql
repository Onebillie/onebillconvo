-- Add scheduling and sender account tracking to campaigns
ALTER TABLE public.marketing_campaigns 
ADD COLUMN IF NOT EXISTS sender_email_account_id UUID REFERENCES public.email_accounts(id),
ADD COLUMN IF NOT EXISTS test_email_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS save_as_template BOOLEAN DEFAULT TRUE;

-- Create marketing_templates table for better template management
CREATE TABLE IF NOT EXISTS public.marketing_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  category TEXT DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  thumbnail_url TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_templates_business ON public.marketing_email_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON public.marketing_email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_favorite ON public.marketing_email_templates(is_favorite) WHERE is_favorite = TRUE;

-- Enable RLS
ALTER TABLE public.marketing_email_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for templates
CREATE POLICY "Users can view their business templates"
  ON public.marketing_email_templates FOR SELECT
  USING (business_id IN (SELECT business_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create templates for their business"
  ON public.marketing_email_templates FOR INSERT
  WITH CHECK (business_id IN (SELECT business_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their business templates"
  ON public.marketing_email_templates FOR UPDATE
  USING (business_id IN (SELECT business_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their business templates"
  ON public.marketing_email_templates FOR DELETE
  USING (business_id IN (SELECT business_id FROM public.profiles WHERE id = auth.uid()));

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_marketing_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_marketing_email_templates_updated_at
  BEFORE UPDATE ON public.marketing_email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_marketing_email_templates_updated_at();