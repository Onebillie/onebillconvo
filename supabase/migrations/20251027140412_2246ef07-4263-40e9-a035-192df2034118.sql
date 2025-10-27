-- Add RLS policies for embed_sessions table
-- This secures the widget embed authentication flow

-- Allow public to read only valid (non-expired) sessions
CREATE POLICY "embed_sessions_public_read"
ON public.embed_sessions
FOR SELECT
TO public
USING (expires_at > now());

-- Allow service role to manage all sessions (for edge functions)
CREATE POLICY "embed_sessions_service_manage"
ON public.embed_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);