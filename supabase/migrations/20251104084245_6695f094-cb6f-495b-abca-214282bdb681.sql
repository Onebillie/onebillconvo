-- CRITICAL FIX: Add business_id to business_settings for data isolation
-- This prevents GDPR violations by ensuring each business sees only their own settings

-- Step 1: Add business_id column
ALTER TABLE public.business_settings
ADD COLUMN business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;

-- Step 2: Link existing OneBillChat record to OneBillChat business
UPDATE public.business_settings
SET business_id = (SELECT id FROM businesses WHERE slug = 'onebillchat')
WHERE id = 'e3f3b273-cc29-42f7-acbf-95b57e956bbd';

-- Step 3: Create business_settings for Graceland (Elvis) with blank defaults
INSERT INTO public.business_settings (
  business_id,
  company_name,
  whatsapp_status
)
SELECT 
  id,
  name,
  'Available 24/7'
FROM businesses
WHERE slug = 'business-a7b31dfd'
ON CONFLICT DO NOTHING;

-- Step 4: Create settings for any other businesses that don't have one
INSERT INTO public.business_settings (
  business_id,
  company_name,
  whatsapp_status
)
SELECT 
  b.id,
  b.name,
  'Available 24/7'
FROM businesses b
LEFT JOIN business_settings bs ON bs.business_id = b.id
WHERE bs.id IS NULL;

-- Step 5: Make business_id NOT NULL after data migration
ALTER TABLE public.business_settings
ALTER COLUMN business_id SET NOT NULL;

-- Step 6: Add unique constraint to prevent duplicate settings per business
ALTER TABLE public.business_settings
ADD CONSTRAINT business_settings_business_id_unique UNIQUE (business_id);

-- Step 7: Drop old permissive RLS policies that allowed data leakage
DROP POLICY IF EXISTS "Anyone can view business settings" ON public.business_settings;
DROP POLICY IF EXISTS "Admins can update business settings" ON public.business_settings;
DROP POLICY IF EXISTS "Admins can insert business settings" ON public.business_settings;

-- Step 8: Create proper business-isolated RLS policies
CREATE POLICY "Users can view their business settings"
  ON public.business_settings FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Business admins can update their settings"
  ON public.business_settings FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
    AND (
      has_role(auth.uid(), 'superadmin'::app_role) 
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Business admins can insert settings"
  ON public.business_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
    AND (
      has_role(auth.uid(), 'superadmin'::app_role) 
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  );

-- Step 9: Add index for performance
CREATE INDEX IF NOT EXISTS idx_business_settings_business_id 
  ON public.business_settings(business_id);