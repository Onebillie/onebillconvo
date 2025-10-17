-- Update handle_new_user function to support adding users to existing businesses
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _business_id uuid;
  _business_name text;
  _existing_business_id uuid;
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
  _existing_business_id := (NEW.raw_user_meta_data->>'business_id')::uuid;
  
  IF _existing_business_id IS NOT NULL THEN
    -- Add user to existing business
    INSERT INTO public.business_users (business_id, user_id, role)
    VALUES (_existing_business_id, NEW.id, COALESCE(NEW.raw_user_meta_data->>'business_role', 'member'))
    ON CONFLICT DO NOTHING;
    
    -- Assign role from metadata
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'agent'::app_role))
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- Create new business for new business owner
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

    -- Assign default agent role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'agent'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;