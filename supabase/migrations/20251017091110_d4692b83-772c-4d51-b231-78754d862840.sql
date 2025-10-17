-- Create SSO tokens table for secure embed authentication
CREATE TABLE public.sso_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'conversation', -- 'conversation' or 'inbox'
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.sso_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: System can insert tokens
CREATE POLICY "System can insert SSO tokens"
ON public.sso_tokens FOR INSERT
WITH CHECK (true);

-- Policy: System can update last_used_at
CREATE POLICY "System can update SSO tokens"
ON public.sso_tokens FOR UPDATE
USING (true)
WITH CHECK (true);

-- Policy: System can select valid tokens
CREATE POLICY "System can select SSO tokens"
ON public.sso_tokens FOR SELECT
USING (true);

-- Index for fast token lookup
CREATE INDEX idx_sso_tokens_token ON public.sso_tokens(token);
CREATE INDEX idx_sso_tokens_expires_at ON public.sso_tokens(expires_at);

-- Cleanup function for expired tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_sso_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.sso_tokens WHERE expires_at < now();
END;
$$;