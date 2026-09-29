-- 0032_review_followups.sql
-- Automatic Google review follow-up, 3 days after delivery (edge function
-- send-review-followups, run daily by pg_cron). Safe to run more than once.
--
-- * backing_requests.delivered_at: set automatically when a request is marked
--   completed, so the follow-up knows when the track was delivered. Requests
--   completed before this migration stay NULL and are never followed up.
-- * review_requests: one row per customer email that has been asked for a review
--   (automatically, or from Admin → Clients → Review requests), so nobody is
--   asked twice.

ALTER TABLE public.backing_requests ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

CREATE OR REPLACE FUNCTION public.set_backing_request_delivered_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' AND NEW.delivered_at IS NULL THEN
    NEW.delivered_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS backing_requests_set_delivered_at ON public.backing_requests;
CREATE TRIGGER backing_requests_set_delivered_at
  BEFORE UPDATE OF status ON public.backing_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_backing_request_delivered_at();

CREATE TABLE IF NOT EXISTS public.review_requests (
  email text PRIMARY KEY,            -- lower-cased
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'manual' -- 'auto' (3-day follow-up) or 'manual' (admin tool)
);

ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'review_requests' AND policyname = 'Admins manage review_requests') THEN
    CREATE POLICY "Admins manage review_requests"
      ON public.review_requests FOR ALL
      TO authenticated
      USING (auth.email() = 'daniele.buatti@gmail.com' OR auth.email() = 'pianobackingsbydaniele@gmail.com')
      WITH CHECK (auth.email() = 'daniele.buatti@gmail.com' OR auth.email() = 'pianobackingsbydaniele@gmail.com');
  END IF;
END $$;

-- Daily at 23:07 UTC (about 9–10am in Melbourne). The function only emails customers
-- who are due and records each one, so calling it with the public anon key is safe.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule('send-review-followups')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-review-followups');

SELECT cron.schedule(
  'send-review-followups',
  '7 23 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kyfofikkswxtwgtqutdu.supabase.co/functions/v1/send-review-followups',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5Zm9maWtrc3d4dHdndHF1dGR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY2MDksImV4cCI6MjA3MTE2MjYwOX0.la6lDzw1jl6dFZiDWSvnoBlTDGo1FsPvzMXMmjqz7E0'
    ),
    body := '{}'::jsonb
  );
  $$
);
