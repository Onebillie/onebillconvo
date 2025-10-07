-- Add credit balance column to businesses table for credit bundle purchases
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS credit_balance integer DEFAULT 0;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_businesses_credit_balance ON public.businesses(credit_balance);

-- Add comment
COMMENT ON COLUMN public.businesses.credit_balance IS 'Additional message credits purchased outside of subscription';
