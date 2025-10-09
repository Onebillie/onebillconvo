-- Add device fingerprint and extend admin session duration
ALTER TABLE admin_sessions 
ADD COLUMN IF NOT EXISTS device_fingerprint text,
ADD COLUMN IF NOT EXISTS device_name text,
ADD COLUMN IF NOT EXISTS is_trusted boolean DEFAULT false;

-- Extend default expiration to 30 days for trusted devices
ALTER TABLE admin_sessions 
ALTER COLUMN expires_at SET DEFAULT (now() + interval '30 days');

-- Create index for faster device fingerprint lookups
CREATE INDEX IF NOT EXISTS idx_admin_sessions_device_fingerprint 
ON admin_sessions(user_id, device_fingerprint) 
WHERE is_active = true;

-- Create index for trusted device lookups
CREATE INDEX IF NOT EXISTS idx_admin_sessions_trusted 
ON admin_sessions(user_id, is_trusted, device_fingerprint) 
WHERE is_active = true AND is_trusted = true;

-- Function to check if device is trusted
CREATE OR REPLACE FUNCTION public.is_device_trusted(_user_id uuid, _device_fingerprint text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_sessions
    WHERE user_id = _user_id
      AND device_fingerprint = _device_fingerprint
      AND is_trusted = true
      AND is_active = true
      AND expires_at > now()
  );
$$;