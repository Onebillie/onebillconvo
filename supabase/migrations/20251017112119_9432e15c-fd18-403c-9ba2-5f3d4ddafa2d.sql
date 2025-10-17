-- Step 1: Migrate ademergen@gmail.com to OneBill business
-- Move user from auto-created business to OneBill business

-- Update business_users to point to correct business
UPDATE public.business_users
SET business_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
WHERE user_id = '22798455-f20b-4921-85ca-c4b76cfa06fd'
  AND business_id = '347f2df5-a3a5-4b0d-b713-c15137cfa62a';

-- Delete the orphaned auto-created business
DELETE FROM public.businesses
WHERE id = '347f2df5-a3a5-4b0d-b713-c15137cfa62a';

-- Step 2: Improve the handle_new_user() trigger with better error handling
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
  -- More robust metadata extraction
  _existing_business_id := NULLIF(TRIM(NEW.raw_user_meta_data->>'business_id'), '')::uuid;
  _business_role := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'business_role'), ''), 'member');
  
  -- Log metadata for debugging
  RAISE NOTICE 'handle_new_user: user_id=%, business_id=%, business_role=%', 
    NEW.id, _existing_business_id, _business_role;
  
  IF _existing_business_id IS NOT NULL THEN
    -- Add user to existing business
    INSERT INTO public.business_users (business_id, user_id, role)
    VALUES (_existing_business_id, NEW.id, _business_role)
    ON CONFLICT DO NOTHING;
    
    -- Assign role from metadata
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'agent'::app_role))
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Added user % to existing business %', NEW.id, _existing_business_id;
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
    
    RAISE NOTICE 'Created new business % for user %', _business_id, NEW.id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;