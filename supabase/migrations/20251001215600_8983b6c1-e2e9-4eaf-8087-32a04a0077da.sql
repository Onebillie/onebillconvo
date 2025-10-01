-- Add email configuration fields to business_settings
ALTER TABLE public.business_settings
ADD COLUMN IF NOT EXISTS from_email text,
ADD COLUMN IF NOT EXISTS reply_to_email text,
ADD COLUMN IF NOT EXISTS email_subject_template text DEFAULT 'Message from {{company_name}}';

COMMENT ON COLUMN public.business_settings.from_email IS 'Email address to use in the From field';
COMMENT ON COLUMN public.business_settings.reply_to_email IS 'Email address to use in the Reply-To field';
COMMENT ON COLUMN public.business_settings.email_subject_template IS 'Email subject template with {{company_name}} placeholder';