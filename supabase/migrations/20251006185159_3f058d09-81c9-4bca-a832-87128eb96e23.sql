-- Fix AI Training Data Security Issue
-- Restrict access to only business members who own the training data

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view training data" ON public.ai_training_data;

-- Create restrictive SELECT policy that only allows business members to view their own training data
CREATE POLICY "Business members can view their business training data"
ON public.ai_training_data
FOR SELECT
TO authenticated
USING (
  business_id IN (
    SELECT business_id 
    FROM public.business_users 
    WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- Also update the management policy to be more granular
DROP POLICY IF EXISTS "Admins can manage training data" ON public.ai_training_data;

-- Business admins can manage their business training data
CREATE POLICY "Business admins can manage training data"
ON public.ai_training_data
FOR ALL
TO authenticated
USING (
  (
    business_id IN (
      SELECT bu.business_id
      FROM public.business_users bu
      WHERE bu.user_id = auth.uid()
        AND bu.role IN ('owner', 'admin')
    )
  )
  OR has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  (
    business_id IN (
      SELECT bu.business_id
      FROM public.business_users bu
      WHERE bu.user_id = auth.uid()
        AND bu.role IN ('owner', 'admin')
    )
  )
  OR has_role(auth.uid(), 'superadmin'::app_role)
);