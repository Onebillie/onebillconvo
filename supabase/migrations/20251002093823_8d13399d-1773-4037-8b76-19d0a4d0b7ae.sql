-- Add platform field to message_templates for better organization
ALTER TABLE public.message_templates 
ADD COLUMN IF NOT EXISTS platform text DEFAULT 'text' CHECK (platform IN ('whatsapp', 'email', 'text'));

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_message_templates_platform ON public.message_templates(platform);
CREATE INDEX IF NOT EXISTS idx_message_templates_category ON public.message_templates(category);
CREATE INDEX IF NOT EXISTS idx_message_templates_name ON public.message_templates(name);