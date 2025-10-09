-- Create admin_sessions table to track admin login sessions
CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '8 hours'),
  ip_address text,
  user_agent text,
  is_active boolean NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Superadmins can view their own sessions
CREATE POLICY "Superadmins can view their sessions"
ON public.admin_sessions
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() AND 
  has_role(auth.uid(), 'superadmin'::app_role)
);

-- Policy: System can insert admin sessions
CREATE POLICY "System can insert admin sessions"
ON public.admin_sessions
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- Policy: Superadmins can update their own sessions
CREATE POLICY "Superadmins can update their sessions"
ON public.admin_sessions
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (user_id = auth.uid() AND has_role(auth.uid(), 'superadmin'::app_role));

-- Create helper function to check if current session is an admin session
CREATE OR REPLACE FUNCTION public.is_admin_session()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_sessions
    WHERE user_id = auth.uid()
      AND is_active = true
      AND expires_at > now()
  );
$$;

-- Update businesses RLS to exclude superadmins in business mode
DROP POLICY IF EXISTS "Users can view businesses they belong to" ON public.businesses;

CREATE POLICY "Users can view businesses they belong to"
ON public.businesses
FOR SELECT
TO authenticated
USING (
  (
    (id IN (SELECT get_user_business_ids(auth.uid())) OR owner_id = auth.uid())
    AND NOT is_admin_session()
  )
  OR
  (has_role(auth.uid(), 'superadmin'::app_role) AND is_admin_session())
);

-- Update conversations RLS to block admin sessions
DROP POLICY IF EXISTS "Business members can view conversations" ON public.conversations;

CREATE POLICY "Business members can view conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  (user_belongs_to_business(auth.uid(), business_id) AND NOT is_admin_session())
  OR
  (has_role(auth.uid(), 'superadmin'::app_role) AND is_admin_session())
);

-- Update messages RLS to block admin sessions
DROP POLICY IF EXISTS "Business members can view messages" ON public.messages;

CREATE POLICY "Business members can view messages"
ON public.messages
FOR SELECT
TO authenticated
USING (
  (user_belongs_to_business(auth.uid(), business_id) AND NOT is_admin_session())
  OR
  (has_role(auth.uid(), 'superadmin'::app_role) AND is_admin_session())
);

-- Update customers RLS to block admin sessions
DROP POLICY IF EXISTS "Business members can view their business customers" ON public.customers;

CREATE POLICY "Business members can view their business customers"
ON public.customers
FOR SELECT
TO authenticated
USING (
  (business_id IN (SELECT business_users.business_id FROM business_users WHERE business_users.user_id = auth.uid()) AND NOT is_admin_session())
  OR
  (has_role(auth.uid(), 'superadmin'::app_role) AND is_admin_session())
);