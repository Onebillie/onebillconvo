-- Part 1: Fix Elvis's app role immediately
DELETE FROM public.user_roles 
WHERE user_id = 'a7b31dfd-62f2-4945-a9a8-a6e9d5044257' 
  AND role = 'agent'::app_role;

INSERT INTO public.user_roles (user_id, role) 
VALUES ('a7b31dfd-62f2-4945-a9a8-a6e9d5044257', 'admin'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;

-- Part 2: Migrate all current business owners to admin role
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT bu.user_id, 'admin'::app_role
FROM public.business_users bu
WHERE bu.role = 'owner'
  AND bu.user_id NOT IN (
    SELECT user_id 
    FROM public.user_roles 
    WHERE role IN ('admin'::app_role, 'superadmin'::app_role)
  )
ON CONFLICT (user_id, role) DO NOTHING;

-- Part 3: Create trigger to auto-assign admin when user becomes owner
CREATE OR REPLACE FUNCTION public.assign_admin_on_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.role = 'owner' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Auto-assigned admin role to user % (became owner)', NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_admin_on_owner ON public.business_users;

CREATE TRIGGER trg_assign_admin_on_owner
  AFTER INSERT OR UPDATE OF role ON public.business_users
  FOR EACH ROW
  WHEN (NEW.role = 'owner')
  EXECUTE FUNCTION public.assign_admin_on_owner();

-- Part 4: Fix handle_new_user() to assign admin to new business owners
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _business_id uuid;
  _business_name text;
  _existing_business_id uuid;
  _business_role text;
  _app_role app_role;
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

  -- Check if user should be added to an existing business (for staff members)
  _existing_business_id := NULLIF(TRIM(NEW.raw_user_meta_data->>'business_id'), '')::uuid;
  _business_role := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'business_role'), ''), 'member');
  
  RAISE NOTICE 'handle_new_user: user_id=%, business_id=%, business_role=%', 
    NEW.id, _existing_business_id, _business_role;
  
  IF _existing_business_id IS NOT NULL THEN
    -- User is being added to existing business (staff member)
    INSERT INTO public.business_users (business_id, user_id, role)
    VALUES (_existing_business_id, NEW.id, _business_role)
    ON CONFLICT DO NOTHING;
    
    -- Assign app role from metadata, default to agent for staff
    _app_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'agent'::app_role);
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, _app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Added user % to existing business % with app role %', NEW.id, _existing_business_id, _app_role;
  ELSE
    -- User is creating their own business (new business owner)
    _business_name := COALESCE(
      NEW.raw_user_meta_data->>'business_name',
      NEW.raw_user_meta_data->>'full_name',
      'My Business'
    );

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

    -- Add user as business owner
    INSERT INTO public.business_users (business_id, user_id, role)
    VALUES (_business_id, NEW.id, 'owner');

    -- CRITICAL FIX: Assign 'admin' role to business owners, not 'agent'
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Created new business % for user % with admin role', _business_id, NEW.id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;