-- 0027_consolidate_backing_request_materials.sql
-- Phase 2 consolidation: backfill the JSONB array fields from the legacy single-value
-- columns on backing_requests. This migration is NON-DESTRUCTIVE (additive only).
--
-- Legacy columns (sheet_music_url, voice_memo, backing_type) are intentionally kept
-- so existing app code keeps working during the transition. They are dropped by a
-- separate, post-deploy migration (see 0028_drop_legacy_backing_request_columns.sql).

-- 1. Backfill sheet_music_urls from the legacy sheet_music_url column
UPDATE public.backing_requests
SET sheet_music_urls = jsonb_build_array(
  jsonb_build_object('url', sheet_music_url, 'caption', 'Sheet Music')
)
WHERE (sheet_music_urls IS NULL OR jsonb_array_length(sheet_music_urls) = 0)
  AND sheet_music_url IS NOT NULL
  AND btrim(sheet_music_url::text) <> '';

-- 2. Backfill voice_memo_urls from the legacy voice_memo column
UPDATE public.backing_requests
SET voice_memo_urls = jsonb_build_array(
  jsonb_build_object('url', voice_memo, 'caption', 'Voice Memo')
)
WHERE (voice_memo_urls IS NULL OR jsonb_array_length(voice_memo_urls) = 0)
  AND voice_memo IS NOT NULL
  AND btrim(voice_memo::text) <> '';

-- 3. Backfill track_type from the legacy backing_type column where track_type is missing.
--    backing_type may be stored as a JSON array string (e.g. '["full-song"]'), a plain
--    string (e.g. 'full-song'), or a JSONB array.
UPDATE public.backing_requests
SET track_type = COALESCE(
  NULLIF(
    CASE
      WHEN btrim(backing_type::text) LIKE '[%' THEN (backing_type::jsonb ->> 0)
      ELSE backing_type::text
    END,
    ''
  ),
  'audition-ready'
)
WHERE (track_type IS NULL OR btrim(track_type::text) = '')
  AND backing_type IS NOT NULL
  AND btrim(backing_type::text) <> '';
