
-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule daily API usage alerts at 8:00 AM UTC
SELECT cron.schedule(
  'daily-usage-alert-check',
  '0 8 * * *', -- 8:00 AM daily
  $$
  SELECT
    net.http_post(
      url:='https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/send-usage-alert',
      headers:='{"Content-Type": "application/json"}'::jsonb
    ) as request_id;
  $$
);

-- Schedule hourly API limits check (every hour on the hour)
SELECT cron.schedule(
  'hourly-api-limits-check',
  '0 * * * *', -- Every hour
  $$
  SELECT
    net.http_post(
      url:='https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/check-api-limits',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpydGxybmZkcWZramxrcGZpcnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTQ5NTcsImV4cCI6MjA3Mzc3MDk1N30.9mXWW_V8jJEjxiohExZWrh4rNRlKf2yocahkSNkjJHs"}'::jsonb
    ) as request_id;
  $$
);

-- Schedule daily system tests at 9:00 AM UTC
SELECT cron.schedule(
  'daily-system-tests',
  '0 9 * * *', -- 9:00 AM daily
  $$
  SELECT
    net.http_post(
      url:='https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/run-system-tests',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpydGxybmZkcWZramxrcGZpcnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTQ5NTcsImV4cCI6MjA3Mzc3MDk1N30.9mXWW_V8jJEjxiohExZWrh4rNRlKf2yocahkSNkjJHs"}'::jsonb
    ) as request_id;
  $$
);

-- View all scheduled cron jobs
SELECT * FROM cron.job;
