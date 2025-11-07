-- Add permission levels for API keys (skip if already exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'api_permission_level') THEN
    CREATE TYPE api_permission_level AS ENUM ('read_only', 'agent', 'admin');
  END IF;
END $$;

-- Add permission_level column to api_keys if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'api_keys' AND column_name = 'permission_level'
  ) THEN
    ALTER TABLE api_keys 
    ADD COLUMN permission_level api_permission_level NOT NULL DEFAULT 'admin';
  END IF;
END $$;

-- Update existing embed_sessions table to match new schema
ALTER TABLE embed_sessions 
ADD COLUMN IF NOT EXISTS permission_level api_permission_level NOT NULL DEFAULT 'admin';

ALTER TABLE embed_sessions
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create indexes if they don't exist (fixed: removed now() from predicate)
CREATE INDEX IF NOT EXISTS idx_embed_sessions_token ON embed_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_embed_sessions_expires ON embed_sessions(expires_at);

-- Function to validate embed session
CREATE OR REPLACE FUNCTION is_valid_embed_session(
  _session_token TEXT,
  _required_permission api_permission_level DEFAULT 'read_only'::api_permission_level
)
RETURNS TABLE (
  valid BOOLEAN,
  business_id UUID,
  permission_level api_permission_level
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_record RECORD;
BEGIN
  -- Get session details
  SELECT 
    es.business_id,
    es.permission_level,
    es.expires_at > now() as is_valid
  INTO session_record
  FROM embed_sessions es
  WHERE es.session_token = _session_token
  FOR UPDATE;
  
  -- Check if session exists and is valid
  IF NOT FOUND OR NOT session_record.is_valid THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::api_permission_level;
    RETURN;
  END IF;
  
  -- Check permission level (admin > agent > read_only)
  IF (_required_permission = 'admin' AND session_record.permission_level != 'admin') OR
     (_required_permission = 'agent' AND session_record.permission_level = 'read_only') THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::api_permission_level;
    RETURN;
  END IF;
  
  -- Update last_used_at
  UPDATE embed_sessions 
  SET last_used_at = now() 
  WHERE session_token = _session_token;
  
  -- Return valid session
  RETURN QUERY SELECT true, session_record.business_id, session_record.permission_level;
END;
$$;

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_embed_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM embed_sessions WHERE expires_at < now();
END;
$$;