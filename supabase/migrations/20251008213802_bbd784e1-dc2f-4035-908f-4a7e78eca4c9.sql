-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule IMAP email sync every 5 minutes
SELECT cron.schedule(
  'email-sync-imap-auto',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/email-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpydGxybmZkcWZramxrcGZpcnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTQ5NTcsImV4cCI6MjA3Mzc3MDk1N30.9mXWW_V8jJEjxiohExZWrh4rNRlKf2yocahkSNkjJHs'::jsonb,
    body := '{"auto_sync": true}'::jsonb
  ) as request_id;
  $$
);

-- Schedule POP3 email sync every 5 minutes
SELECT cron.schedule(
  'email-sync-pop3-auto',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/email-sync-pop3',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpydGxybmZkcWZramxrcGZpcnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTQ5NTcsImV4cCI6MjA3Mzc3MDk1N30.9mXWW_V8jJEjxiohExZWrh4rNRlKf2yocahkSNkjJHs'::jsonb,
    body := '{"auto_sync": true}'::jsonb
  ) as request_id;
  $$
);