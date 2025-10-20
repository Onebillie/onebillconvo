-- Fix RLS policy for api_usage_tracking table
-- This table contains system-wide usage data and should only be accessible to superadmins

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their business API usage" ON public.api_usage_tracking;
DROP POLICY IF EXISTS "Allow public read" ON public.api_usage_tracking;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.api_usage_tracking;
DROP POLICY IF EXISTS "Only admins can view API usage tracking" ON public.api_usage_tracking;

-- Create superadmin-only access policy
CREATE POLICY "Only superadmins can view API usage tracking"
ON public.api_usage_tracking
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'superadmin'
  )
);

-- Ensure RLS is enabled
ALTER TABLE public.api_usage_tracking ENABLE ROW LEVEL SECURITY;