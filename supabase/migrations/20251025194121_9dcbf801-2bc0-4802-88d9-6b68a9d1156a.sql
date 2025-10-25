-- Add Twilio credential columns to call_settings table
ALTER TABLE public.call_settings
ADD COLUMN IF NOT EXISTS twilio_account_sid TEXT,
ADD COLUMN IF NOT EXISTS twilio_auth_token TEXT,
ADD COLUMN IF NOT EXISTS twilio_api_key TEXT,
ADD COLUMN IF NOT EXISTS twilio_api_secret TEXT,
ADD COLUMN IF NOT EXISTS twilio_twiml_app_sid TEXT;

COMMENT ON COLUMN public.call_settings.twilio_account_sid IS 'Twilio Account SID - stored encrypted';
COMMENT ON COLUMN public.call_settings.twilio_auth_token IS 'Twilio Auth Token - stored encrypted';
COMMENT ON COLUMN public.call_settings.twilio_api_key IS 'Twilio API Key - stored encrypted';
COMMENT ON COLUMN public.call_settings.twilio_api_secret IS 'Twilio API Secret - stored encrypted';
COMMENT ON COLUMN public.call_settings.twilio_twiml_app_sid IS 'Twilio TwiML App SID - stored encrypted';