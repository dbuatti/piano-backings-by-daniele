-- 0042_social_token_refresh_cron.sql
-- Refreshes the stored TikTok / Instagram tokens once a week so the connections
-- don't silently lapse: TikTok refresh tokens rotate on every use and Instagram
-- long-lived tokens expire after ~60 days. The function only refreshes tokens
-- (it never posts), so the anon-key `scheduled` invocation is safe.
--
-- Apply after the refresh-social-tokens function is deployed.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('social-token-refresh-weekly')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'social-token-refresh-weekly');

SELECT cron.schedule(
  'social-token-refresh-weekly',
  '0 20 * * 0', -- Sunday 20:00 UTC
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
