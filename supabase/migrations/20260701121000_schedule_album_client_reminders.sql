-- Schedule daily Smart Album client inactivity reminders.
-- Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY with your Supabase project values.
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'send-daily-album-client-reminders',
  '0 9 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://oibvtecxxoqhvyejovsy.functions.supabase.co/send-album-client-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
