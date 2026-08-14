-- 0028_drop_legacy_backing_request_columns.sql
-- WARNING: RUN THIS ONLY AFTER 0027 has been applied AND verified, and after the
-- frontend + edge functions have been deployed (they must stop writing the legacy
-- columns). This migration DROPS data-bearing columns and is not reversible.
--
-- Safe to run once all of these are true:
--   1. 0027 backfill has populated sheet_music_urls / voice_memo_urls / track_type.
--   2. Admin edit + DataImporter write the array columns (they keep legacy in sync
--      until this migration runs, so verify no writes to the legacy columns remain).
--   3. edge fn create-backing-request no longer writes voice_memo / backing_type.

ALTER TABLE public.backing_requests
  DROP COLUMN IF EXISTS sheet_music_url,
  DROP COLUMN IF EXISTS voice_memo,
  DROP COLUMN IF EXISTS backing_type;
