-- 1. Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Schedule a daily job to trigger the expiry reminder Edge Function
-- This runs every day at midnight (UTC)
-- Replace YOUR_PROJECT_REF and YOUR_ANON_KEY if necessary
-- Note: It's better to use an internal call if possible, but net.http_post works for Edge Functions.

SELECT cron.schedule(
  'send-daily-expiry-reminders',
  '0 0 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://oibvtecxxoqhvyejovsy.functions.supabase.co/send-expiry-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);

-- Note for the user:
-- You must replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY with your actual Supabase values.
-- You can find these in your Supabase Dashboard under Settings -> API.
