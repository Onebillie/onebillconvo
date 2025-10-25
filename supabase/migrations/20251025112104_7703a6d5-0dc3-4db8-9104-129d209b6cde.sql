-- Add missing columns to widget_customization table
ALTER TABLE public.widget_customization 
ADD COLUMN IF NOT EXISTS require_contact_info BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sound_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS start_minimized BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS widget_shape TEXT DEFAULT 'circle',
ADD COLUMN IF NOT EXISTS welcome_message TEXT DEFAULT 'Hi! How can we help you today?';

-- Update existing rows to have the new defaults
UPDATE public.widget_customization 
SET 
  require_contact_info = COALESCE(require_contact_info, true),
  sound_notifications = COALESCE(sound_notifications, true),
  start_minimized = COALESCE(start_minimized, true),
  widget_shape = COALESCE(widget_shape, 'circle'),
  welcome_message = COALESCE(welcome_message, 'Hi! How can we help you today?')
WHERE require_contact_info IS NULL 
   OR sound_notifications IS NULL 
   OR start_minimized IS NULL 
   OR widget_shape IS NULL 
   OR welcome_message IS NULL;