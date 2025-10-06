-- Phase 1: Security & Foundation - Multi-tenant Architecture
-- This migration adds business_id to all relevant tables and sets up proper tenant isolation

-- Step 1: Remove role from profiles table (security vulnerability fix)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Step 2: Add business_id to all tables that need tenant isolation
-- Note: Adding as nullable first, will populate, then make non-nullable where needed

ALTER TABLE public.whatsapp_accounts ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.email_accounts ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.ai_assistant_config ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.ai_training_data ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.ai_rag_documents ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.message_templates ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.conversation_status_tags ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.contact_tags ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.calendar_sync_config ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;

-- Step 3: Create OneBillChat business record (platform demo/owner business)
INSERT INTO public.businesses (
  id,
  name,
  slug,
  owner_id,
  subscription_tier,
  subscription_status,
  trial_ends_at,
  created_at
)
SELECT 
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid, -- Fixed UUID for OneBillChat
  'OneBillChat',
  'onebillchat',
  id, -- Set to first superadmin user
  'free',
  'active',
  NULL, -- No trial needed
  now()
FROM public.profiles
WHERE has_role(id, 'superadmin'::app_role)
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- Step 4: Link superadmin to OneBillChat business
INSERT INTO public.business_users (business_id, user_id, role)
SELECT 
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
  id,
  'owner'
FROM public.profiles
WHERE has_role(id, 'superadmin'::app_role)
ON CONFLICT (business_id, user_id) DO NOTHING;

-- Step 5: Migrate all existing data to OneBillChat business
UPDATE public.whatsapp_accounts 
SET business_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid 
WHERE business_id IS NULL;

UPDATE public.email_accounts 
SET business_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid 
WHERE business_id IS NULL;

UPDATE public.ai_assistant_config 
SET business_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid 
WHERE business_id IS NULL;

UPDATE public.ai_training_data 
SET business_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid 
WHERE business_id IS NULL;

UPDATE public.ai_rag_documents 
SET business_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid 
WHERE business_id IS NULL;

UPDATE public.message_templates 
SET business_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid 
WHERE business_id IS NULL;

UPDATE public.conversation_status_tags 
SET business_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid 
WHERE business_id IS NULL;

UPDATE public.contact_tags 
SET business_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid 
WHERE business_id IS NULL;

UPDATE public.customers 
SET business_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid 
WHERE business_id IS NULL;

UPDATE public.conversations 
SET business_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid 
WHERE business_id IS NULL;

UPDATE public.messages 
SET business_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid 
WHERE business_id IS NULL;

UPDATE public.tasks 
SET business_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid 
WHERE business_id IS NULL;

UPDATE public.api_keys 
SET business_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid 
WHERE business_id IS NULL;

UPDATE public.calendar_sync_config 
SET business_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid 
WHERE business_id IS NULL;

-- Step 6: Make business_id NOT NULL for critical tables (now that data is migrated)
ALTER TABLE public.whatsapp_accounts ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.email_accounts ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.customers ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.conversations ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.messages ALTER COLUMN business_id SET NOT NULL;

-- Step 7: Update RLS policies for tenant isolation
-- WhatsApp Accounts
DROP POLICY IF EXISTS "Admins can manage WhatsApp accounts" ON public.whatsapp_accounts;
DROP POLICY IF EXISTS "Authenticated users can view WhatsApp accounts" ON public.whatsapp_accounts;

CREATE POLICY "Business members can view WhatsApp accounts"
ON public.whatsapp_accounts FOR SELECT
USING (
  business_id IN (
    SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "Business admins can manage WhatsApp accounts"
ON public.whatsapp_accounts FOR ALL
USING (
  (business_id IN (
    SELECT bu.business_id FROM public.business_users bu
    WHERE bu.user_id = auth.uid() AND bu.role IN ('owner', 'admin')
  ))
  OR has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  (business_id IN (
    SELECT bu.business_id FROM public.business_users bu
    WHERE bu.user_id = auth.uid() AND bu.role IN ('owner', 'admin')
  ))
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- Email Accounts
DROP POLICY IF EXISTS "Admins can manage email accounts" ON public.email_accounts;
DROP POLICY IF EXISTS "Authenticated users can view email accounts" ON public.email_accounts;

CREATE POLICY "Business members can view email accounts"
ON public.email_accounts FOR SELECT
USING (
  business_id IN (
    SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "Business admins can manage email accounts"
ON public.email_accounts FOR ALL
USING (
  (business_id IN (
    SELECT bu.business_id FROM public.business_users bu
    WHERE bu.user_id = auth.uid() AND bu.role IN ('owner', 'admin')
  ))
  OR has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  (business_id IN (
    SELECT bu.business_id FROM public.business_users bu
    WHERE bu.user_id = auth.uid() AND bu.role IN ('owner', 'admin')
  ))
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- Customers
DROP POLICY IF EXISTS "Authenticated users can create customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can delete customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;

CREATE POLICY "Business members can view customers"
ON public.customers FOR SELECT
USING (
  business_id IN (
    SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "Business members can manage customers"
ON public.customers FOR ALL
USING (
  business_id IN (
    SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  business_id IN (
    SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- Conversations
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can delete conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can update conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can view conversations" ON public.conversations;

CREATE POLICY "Business members can view conversations"
ON public.conversations FOR SELECT
USING (
  business_id IN (
    SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "Business members can manage conversations"
ON public.conversations FOR ALL
USING (
  business_id IN (
    SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  business_id IN (
    SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- Messages
DROP POLICY IF EXISTS "Authenticated users can create messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can delete messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can update messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can view messages" ON public.messages;

CREATE POLICY "Business members can view messages"
ON public.messages FOR SELECT
USING (
  business_id IN (
    SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "Business members can manage messages"
ON public.messages FOR ALL
USING (
  business_id IN (
    SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  business_id IN (
    SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- AI Assistant Config
DROP POLICY IF EXISTS "Admins can manage AI config" ON public.ai_assistant_config;
DROP POLICY IF EXISTS "Authenticated users can view AI config" ON public.ai_assistant_config;

CREATE POLICY "Business members can view AI config"
ON public.ai_assistant_config FOR SELECT
USING (
  business_id IN (
    SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "Business admins can manage AI config"
ON public.ai_assistant_config FOR ALL
USING (
  (business_id IN (
    SELECT bu.business_id FROM public.business_users bu
    WHERE bu.user_id = auth.uid() AND bu.role IN ('owner', 'admin')
  ))
  OR has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  (business_id IN (
    SELECT bu.business_id FROM public.business_users bu
    WHERE bu.user_id = auth.uid() AND bu.role IN ('owner', 'admin')
  ))
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_accounts_business_id ON public.whatsapp_accounts(business_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_business_id ON public.email_accounts(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_business_id ON public.customers(business_id);
CREATE INDEX IF NOT EXISTS idx_conversations_business_id ON public.conversations(business_id);
CREATE INDEX IF NOT EXISTS idx_messages_business_id ON public.messages(business_id);
CREATE INDEX IF NOT EXISTS idx_tasks_business_id ON public.tasks(business_id);

-- Add comment for documentation
COMMENT ON COLUMN public.whatsapp_accounts.business_id IS 'Links WhatsApp account to a specific business for multi-tenant isolation';
COMMENT ON COLUMN public.email_accounts.business_id IS 'Links email account to a specific business for multi-tenant isolation';
COMMENT ON COLUMN public.customers.business_id IS 'Links customer to a specific business for multi-tenant isolation';