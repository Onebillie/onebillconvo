-- Phase 2: Fix Database Schema Errors

-- Add team_id to team_members if it doesn't exist
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);

-- Add completed to tasks if it doesn't exist
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT false;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);

-- Phase 3: Fix Function Search Paths
-- Recreate functions with explicit search_path

CREATE OR REPLACE FUNCTION public.normalize_phone(phone_num text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN REGEXP_REPLACE(REGEXP_REPLACE(phone_num, '^\+', ''), '^00', '');
END;
$function$;

CREATE OR REPLACE FUNCTION public.normalize_customer_phone_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.phone = public.normalize_phone(NEW.phone);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_site_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN 'site_' || substring(md5(random()::text) from 1 for 12);
END;
$function$;