-- Enable pg_cron and pg_net extensions for scheduled email sync
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function to sync all email accounts
CREATE OR REPLACE FUNCTION public.trigger_email_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  account_record RECORD;
BEGIN
  -- Loop through all active email accounts with sync enabled
  FOR account_record IN 
    SELECT id FROM public.email_accounts 
    WHERE is_active = true AND sync_enabled = true
  LOOP
    -- Invoke the email-sync edge function for each account
    PERFORM net.http_post(
      url := 'https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/email-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpydGxybmZkcWZramxrcGZpcnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTQ5NTcsImV4cCI6MjA3Mzc3MDk1N30.9mXWW_V8jJEjxiohExZWrh4rNRlKf2yocahkSNkjJHs'
      ),
      body := jsonb_build_object('account_id', account_record.id)
    );
  END LOOP;
END;
$function$;

-- Schedule email sync to run every 2 minutes
SELECT cron.schedule(
  'email-sync-every-2-minutes',
  '*/2 * * * *', -- every 2 minutes
  $$
  SELECT public.trigger_email_sync();
  $$
);