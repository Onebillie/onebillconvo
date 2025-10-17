-- Add Facebook and Instagram support to messaging channels

-- Create facebook_accounts table
CREATE TABLE IF NOT EXISTS public.facebook_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  page_id TEXT NOT NULL,
  page_name TEXT NOT NULL,
  access_token TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(business_id, page_id)
);

-- Create instagram_accounts table
CREATE TABLE IF NOT EXISTS public.instagram_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  instagram_account_id TEXT NOT NULL,
  username TEXT NOT NULL,
  access_token TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(business_id, instagram_account_id)
);

-- Add Facebook and Instagram fields to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS facebook_psid TEXT,
ADD COLUMN IF NOT EXISTS facebook_username TEXT,
ADD COLUMN IF NOT EXISTS instagram_id TEXT,
ADD COLUMN IF NOT EXISTS instagram_username TEXT;

-- Enable RLS on new tables
ALTER TABLE public.facebook_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies for facebook_accounts
CREATE POLICY "Business admins can manage facebook accounts"
ON public.facebook_accounts
FOR ALL
USING (
  business_id IN (
    SELECT bu.business_id FROM business_users bu
    WHERE bu.user_id = auth.uid() AND bu.role IN ('owner', 'admin')
  ) OR has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  business_id IN (
    SELECT bu.business_id FROM business_users bu
    WHERE bu.user_id = auth.uid() AND bu.role IN ('owner', 'admin')
  ) OR has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "Business members can view facebook accounts"
ON public.facebook_accounts
FOR SELECT
USING (
  user_belongs_to_business(auth.uid(), business_id) OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- RLS policies for instagram_accounts
CREATE POLICY "Business admins can manage instagram accounts"
ON public.instagram_accounts
FOR ALL
USING (
  business_id IN (
    SELECT bu.business_id FROM business_users bu
    WHERE bu.user_id = auth.uid() AND bu.role IN ('owner', 'admin')
  ) OR has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  business_id IN (
    SELECT bu.business_id FROM business_users bu
    WHERE bu.user_id = auth.uid() AND bu.role IN ('owner', 'admin')
  ) OR has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "Business members can view instagram accounts"
ON public.instagram_accounts
FOR SELECT
USING (
  user_belongs_to_business(auth.uid(), business_id) OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- Add triggers for updated_at
CREATE TRIGGER update_facebook_accounts_updated_at
BEFORE UPDATE ON public.facebook_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_instagram_accounts_updated_at
BEFORE UPDATE ON public.instagram_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();