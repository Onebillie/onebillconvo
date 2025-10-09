-- Add OAuth fields to email_accounts table
ALTER TABLE public.email_accounts 
ADD COLUMN IF NOT EXISTS auth_method TEXT DEFAULT 'password' CHECK (auth_method IN ('password', 'oauth')),
ADD COLUMN IF NOT EXISTS oauth_provider TEXT CHECK (oauth_provider IN ('google', 'microsoft', 'yahoo')),
ADD COLUMN IF NOT EXISTS oauth_access_token TEXT,
ADD COLUMN IF NOT EXISTS oauth_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS oauth_token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS oauth_scopes JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS sync_from_date TIMESTAMPTZ DEFAULT now() - interval '30 days',
ADD COLUMN IF NOT EXISTS delete_after_sync BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS mark_as_read BOOLEAN DEFAULT false;

-- Create SMS accounts table
CREATE TABLE IF NOT EXISTS public.sms_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('twilio', 'vonage', 'plivo', 'messagebird')),
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  account_sid TEXT,
  auth_token TEXT,
  api_key TEXT,
  api_secret TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on sms_accounts
ALTER TABLE public.sms_accounts ENABLE ROW LEVEL SECURITY;

-- Business admins can manage SMS accounts
CREATE POLICY "Business admins can manage SMS accounts"
ON public.sms_accounts
FOR ALL
USING (
  business_id IN (
    SELECT bu.business_id
    FROM public.business_users bu
    WHERE bu.user_id = auth.uid()
    AND bu.role IN ('owner', 'admin')
  )
  OR public.has_role(auth.uid(), 'superadmin'::app_role)
);

-- Business members can view SMS accounts
CREATE POLICY "Business members can view SMS accounts"
ON public.sms_accounts
FOR SELECT
USING (
  public.user_belongs_to_business(auth.uid(), business_id)
  OR public.has_role(auth.uid(), 'superadmin'::app_role)
);

-- Add trigger for updated_at
CREATE TRIGGER update_sms_accounts_updated_at
  BEFORE UPDATE ON public.sms_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.sms_accounts IS 'SMS provider accounts for sending and receiving SMS messages';