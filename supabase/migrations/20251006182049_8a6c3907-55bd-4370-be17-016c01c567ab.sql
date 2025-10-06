-- Add subscription tracking columns for Stripe integration
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS is_frozen boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS seat_count integer DEFAULT 1;

-- Add index for performance on frozen accounts check
CREATE INDEX IF NOT EXISTS idx_businesses_is_frozen ON public.businesses(is_frozen);
CREATE INDEX IF NOT EXISTS idx_businesses_stripe_customer_id ON public.businesses(stripe_customer_id);

-- Add onboarding completion tracking
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Update RLS policies to check frozen status
CREATE OR REPLACE FUNCTION public.is_account_frozen(_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_frozen
  FROM public.businesses
  WHERE id = _business_id
$$;