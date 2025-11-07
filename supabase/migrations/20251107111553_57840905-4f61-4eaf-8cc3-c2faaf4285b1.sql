-- Fix search_path security issue for is_valid_embed_session function
CREATE OR REPLACE FUNCTION public.is_valid_embed_session(token text)
RETURNS TABLE (
  is_valid boolean,
  business_id uuid,
  permission_level text,
  required_permission text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN es.id IS NOT NULL 
        AND es.expires_at > NOW() 
        AND (es.revoked_at IS NULL OR es.revoked_at > NOW())
      THEN true
      ELSE false
    END as is_valid,
    es.business_id,
    es.permission_level,
    'read_only'::text as required_permission
  FROM public.embed_sessions es
  WHERE es.session_token = token
  LIMIT 1;
  
  -- Update last_used_at if session is valid
  UPDATE public.embed_sessions
  SET last_used_at = NOW()
  WHERE session_token = token
    AND expires_at > NOW()
    AND (revoked_at IS NULL OR revoked_at > NOW());
END;
$$;