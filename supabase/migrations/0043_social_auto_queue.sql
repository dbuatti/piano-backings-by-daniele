-- 0043_social_auto_queue.sql
-- Automatic teaser publishing.
--
-- When an approved video is queued for a future YouTube slot, its TikTok and
-- Instagram teaser rows are moved onto the same slot, and the run-social-queue
-- worker posts the ones that are due. Runs every 15 minutes alongside the
-- YouTube queue so a release goes out as one package.
--
-- OFF BY DEFAULT: the owner flips `social_auto_post` on in Publishing cadence,
-- and can flip it back off at any time to stop the automation.
--
-- NOTE on TikTok: their Content Posting API has no scheduled-publish field and
-- their guidelines expect each post to be user-initiated, so this timer exists
-- because the owner asked for it. Instagram places no such restriction.
--
-- Apply after the run-social-queue function is deployed.

ALTER TABLE public.publishing_settings
  ADD COLUMN IF NOT EXISTS social_auto_post boolean NOT NULL DEFAULT false,
  -- Post the teaser this many minutes after its YouTube slot (same day by default).
  ADD COLUMN IF NOT EXISTS social_offset_minutes int NOT NULL DEFAULT 0
    CHECK (social_offset_minutes BETWEEN 0 AND 1440),
  -- TikTok privacy for automated posts. Unaudited apps are forced to SELF_ONLY
  -- regardless; the column matters once the Content Posting audit passes.
  ADD COLUMN IF NOT EXISTS social_tiktok_privacy text NOT NULL DEFAULT 'SELF_ONLY';

-- The worker scans for due social rows by (platform, scheduled_for).
CREATE INDEX IF NOT EXISTS publications_social_due_idx
  ON public.publications (platform, scheduled_for)
  WHERE platform IN ('tiktok', 'instagram');

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('run-social-queue')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'run-social-queue');

SELECT cron.schedule(
  'run-social-queue',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/run-social-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5Zm9maWtrc3d4dHdndHF1dGR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY2MDksImV4cCI6MjA3MTE2MjYwOX0.la6lDzw1jl6dFZiDWSvnoBlTDGo1FsPvzMXMmjqz7E0',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5Zm9maWtrc3d4dHdndHF1dGR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY2MDksImV4cCI6MjA3MTE2MjYwOX0.la6lDzw1jl6dFZiDWSvnoBlTDGo1FsPvzMXMmjqz7E0'
    ),
    body := '{"scheduled": true}'::jsonb
  );
  $$
);
