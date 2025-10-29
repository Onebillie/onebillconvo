-- Fix conversations unique index to allow multiple closed conversations per customer
-- but only one active conversation

-- Drop the problematic unconditional unique index if it exists
DROP INDEX IF EXISTS public.ux_conversations_unique_active;
DROP INDEX IF EXISTS public.conversations_customer_id_key;

-- Create the correct partial unique index
-- This allows multiple conversations per customer but only one with status='active'
CREATE UNIQUE INDEX ux_conversations_unique_active 
ON public.conversations (customer_id) 
WHERE status = 'active';