-- Update the sync_all_email_accounts function to call the appropriate edge function based on inbound_method
CREATE OR REPLACE FUNCTION public.sync_all_email_accounts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  account_record RECORD;
  function_name TEXT;
BEGIN
  -- Loop through all active email accounts with sync enabled
  FOR account_record IN 
    SELECT id, inbound_method FROM public.email_accounts 
    WHERE is_active = true AND sync_enabled = true
  LOOP
    -- Determine which edge function to call based on inbound_method
    IF account_record.inbound_method = 'pop3' THEN
      function_name := 'email-sync-pop3';
    ELSE
      function_name := 'email-sync';
    END IF;
    
    -- Invoke the appropriate edge function
    PERFORM net.http_post(
      url := 'https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/' || function_name,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpydGxybmZkcWZramxrcGZpcnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTQ5NTcsImV4cCI6MjA3Mzc3MDk1N30.9mXWW_V8jJEjxiohExZWrh4rNRlKf2yocahkSNkjJHs'
      ),
      body := jsonb_build_object('account_id', account_record.id)
    );
  END LOOP;
END;
$function$;