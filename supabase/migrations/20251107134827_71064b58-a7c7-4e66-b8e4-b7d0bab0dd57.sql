-- Add customer webhook configuration to business_settings
ALTER TABLE business_settings
ADD COLUMN IF NOT EXISTS customer_webhook_url TEXT,
ADD COLUMN IF NOT EXISTS customer_webhook_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS customer_webhook_secret TEXT;