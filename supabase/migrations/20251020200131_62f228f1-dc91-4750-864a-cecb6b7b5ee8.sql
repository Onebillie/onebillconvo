-- Create auto_topup_settings table
CREATE TABLE IF NOT EXISTS public.auto_topup_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  threshold_credits INTEGER NOT NULL DEFAULT 100,
  bundle_size TEXT NOT NULL DEFAULT 'small' CHECK (bundle_size IN ('small', 'medium', 'large')),
  last_topup_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(business_id)
);

-- Enable RLS
ALTER TABLE public.auto_topup_settings ENABLE ROW LEVEL SECURITY;

-- Policies for auto_topup_settings
CREATE POLICY "Users can view their own auto topup settings"
  ON public.auto_topup_settings
  FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own auto topup settings"
  ON public.auto_topup_settings
  FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own auto topup settings"
  ON public.auto_topup_settings
  FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Create updated_at trigger
CREATE TRIGGER update_auto_topup_settings_updated_at
  BEFORE UPDATE ON public.auto_topup_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_auto_topup_settings_business_id ON public.auto_topup_settings(business_id);
CREATE INDEX idx_auto_topup_settings_enabled ON public.auto_topup_settings(enabled) WHERE enabled = true;