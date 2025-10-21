-- Create public site identifiers (safe to embed in HTML)
CREATE TABLE IF NOT EXISTS public.embed_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  embed_token_id UUID REFERENCES public.embed_tokens(id) ON DELETE CASCADE NOT NULL,
  site_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create session tokens (short-lived, secure)
CREATE TABLE IF NOT EXISTS public.embed_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id VARCHAR(50) NOT NULL,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index on site_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_embed_sessions_site_id ON public.embed_sessions(site_id);
CREATE INDEX IF NOT EXISTS idx_embed_sessions_expires_at ON public.embed_sessions(expires_at);

-- Widget customization settings
CREATE TABLE IF NOT EXISTS public.embed_customizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL UNIQUE,
  chat_icon_type VARCHAR(50) DEFAULT 'default',
  chat_icon_url TEXT,
  chat_icon_svg TEXT,
  primary_color VARCHAR(20) DEFAULT '#6366f1',
  widget_position VARCHAR(20) DEFAULT 'bottom-right',
  greeting_message TEXT DEFAULT 'Hello! How can we help you today?',
  offline_message TEXT DEFAULT 'We''re currently offline. Leave a message and we''ll get back to you!',
  custom_css TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- AI triage settings
CREATE TABLE IF NOT EXISTS public.embed_ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL UNIQUE,
  ai_triage_enabled BOOLEAN DEFAULT false,
  ai_first_response_enabled BOOLEAN DEFAULT false,
  departments JSONB DEFAULT '[]'::jsonb,
  system_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add site_id to existing embed_tokens table
ALTER TABLE public.embed_tokens ADD COLUMN IF NOT EXISTS site_id VARCHAR(50);

-- Enable RLS
ALTER TABLE public.embed_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embed_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embed_customizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embed_ai_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for embed_sites
CREATE POLICY "Users can view their business embed sites"
  ON public.embed_sites FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert embed sites for their business"
  ON public.embed_sites FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their business embed sites"
  ON public.embed_sites FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their business embed sites"
  ON public.embed_sites FOR DELETE
  USING (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for embed_customizations
CREATE POLICY "Users can view their business customizations"
  ON public.embed_customizations FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert customizations for their business"
  ON public.embed_customizations FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their business customizations"
  ON public.embed_customizations FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for embed_ai_settings
CREATE POLICY "Users can view their business AI settings"
  ON public.embed_ai_settings FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert AI settings for their business"
  ON public.embed_ai_settings FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their business AI settings"
  ON public.embed_ai_settings FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

-- Function to generate unique site_id
CREATE OR REPLACE FUNCTION public.generate_site_id()
RETURNS TEXT AS $$
BEGIN
  RETURN 'site_' || substring(md5(random()::text) from 1 for 12);
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_embed_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.embed_sessions WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_embed_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_embed_sites_updated_at
  BEFORE UPDATE ON public.embed_sites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_embed_updated_at();

CREATE TRIGGER update_embed_customizations_updated_at
  BEFORE UPDATE ON public.embed_customizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_embed_updated_at();

CREATE TRIGGER update_embed_ai_settings_updated_at
  BEFORE UPDATE ON public.embed_ai_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_embed_updated_at();