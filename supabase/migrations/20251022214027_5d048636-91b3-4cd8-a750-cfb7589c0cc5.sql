-- Fix security vulnerability in api_usage_tracking table
-- Remove the overly permissive "System can manage usage tracking" policy
DROP POLICY IF EXISTS "System can manage usage tracking" ON public.api_usage_tracking;

-- Remove duplicate superadmin SELECT policy
DROP POLICY IF EXISTS "Only superadmins can view API usage tracking" ON public.api_usage_tracking;

-- Keep the main superadmin view policy (using has_role function)
-- This policy already exists: "Superadmins can view usage tracking"

-- Add service role policy for backend edge functions to manage tracking
CREATE POLICY "Service role can manage usage tracking" 
ON public.api_usage_tracking 
FOR ALL 
USING (
  auth.jwt()->>'role' = 'service_role'
)
WITH CHECK (
  auth.jwt()->>'role' = 'service_role'
);

-- Add policy for edge functions to insert/update usage tracking
CREATE POLICY "Authenticated service can insert usage tracking" 
ON public.api_usage_tracking 
FOR INSERT 
WITH CHECK (
  auth.jwt()->>'role' = 'service_role'
);

CREATE POLICY "Authenticated service can update usage tracking" 
ON public.api_usage_tracking 
FOR UPDATE 
USING (
  auth.jwt()->>'role' = 'service_role'
)
WITH CHECK (
  auth.jwt()->>'role' = 'service_role'
);