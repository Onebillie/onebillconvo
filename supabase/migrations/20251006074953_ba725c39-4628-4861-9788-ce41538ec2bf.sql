-- Add address and whatsapp_phone fields to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS whatsapp_phone text;

-- Add comment for clarity
COMMENT ON COLUMN public.customers.whatsapp_phone IS 'WhatsApp phone number, separate from main phone';
COMMENT ON COLUMN public.customers.address IS 'Customer physical address';