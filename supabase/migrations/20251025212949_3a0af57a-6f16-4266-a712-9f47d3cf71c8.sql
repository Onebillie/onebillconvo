-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule daily voice usage aggregation at 2 AM UTC
SELECT cron.schedule(
  'aggregate-voice-usage-daily',
  '0 2 * * *', -- Every day at 2 AM UTC
  $$
  SELECT
    net.http_post(
        url:='https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/aggregate-voice-usage',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpydGxybmZkcWZramxrcGZpcnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTQ5NTcsImV4cCI6MjA3Mzc3MDk1N30.9mXWW_V8jJEjxiohExZWrh4rNRlKf2yocahkSNkjJHs"}'::jsonb,
        body:=concat('{"timestamp": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Schedule monthly voice period reset at start of each month
SELECT cron.schedule(
  'reset-voice-period-monthly',
  '0 0 1 * *', -- First day of each month at midnight UTC
  $$
  UPDATE businesses 
  SET 
    voice_minutes_used_period = 0,
    voice_period_start = date_trunc('month', CURRENT_DATE),
    voice_period_end = (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')
  WHERE subscription_tier IS NOT NULL;
  $$
);

-- Function to check and alert on low voice credits
CREATE OR REPLACE FUNCTION check_low_voice_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  business_record RECORD;
BEGIN
  FOR business_record IN 
    SELECT id, owner_id, voice_credit_balance, subscription_tier
    FROM businesses
    WHERE voice_credit_balance > 0 AND voice_credit_balance <= 50
  LOOP
    -- Queue notification for low voice credits
    PERFORM net.http_post(
      url := 'https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/queue-notification',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpydGxybmZkcWZramxrcGZpcnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTQ5NTcsImV4cCI6MjA3Mzc3MDk1N30.9mXWW_V8jJEjxiohExZWrh4rNRlKf2yocahkSNkjJHs"}'::jsonb,
      body := json_build_object(
        'user_id', business_record.owner_id,
        'type', 'billing',
        'title', 'Voice Credits Running Low',
        'message', format('You have %s voice calling minutes remaining. Purchase more to avoid service interruption.', business_record.voice_credit_balance),
        'priority', 'high'
      )::jsonb
    );
  END LOOP;
END;
$$;

-- Schedule daily voice credit check at 10 AM UTC
SELECT cron.schedule(
  'check-low-voice-credits-daily',
  '0 10 * * *', -- Every day at 10 AM UTC
  $$
  SELECT check_low_voice_credits();
  $$
);