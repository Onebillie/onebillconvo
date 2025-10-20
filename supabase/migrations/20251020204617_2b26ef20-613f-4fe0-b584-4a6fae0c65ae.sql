-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule trial ending email check to run daily at 9 AM UTC
SELECT cron.schedule(
  'check-trial-ending-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/send-trial-ending-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpydGxybmZkcWZramxrcGZpcnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTQ5NTcsImV4cCI6MjA3Mzc3MDk1N30.9mXWW_V8jJEjxiohExZWrh4rNRlKf2yocahkSNkjJHs'
    ),
    body := jsonb_build_object()
  );
  $$
);

-- Schedule renewal reminder check to run daily at 9 AM UTC
SELECT cron.schedule(
  'check-renewal-reminder-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/send-renewal-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpydGxybmZkcWZramxrcGZpcnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTQ5NTcsImV4cCI6MjA3Mzc3MDk1N30.9mXWW_V8jJEjxiohExZWrh4rNRlKf2yocahkSNkjJHs'
    ),
    body := jsonb_build_object()
  );
  $$
);

-- Schedule email sync to run every 5 minutes for all active accounts
SELECT cron.schedule(
  'sync-email-accounts',
  '*/5 * * * *',
  $$
  SELECT public.sync_all_email_accounts();
  $$
);

-- Schedule auto top-up check to run every hour
SELECT cron.schedule(
  'check-auto-topup-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/check-auto-topup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpydGxybmZkcWZramxrcGZpcnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTQ5NTcsImV4cCI6MjA3Mzc3MDk1N30.9mXWW_V8jJEjxiohExZWrh4rNRlKf2yocahkSNkjJHs'
    ),
    body := jsonb_build_object()
  );
  $$
);

-- Schedule credit warning check to run every 6 hours
SELECT cron.schedule(
  'check-credit-warning',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/check-credit-warning',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpydGxybmZkcWZramxrcGZpcnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTQ5NTcsImV4cCI6MjA3Mzc3MDk1N30.9mXWW_V8jJEjxiohExZWrh4rNRlKf2yocahkSNkjJHs'
    ),
    body := jsonb_build_object()
  );
  $$
);

-- Schedule weekly usage report to run every Monday at 10 AM UTC
SELECT cron.schedule(
  'send-weekly-usage-report',
  '0 10 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/send-weekly-usage-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpydGxybmZkcWZramxrcGZpcnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTQ5NTcsImV4cCI6MjA3Mzc3MDk1N30.9mXWW_V8jJEjxiohExZWrh4rNRlKf2yocahkSNkjJHs'
    ),
    body := jsonb_build_object()
  );
  $$
);