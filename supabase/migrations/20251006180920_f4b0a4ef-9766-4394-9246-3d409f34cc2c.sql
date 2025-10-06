-- Fix email_sync_logs public exposure vulnerability
-- Drop the overly permissive policy that allows any authenticated user to view all sync logs
DROP POLICY IF EXISTS "Authenticated users can view sync logs" ON public.email_sync_logs;

-- Create a restrictive policy that only allows business members to view their own sync logs
CREATE POLICY "Business members can view their sync logs"
ON public.email_sync_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.email_accounts ea
    WHERE ea.id = email_sync_logs.email_account_id
      AND user_belongs_to_business(auth.uid(), ea.business_id)
  )
  OR has_role(auth.uid(), 'superadmin'::app_role)
);