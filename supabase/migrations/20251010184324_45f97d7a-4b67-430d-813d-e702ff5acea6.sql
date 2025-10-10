-- Update handle_new_user trigger to properly create business ownership
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _business_id uuid;
  _business_name text;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        updated_at = now();

  -- Determine business name
  _business_name := COALESCE(
    NEW.raw_user_meta_data->>'business_name',
    NEW.raw_user_meta_data->>'full_name',
    'My Business'
  );

  -- Create business with user as owner
  INSERT INTO public.businesses (
    name,
    slug,
    owner_id,
    subscription_tier,
    subscription_status
  )
  VALUES (
    _business_name,
    'business-' || substring(NEW.id::text, 1, 8),
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'selected_plan')::text, 'free'),
    'trialing'
  )
  RETURNING id INTO _business_id;

  -- Add user as business owner in business_users
  INSERT INTO public.business_users (business_id, user_id, role)
  VALUES (_business_id, NEW.id, 'owner');

  -- Assign default agent role (not superadmin/admin)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'agent'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update RLS policies for business_users
-- Only superadmins can modify business memberships
DROP POLICY IF EXISTS "Business owners can manage members" ON public.business_users;
DROP POLICY IF EXISTS "Users can view business memberships" ON public.business_users;

CREATE POLICY "Superadmins can manage business memberships"
  ON public.business_users
  FOR ALL
  USING (has_role(auth.uid(), 'superadmin'))
  WITH CHECK (has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Users can view their business memberships"
  ON public.business_users
  FOR SELECT
  USING (
    user_id = auth.uid() 
    OR has_role(auth.uid(), 'superadmin')
  );

-- Update RLS policies for businesses
-- Business owners can view and update their business
-- Superadmins can do everything
DROP POLICY IF EXISTS "Business owners can update their businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can create businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can view businesses they belong to" ON public.businesses;

CREATE POLICY "Users can create their own business"
  ON public.businesses
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Business owners can view their business"
  ON public.businesses
  FOR SELECT
  USING (
    owner_id = auth.uid()
    OR id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'superadmin')
  );

CREATE POLICY "Business owners can update their business"
  ON public.businesses
  FOR UPDATE
  USING (owner_id = auth.uid() OR has_role(auth.uid(), 'superadmin'))
  WITH CHECK (owner_id = auth.uid() OR has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can delete businesses"
  ON public.businesses
  FOR DELETE
  USING (has_role(auth.uid(), 'superadmin'));

-- Ensure user_roles can only be modified by superadmins
-- Update the existing policies
DROP POLICY IF EXISTS "Superadmins can manage all roles" ON public.user_roles;

CREATE POLICY "Superadmins can manage all roles"
  ON public.user_roles
  FOR ALL
  USING (has_role(auth.uid(), 'superadmin'))
  WITH CHECK (has_role(auth.uid(), 'superadmin'));