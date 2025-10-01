-- Fix security vulnerability: Restrict access to messages table
-- Only authenticated users (staff) should be able to access customer messages

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow all operations on messages" ON public.messages;

-- Create proper authentication-based policies
-- Only authenticated users can view messages
CREATE POLICY "Authenticated users can view messages"
ON public.messages
FOR SELECT
TO authenticated
USING (true);

-- Only authenticated users can create messages
CREATE POLICY "Authenticated users can create messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Only authenticated users can update messages
CREATE POLICY "Authenticated users can update messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Only authenticated users can delete messages
CREATE POLICY "Authenticated users can delete messages"
ON public.messages
FOR DELETE
TO authenticated
USING (true);