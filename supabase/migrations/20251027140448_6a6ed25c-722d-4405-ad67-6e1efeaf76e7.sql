-- Secure database functions by adding SET search_path to prevent SQL injection
-- Drop and recreate functions to ensure proper type handling

-- Drop existing functions first
DROP FUNCTION IF EXISTS public.trigger_email_sync() CASCADE;
DROP FUNCTION IF EXISTS public.check_low_voice_credits() CASCADE;
DROP FUNCTION IF EXISTS public.notify_task_assignment() CASCADE;

-- Recreate trigger_email_sync function with security fix
CREATE OR REPLACE FUNCTION public.trigger_email_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/email-sync',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('account_id', NEW.id)
  );
  RETURN NEW;
END;
$function$;

-- Recreate check_low_voice_credits function with security fix
CREATE OR REPLACE FUNCTION public.check_low_voice_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.voice_credits_balance < 5.00 AND (OLD.voice_credits_balance IS NULL OR OLD.voice_credits_balance >= 5.00) THEN
    INSERT INTO notifications (business_id, type, title, message)
    VALUES (
      NEW.id,
      'voice_credit_low',
      'Low Voice Credits',
      'Your voice credits are running low. Please top up to continue making calls.'
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Recreate notify_task_assignment function with security fix
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to != NEW.assigned_to) THEN
    INSERT INTO notifications (user_id, business_id, type, title, message, metadata)
    VALUES (
      NEW.assigned_to,
      NEW.business_id,
      'task_assigned',
      'New Task Assigned',
      'You have been assigned a new task: ' || NEW.title,
      jsonb_build_object('task_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$function$;