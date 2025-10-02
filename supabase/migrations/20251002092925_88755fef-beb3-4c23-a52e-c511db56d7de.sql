-- Enable pg_cron and pg_net extensions for scheduled email syncing
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function to invoke email sync for all active accounts
CREATE OR REPLACE FUNCTION public.sync_all_email_accounts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Schedule email sync every 5 minutes
SELECT cron.schedule(
  'sync-emails-every-5-minutes',
  '*/5 * * * *', -- Every 5 minutes
  $$SELECT public.sync_all_email_accounts();$$
);