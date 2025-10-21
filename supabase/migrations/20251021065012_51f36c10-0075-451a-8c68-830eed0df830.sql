-- Add profile fields for staff editing
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT;

COMMENT ON COLUMN profiles.display_name IS 'Preferred nickname or display name';
COMMENT ON COLUMN profiles.title IS 'Job title or role';
COMMENT ON COLUMN profiles.phone IS 'Contact phone number';
COMMENT ON COLUMN profiles.bio IS 'User bio or about section';