-- Add columns to track template variables
ALTER TABLE message_templates
ADD COLUMN IF NOT EXISTS variable_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS requires_variables BOOLEAN DEFAULT false;