-- 0036_publishing_cron.sql
-- Runs the publish queue every 15 minutes so approved videos go out close to
-- their weekly slot. The function only claims rows that are already approved
-- (status = 'scheduled') and due, so calling it with the public anon key is safe.
-- Apply after the run-publish-queue function is deployed.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule('run-publish-queue')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'run-publish-queue');

SELECT cron.schedule(
  'run-publish-queue',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/run-publish-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5Zm9maWtrc3d4dHdndHF1dGR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY2MDksImV4cCI6MjA3MTE2MjYwOX0.la6lDzw1jl6dFZiDWSvnoBlTDGo1FsPvzMXMmjqz7E0'
    ),
    body := '{}'::jsonb
  );
  $$
);
