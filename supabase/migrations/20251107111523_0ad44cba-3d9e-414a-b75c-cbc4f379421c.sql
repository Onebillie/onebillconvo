-- Add missing columns to embed_sessions table
ALTER TABLE public.embed_sessions
ADD COLUMN IF NOT EXISTS business_id uuid,
ADD COLUMN IF NOT EXISTS api_key_id uuid,
ADD COLUMN IF NOT EXISTS last_used_at timestamptz;

-- Create unique index on session_token if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS embed_sessions_session_token_unique 
ON public.embed_sessions(session_token);

-- Add foreign key constraints (recommended for data integrity)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'embed_sessions_business_fkey'
  ) THEN
    ALTER TABLE public.embed_sessions
    ADD CONSTRAINT embed_sessions_business_fkey
      FOREIGN KEY (business_id) REFERENCES public.businesses(id) 
      ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'embed_sessions_api_key_fkey'
  ) THEN
    ALTER TABLE public.embed_sessions
    ADD CONSTRAINT embed_sessions_api_key_fkey
      FOREIGN KEY (api_key_id) REFERENCES public.api_keys(id) 
      ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

-- Recreate is_valid_embed_session function to ensure compatibility
CREATE OR REPLACE FUNCTION public.is_valid_embed_session(token text)
RETURNS TABLE (
  is_valid boolean,
  business_id uuid,
  permission_level text,
  required_permission text
)
LANGUAGE plpgsql
SECURITY DEFINER
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