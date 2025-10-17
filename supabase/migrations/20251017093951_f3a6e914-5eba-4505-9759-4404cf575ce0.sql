-- Create webhook configurations table
CREATE TABLE IF NOT EXISTS public.webhook_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  secret TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  retry_count INTEGER NOT NULL DEFAULT 3,
  timeout_seconds INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create webhook delivery logs table
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_config_id UUID NOT NULL REFERENCES public.webhook_configs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  delivered_at TIMESTAMP WITH TIME ZONE
);

-- Create embed customization table
CREATE TABLE IF NOT EXISTS public.embed_customizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE UNIQUE,
  primary_color TEXT DEFAULT '#3b82f6',
  secondary_color TEXT DEFAULT '#8b5cf6',
  background_color TEXT DEFAULT '#ffffff',
  text_color TEXT DEFAULT '#1f2937',
  font_family TEXT DEFAULT 'system-ui',
  border_radius TEXT DEFAULT '0.5rem',
  logo_url TEXT,
  custom_css TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embed_customizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for webhook_configs
CREATE POLICY "Business admins can manage webhooks"
ON public.webhook_configs
FOR ALL
USING (
  business_id IN (
    SELECT bu.business_id FROM business_users bu
    WHERE bu.user_id = auth.uid() 
    AND bu.role IN ('owner', 'admin')
  ) OR has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  business_id IN (
    SELECT bu.business_id FROM business_users bu
    WHERE bu.user_id = auth.uid() 
    AND bu.role IN ('owner', 'admin')
  ) OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- RLS Policies for webhook_deliveries
CREATE POLICY "Business members can view webhook deliveries"
ON public.webhook_deliveries
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM webhook_configs wc
    WHERE wc.id = webhook_deliveries.webhook_config_id
    AND user_belongs_to_business(auth.uid(), wc.business_id)
  ) OR has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "System can insert webhook deliveries"
ON public.webhook_deliveries
FOR INSERT
WITH CHECK (true);

-- RLS Policies for embed_customizations
CREATE POLICY "Business admins can manage embed customizations"
ON public.embed_customizations
FOR ALL
USING (
  business_id IN (
    SELECT bu.business_id FROM business_users bu
    WHERE bu.user_id = auth.uid() 
    AND bu.role IN ('owner', 'admin')
  ) OR has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  business_id IN (
    SELECT bu.business_id FROM business_users bu
    WHERE bu.user_id = auth.uid() 
    AND bu.role IN ('owner', 'admin')
  ) OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- Create indexes
CREATE INDEX idx_webhook_configs_business ON public.webhook_configs(business_id);
CREATE INDEX idx_webhook_deliveries_webhook_config ON public.webhook_deliveries(webhook_config_id);
CREATE INDEX idx_webhook_deliveries_status ON public.webhook_deliveries(status);
CREATE INDEX idx_embed_customizations_business ON public.embed_customizations(business_id);