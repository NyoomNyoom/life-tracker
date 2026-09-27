-- Life Tracker: reminder scheduler.
--
-- Run this ONCE in the Supabase SQL editor, after the app is deployed to Vercel.
-- It is deliberately not a migration, because it needs two values that only you know:
--   1. <APP_URL>      your deployed URL, e.g. https://tracker.example.com (no trailing slash)
--   2. <CRON_SECRET>  the same random string you set as CRON_SECRET in Vercel
--
-- Why not Vercel Cron? On the Hobby plan Vercel cron jobs run at most once per day, which is
-- far too coarse for "remind me at 9:00 if I haven't logged". Supabase's pg_cron runs every
-- 5 minutes for free, and each run calls the app, which also keeps the free project from
-- auto-pausing through inactivity.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Store both values in Supabase Vault (encrypted at rest) instead of in the job text.
select vault.create_secret('<APP_URL>', 'life_tracker_app_url', 'Base URL of the deployed app');
select vault.create_secret('<CRON_SECRET>', 'life_tracker_cron_secret', 'Bearer token for /api/cron/reminders');

-- Every 5 minutes: ask the app to send any reminders that are due.
select cron.schedule(
  'life-tracker-reminders',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'life_tracker_app_url')
           || '/api/cron/reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'life_tracker_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $$
);

-- Nightly housekeeping: drop reminder history older than 90 days, and pg_net's response log.
select cron.schedule(
  'life-tracker-prune',
  '17 3 * * *',
  $$
  delete from public.reminder_events where created_at < now() - interval '90 days';
  delete from net._http_response where created < now() - interval '2 days';
  $$
);

-- ---------------------------------------------------------------------------
-- Useful afterwards
-- ---------------------------------------------------------------------------
-- See recent runs:        select * from cron.job_run_details order by start_time desc limit 20;
-- See HTTP responses:     select id, status_code, content, created from net._http_response order by created desc limit 20;
-- Change the app URL:     select vault.update_secret((select id from vault.secrets where name = 'life_tracker_app_url'), 'https://new-url');
-- Pause reminders:        select cron.unschedule('life-tracker-reminders');
