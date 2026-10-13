-- 0039: Owner review & scheduling cadence
--   backing_requests.no_socials    never upload this client request to any social
--   publishing_settings cadence    'weekly' slot (existing) OR every N days

-- Never-upload-to-socials flag for client requests (owner vetting).
ALTER TABLE public.backing_requests
  ADD COLUMN IF NOT EXISTS no_socials boolean NOT NULL DEFAULT false;

-- Publishing cadence: keep the weekly slot, add an "every N days" mode.
ALTER TABLE public.publishing_settings
  ADD COLUMN IF NOT EXISTS schedule_mode text NOT NULL DEFAULT 'weekly'
    CHECK (schedule_mode IN ('weekly', 'interval')),
  ADD COLUMN IF NOT EXISTS interval_days int
    CHECK (interval_days BETWEEN 1 AND 90);

UPDATE public.publishing_settings
  SET schedule_mode = 'weekly'
  WHERE id = 1 AND schedule_mode IS NULL OR schedule_mode NOT IN ('weekly', 'interval');