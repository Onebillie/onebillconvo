-- Create whatsapp_accounts table for multi-business support
CREATE TABLE public.whatsapp_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  business_account_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  verify_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.whatsapp_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage WhatsApp accounts"
ON public.whatsapp_accounts
FOR ALL
USING (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view WhatsApp accounts"
ON public.whatsapp_accounts
FOR SELECT
USING (true);

-- Add whatsapp_account_id to conversations
ALTER TABLE public.conversations
ADD COLUMN whatsapp_account_id UUID REFERENCES public.whatsapp_accounts(id);

-- Create index for performance
CREATE INDEX idx_conversations_whatsapp_account ON public.conversations(whatsapp_account_id);

-- Update trigger for whatsapp_accounts
CREATE TRIGGER update_whatsapp_accounts_updated_at
BEFORE UPDATE ON public.whatsapp_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();