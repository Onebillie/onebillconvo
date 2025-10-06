-- Fix missing business_id in messages and signup flow

-- 1. Add business_id to whatsapp_accounts if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'whatsapp_accounts' 
    AND column_name = 'business_id'
  ) THEN
    ALTER TABLE public.whatsapp_accounts 
    ADD COLUMN business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_whatsapp_accounts_business_id 
    ON public.whatsapp_accounts(business_id);
  END IF;
END $$;

-- 2. Make messages.business_id nullable temporarily to allow backfill
ALTER TABLE public.messages 
ALTER COLUMN business_id DROP NOT NULL;

-- 3. Create function to get or create default business for user
CREATE OR REPLACE FUNCTION public.get_or_create_user_business(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _business_id uuid;
  _user_email text;
BEGIN
  -- Try to get existing business for user
  SELECT business_id INTO _business_id
  FROM public.business_users
  WHERE user_id = _user_id
  LIMIT 1;
  
  -- If no business exists, create one
  IF _business_id IS NULL THEN
    -- Get user email
    SELECT email INTO _user_email
    FROM auth.users
    WHERE id = _user_id;
    
    -- Create default business
    INSERT INTO public.businesses (name, slug, owner_id)
    VALUES (
      COALESCE(_user_email, 'My Business'),
      'business-' || substring(_user_id::text, 1, 8),
      _user_id
    )
    RETURNING id INTO _business_id;
    
    -- Add user as member
    INSERT INTO public.business_users (business_id, user_id, role)
    VALUES (_business_id, _user_id, 'owner')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN _business_id;
END;
$$;

-- 4. Update handle_new_user to create default business
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _business_id uuid;
BEGIN
  -- Ensure profile exists
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'),
    new.email
  )
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        updated_at = now();

  -- Assign default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    new.id,
    COALESCE((new.raw_user_meta_data->>'role')::app_role, 'agent'::app_role)
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Create default business
  _business_id := public.get_or_create_user_business(new.id);

  RETURN new;
END;
$$;

-- 5. Backfill business_id for existing whatsapp_accounts (link to first business)
UPDATE public.whatsapp_accounts wa
SET business_id = (
  SELECT id FROM public.businesses LIMIT 1
)
WHERE wa.business_id IS NULL;

-- 6. Backfill business_id for existing customers (link to first business)
UPDATE public.customers c
SET business_id = (
  SELECT id FROM public.businesses LIMIT 1
)
WHERE c.business_id IS NULL;

-- 7. Backfill business_id for existing conversations (from customer or first business)
UPDATE public.conversations conv
SET business_id = COALESCE(
  (SELECT business_id FROM public.customers WHERE id = conv.customer_id),
  (SELECT id FROM public.businesses LIMIT 1)
)
WHERE conv.business_id IS NULL;

-- 8. Backfill business_id for existing messages (from conversation or customer)
UPDATE public.messages m
SET business_id = COALESCE(
  (SELECT business_id FROM public.conversations WHERE id = m.conversation_id),
  (SELECT business_id FROM public.customers WHERE id = m.customer_id),
  (SELECT id FROM public.businesses LIMIT 1)
)
WHERE m.business_id IS NULL;

-- 9. Update RLS policies for whatsapp_accounts
DROP POLICY IF EXISTS "Business members can view whatsapp accounts" ON public.whatsapp_accounts;
DROP POLICY IF EXISTS "Business admins can manage whatsapp accounts" ON public.whatsapp_accounts;

CREATE POLICY "Business members can view whatsapp accounts"
ON public.whatsapp_accounts
FOR SELECT
TO authenticated
USING (
  user_belongs_to_business(auth.uid(), business_id)
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "Business admins can manage whatsapp accounts"
ON public.whatsapp_accounts
FOR ALL
TO authenticated
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