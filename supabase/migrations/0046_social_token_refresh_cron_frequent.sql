-- 0046_social_token_refresh_cron_frequent.sql
-- Refreshes the stored TikTok / Instagram tokens every 6 hours instead of once a
-- week. The refresh function only *refreshes a token that is close to expiring*
-- (see refresh-social-tokens), so checking often is safe and gives the two
-- platforms the margin they need:
--   * Instagram long-lived tokens (~60 days) can only be refreshed *before* they
--     expire — an expired one needs a full reconnect. Checking every 6 hours with
--     an 8-day window means many retries before the token lapses (and the window
--     is wide enough to still work under the older weekly cron).
--   * TikTok refresh tokens rotate on every use; its access token lives 24 hours,
--     so a 12-hour window keeps the stored token usable without rotating on every
--     run.
-- Weekly was too sparse: a single missed pg_net call (which fails silently) left a
-- week-long gap.
--
-- Replaces the weekly job from 0042. Apply in the Supabase SQL editor.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Retire the weekly job from 0042 (and any earlier copy of the 6-hourly one).
SELECT cron.unschedule('social-token-refresh-weekly')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'social-token-refresh-weekly');

SELECT cron.unschedule('social-token-refresh-6h')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'social-token-refresh-6h');

SELECT cron.schedule(
  'social-token-refresh-6h',
  '0 */6 * * *', -- every 6 hours, on the hour
  $$
  SELECT net.http_post(
    url := 'https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/refresh-social-tokens',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5Zm9maWtrc3d4dHdndHF1dGR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY2MDksImV4cCI6MjA3MTE2MjYwOX0.la6lDzw1jl6dFZiDWSvnoBlTDGo1FsPvzMXMmjqz7E0',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5Zm9maWtrc3d4dHdndHF1dGR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY2MDksImV4cCI6MjA3MTE2MjYwOX0.la6lDzw1jl6dFZiDWSvnoBlTDGo1FsPvzMXMmjqz7E0'
    ),
    body := '{"scheduled": true}'::jsonb
  );
  $$
);
