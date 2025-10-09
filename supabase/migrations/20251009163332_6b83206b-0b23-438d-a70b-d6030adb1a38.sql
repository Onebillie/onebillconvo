-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Schedule monthly message counter reset (1st of every month at 00:00 UTC)
SELECT cron.schedule(
  'reset-message-counters-monthly',
  '0 0 1 * *', -- At 00:00 on the 1st day of every month
  $$
  SELECT
    net.http_post(
        url:='https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/reset-message-counters',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpydGxybmZkcWZramxrcGZpcnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTQ5NTcsImV4cCI6MjA3Mzc3MDk1N30.9mXWW_V8jJEjxiohExZWrh4rNRlKf2yocahkSNkjJHs"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);