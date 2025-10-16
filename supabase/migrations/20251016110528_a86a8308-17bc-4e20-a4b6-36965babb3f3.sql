-- Fix RLS policies for messages and conversations to allow business members to see data

-- Drop and recreate messages view policy
DROP POLICY IF EXISTS "Business members can view messages" ON public.messages;
CREATE POLICY "Business members can view messages"
ON public.messages
FOR SELECT
USING (
  user_belongs_to_business(auth.uid(), business_id) 
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- Drop and recreate conversations view policy  
DROP POLICY IF EXISTS "Business members can view conversations" ON public.conversations;
CREATE POLICY "Business members can view conversations"
ON public.conversations
FOR SELECT
USING (
  user_belongs_to_business(auth.uid(), business_id)
  OR has_role(auth.uid(), 'superadmin'::app_role)
);