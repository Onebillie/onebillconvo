-- Configure automated monitoring cron jobs

-- Daily System Report (8am UTC every day)
SELECT cron.schedule(
  'daily-system-report',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url:='https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/daily-system-report',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpydGxybmZkcWZramxrcGZpcnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTQ5NTcsImV4cCI6MjA3Mzc3MDk1N30.9mXWW_V8jJEjxiohExZWrh4rNRlKf2yocahkSNkjJHs", "Content-Type": "application/json"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);

-- Critical Alert Monitor (every 5 minutes)
SELECT cron.schedule(
  'critical-alert-monitor',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/critical-alert-monitor',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpydGxybmZkcWZramxrcGZpcnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTQ5NTcsImV4cCI6MjA3Mzc3MDk1N30.9mXWW_V8jJEjxiohExZWrh4rNRlKf2yocahkSNkjJHs", "Content-Type": "application/json"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);