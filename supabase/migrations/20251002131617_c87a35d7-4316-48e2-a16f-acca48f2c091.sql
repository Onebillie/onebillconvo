-- Add OAuth token fields to calendar_sync_config
ALTER TABLE public.calendar_sync_config 
ADD COLUMN IF NOT EXISTS access_token text,
ADD COLUMN IF NOT EXISTS refresh_token text;

-- Add token expiry tracking
ALTER TABLE public.calendar_sync_config 
ADD COLUMN IF NOT EXISTS token_expires_at timestamp with time zone;

-- Add Google Calendar specific fields
ALTER TABLE public.calendar_sync_config 
ADD COLUMN IF NOT EXISTS calendar_id text DEFAULT 'primary';

-- Add sync status tracking
ALTER TABLE public.calendar_sync_config 
ADD COLUMN IF NOT EXISTS last_sync_error text;

COMMENT ON COLUMN public.calendar_sync_config.access_token IS 'OAuth access token for calendar API';
COMMENT ON COLUMN public.calendar_sync_config.refresh_token IS 'OAuth refresh token for calendar API';
COMMENT ON COLUMN public.calendar_sync_config.token_expires_at IS 'When the access token expires';
COMMENT ON COLUMN public.calendar_sync_config.calendar_id IS 'Google Calendar ID (default: primary)';
COMMENT ON COLUMN public.calendar_sync_config.last_sync_error IS 'Last error message from sync attempt';