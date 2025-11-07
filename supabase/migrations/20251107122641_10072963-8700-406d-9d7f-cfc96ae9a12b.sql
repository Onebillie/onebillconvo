-- Add customer_id column to api_keys for customer-scoped embed keys
ALTER TABLE public.api_keys 
ADD COLUMN IF NOT EXISTS customer_id uuid;

-- Add foreign key constraint to customers table
ALTER TABLE public.api_keys 
ADD CONSTRAINT api_keys_customer_fkey 
FOREIGN KEY (customer_id) 
REFERENCES public.customers(id) 
ON DELETE SET NULL 
DEFERRABLE INITIALLY DEFERRED;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_customer_id 
ON public.api_keys(customer_id) 
WHERE customer_id IS NOT NULL;

COMMENT ON COLUMN public.api_keys.customer_id IS 'If set, this API key is scoped to only access data for this specific customer';