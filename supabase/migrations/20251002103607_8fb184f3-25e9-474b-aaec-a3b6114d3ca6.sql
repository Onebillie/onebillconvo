-- Add alternate_emails field to customers table for multiple email addresses
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS alternate_emails TEXT[] DEFAULT '{}';

-- Add index for better performance when searching alternate emails
CREATE INDEX IF NOT EXISTS idx_customers_alternate_emails ON public.customers USING GIN(alternate_emails);

COMMENT ON COLUMN public.customers.alternate_emails IS 'Additional email addresses associated with this customer';