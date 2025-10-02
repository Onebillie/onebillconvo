-- Add email signature field to business_settings
ALTER TABLE public.business_settings 
ADD COLUMN email_signature TEXT;