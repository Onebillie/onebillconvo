-- Add notification webhook fields to business_settings
ALTER TABLE business_settings
ADD COLUMN IF NOT EXISTS notification_webhook_url TEXT,
ADD COLUMN IF NOT EXISTS notification_webhook_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_webhook_secret TEXT,
ADD COLUMN IF NOT EXISTS notification_events JSONB DEFAULT '["new_message", "new_inmail"]'::jsonb;