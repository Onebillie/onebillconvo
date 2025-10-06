-- Create security definer function to check if user belongs to a business
-- This bypasses RLS and prevents infinite recursion
CREATE OR REPLACE FUNCTION public.user_belongs_to_business(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_users
    WHERE user_id = _user_id
      AND business_id = _business_id
  )
$$;

-- Create helper function to get user's business IDs (for IN queries)
CREATE OR REPLACE FUNCTION public.get_user_business_ids(_user_id uuid)
RETURNS TABLE(business_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT business_id
  FROM public.business_users
  WHERE user_id = _user_id
$$;

-- Update conversations RLS policy to use the new function
DROP POLICY IF EXISTS "Business members can view conversations" ON public.conversations;
CREATE POLICY "Business members can view conversations"
ON public.conversations FOR SELECT
USING (
  public.user_belongs_to_business(auth.uid(), business_id)
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

DROP POLICY IF EXISTS "Business members can manage conversations" ON public.conversations;
CREATE POLICY "Business members can manage conversations"
ON public.conversations FOR ALL
USING (
  public.user_belongs_to_business(auth.uid(), business_id)
  OR has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  public.user_belongs_to_business(auth.uid(), business_id)
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- Update customers RLS policies
DROP POLICY IF EXISTS "Business members can view customers" ON public.customers;
CREATE POLICY "Business members can view customers"
ON public.customers FOR SELECT
USING (
  public.user_belongs_to_business(auth.uid(), business_id)
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

DROP POLICY IF EXISTS "Business members can manage customers" ON public.customers;
CREATE POLICY "Business members can manage customers"
ON public.customers FOR ALL
USING (
  public.user_belongs_to_business(auth.uid(), business_id)
  OR has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  public.user_belongs_to_business(auth.uid(), business_id)
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- Update messages RLS policies
DROP POLICY IF EXISTS "Business members can view messages" ON public.messages;
CREATE POLICY "Business members can view messages"
ON public.messages FOR SELECT
USING (
  public.user_belongs_to_business(auth.uid(), business_id)
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

DROP POLICY IF EXISTS "Business members can manage messages" ON public.messages;
CREATE POLICY "Business members can manage messages"
ON public.messages FOR ALL
USING (
  public.user_belongs_to_business(auth.uid(), business_id)
  OR has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  public.user_belongs_to_business(auth.uid(), business_id)
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- Update whatsapp_accounts RLS policies
DROP POLICY IF EXISTS "Business members can view WhatsApp accounts" ON public.whatsapp_accounts;
CREATE POLICY "Business members can view WhatsApp accounts"
ON public.whatsapp_accounts FOR SELECT
USING (
  public.user_belongs_to_business(auth.uid(), business_id)
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

DROP POLICY IF EXISTS "Business admins can manage WhatsApp accounts" ON public.whatsapp_accounts;
CREATE POLICY "Business admins can manage WhatsApp accounts"
ON public.whatsapp_accounts FOR ALL
USING (
  (business_id IN (
    SELECT bu.business_id
    FROM business_users bu
    WHERE bu.user_id = auth.uid()
      AND bu.role IN ('owner', 'admin')
  ))
  OR has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  (business_id IN (
    SELECT bu.business_id
    FROM business_users bu
    WHERE bu.user_id = auth.uid()
      AND bu.role IN ('owner', 'admin')
  ))
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- Update email_accounts RLS policies
DROP POLICY IF EXISTS "Business members can view email accounts" ON public.email_accounts;
CREATE POLICY "Business members can view email accounts"
ON public.email_accounts FOR SELECT
USING (
  public.user_belongs_to_business(auth.uid(), business_id)
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

DROP POLICY IF EXISTS "Business admins can manage email accounts" ON public.email_accounts;
CREATE POLICY "Business admins can manage email accounts"
ON public.email_accounts FOR ALL
USING (
  (business_id IN (
    SELECT bu.business_id
    FROM business_users bu
    WHERE bu.user_id = auth.uid()
      AND bu.role IN ('owner', 'admin')
  ))
  OR has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  (business_id IN (
    SELECT bu.business_id
    FROM business_users bu
    WHERE bu.user_id = auth.uid()
      AND bu.role IN ('owner', 'admin')
  ))
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- Update ai_assistant_config RLS policies
DROP POLICY IF EXISTS "Business members can view AI config" ON public.ai_assistant_config;
CREATE POLICY "Business members can view AI config"
ON public.ai_assistant_config FOR SELECT
USING (
  public.user_belongs_to_business(auth.uid(), business_id)
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

DROP POLICY IF EXISTS "Business admins can manage AI config" ON public.ai_assistant_config;
CREATE POLICY "Business admins can manage AI config"
ON public.ai_assistant_config FOR ALL
USING (
  (business_id IN (
    SELECT bu.business_id
    FROM business_users bu
    WHERE bu.user_id = auth.uid()
      AND bu.role IN ('owner', 'admin')
  ))
  OR has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  (business_id IN (
    SELECT bu.business_id
    FROM business_users bu
    WHERE bu.user_id = auth.uid()
      AND bu.role IN ('owner', 'admin')
  ))
  OR has_role(auth.uid(), 'superadmin'::app_role)
);