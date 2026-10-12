-- 0035_content_publishing.sql
-- Multi-platform publishing catalogue + approval queue + weekly scheduler.
--
-- One video is generated (title card held for the full track), stored in the
-- private `content` bucket, catalogued, and then has one `publications` row per
-- platform. Nothing is posted until its metadata is approved; a scheduler then
-- publishes approved rows at the weekly slot. Safe to run more than once.
--
--   content_assets       new table    one row per finished video (storage path + song info)
--   publications         new table    one row per asset × platform (status, schedule, metadata)
--   publishing_settings  new table    single row: the weekly slot + timezone
--   content              new bucket   private storage for the generated videos

-- ---------------------------------------------------------------------------
-- content_assets
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL,                       -- path within the `content` bucket
  mime_type text NOT NULL DEFAULT 'video/webm',
  title text,
  song_title text,
  show text,
  key text,
  dedication text,
  request_id uuid REFERENCES public.backing_requests (id) ON DELETE SET NULL,
  duration_seconds numeric,
  aspect text,                                      -- e.g. '16:9', '9:16', '1:1'
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- publications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.content_assets (id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('youtube', 'tiktok', 'instagram')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_approval', 'approved', 'scheduled', 'publishing', 'published', 'failed', 'skipped')),
  scheduled_for timestamptz,
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  published_at timestamptz,
  platform_post_id text,
  url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,      -- { title, description, tags[], hashtags[], privacy }
  error text,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (asset_id, platform)
);

CREATE INDEX IF NOT EXISTS publications_due_idx
  ON public.publications (status, scheduled_for)
  WHERE status = 'scheduled';

-- ---------------------------------------------------------------------------
-- publishing_settings (single row)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.publishing_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  weekly_dow int NOT NULL DEFAULT 2 CHECK (weekly_dow BETWEEN 0 AND 6), -- 0 = Sunday
  weekly_time time NOT NULL DEFAULT '09:00',
  timezone text NOT NULL DEFAULT 'Australia/Sydney',
  auto_schedule boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.publishing_settings (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.publishing_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS content_assets_touch ON public.content_assets;
CREATE TRIGGER content_assets_touch BEFORE UPDATE ON public.content_assets
  FOR EACH ROW EXECUTE FUNCTION public.publishing_touch_updated_at();

DROP TRIGGER IF EXISTS publications_touch ON public.publications;
CREATE TRIGGER publications_touch BEFORE UPDATE ON public.publications
  FOR EACH ROW EXECUTE FUNCTION public.publishing_touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: admins only (same emails as the existing admin policies)
-- ---------------------------------------------------------------------------
ALTER TABLE public.content_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publishing_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'content_assets' AND policyname = 'Admins manage content_assets') THEN
    CREATE POLICY "Admins manage content_assets" ON public.content_assets FOR ALL TO authenticated
      USING (auth.email() = 'daniele.buatti@gmail.com' OR auth.email() = 'pianobackingsbydaniele@gmail.com')
      WITH CHECK (auth.email() = 'daniele.buatti@gmail.com' OR auth.email() = 'pianobackingsbydaniele@gmail.com');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'publications' AND policyname = 'Admins manage publications') THEN
    CREATE POLICY "Admins manage publications" ON public.publications FOR ALL TO authenticated
      USING (auth.email() = 'daniele.buatti@gmail.com' OR auth.email() = 'pianobackingsbydaniele@gmail.com')
      WITH CHECK (auth.email() = 'daniele.buatti@gmail.com' OR auth.email() = 'pianobackingsbydaniele@gmail.com');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'publishing_settings' AND policyname = 'Admins manage publishing_settings') THEN
    CREATE POLICY "Admins manage publishing_settings" ON public.publishing_settings FOR ALL TO authenticated
      USING (auth.email() = 'daniele.buatti@gmail.com' OR auth.email() = 'pianobackingsbydaniele@gmail.com')
      WITH CHECK (auth.email() = 'daniele.buatti@gmail.com' OR auth.email() = 'pianobackingsbydaniele@gmail.com');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Storage bucket for generated videos
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
  VALUES ('content', 'content', false)
  ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Admins manage content bucket') THEN
    CREATE POLICY "Admins manage content bucket" ON storage.objects FOR ALL TO authenticated
      USING (bucket_id = 'content' AND (auth.email() = 'daniele.buatti@gmail.com' OR auth.email() = 'pianobackingsbydaniele@gmail.com'))
      WITH CHECK (bucket_id = 'content' AND (auth.email() = 'daniele.buatti@gmail.com' OR auth.email() = 'pianobackingsbydaniele@gmail.com'));
  END IF;
END $$;
