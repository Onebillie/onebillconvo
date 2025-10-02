-- Add configuration for email sync behavior
ALTER TABLE public.email_accounts 
ADD COLUMN IF NOT EXISTS delete_after_sync boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS mark_as_read boolean NOT NULL DEFAULT false;