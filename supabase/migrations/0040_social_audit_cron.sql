-- 0040_social_audit_cron.sql
-- Runs the release audit once a week so the owner gets a digest of what's still
-- missing — tracks not on YouTube and tracks not in the shop — without having to
-- remember to click "Email audit".
--
-- The function only reads the pipeline and emails the fixed owner addresses; it
-- never posts anything. The cron invokes it with the public anon key plus a
-- `scheduled` flag, and the function only accepts that flag for the digest path
-- (the interactive path still requires an admin JWT).
--
-- Apply after the audit-social-gaps function is deployed.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('social-audit-weekly')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'social-audit-weekly');

SELECT cron.schedule(
  'social-audit-weekly',
  '0 23 * * 0', -- Sunday 23:00 UTC = Monday 09:00 Australia/Sydney
  $$
  SELECT net.http_post(
    url := 'https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/audit-social-gaps',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5Zm9maWtrc3d4dHdndHF1dGR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY2MDksImV4cCI6MjA3MTE2MjYwOX0.la6lDzw1jl6dFZiDWSvnoBlTDGo1FsPvzMXMmjqz7E0',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5Zm9maWtrc3d4dHdndHF1dGR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY2MDksImV4cCI6MjA3MTE2MjYwOX0.la6lDzw1jl6dFZiDWSvnoBlTDGo1FsPvzMXMmjqz7E0'
    ),
    body := '{"scheduled": true}'::jsonb
  );
  $$
);
