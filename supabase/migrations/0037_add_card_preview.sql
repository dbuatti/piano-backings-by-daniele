-- 0037_add_card_preview.sql
-- Stores a small PNG snapshot of the title card next to each generated video so
-- the publishing queue can show a thumbnail and a printable one-page PDF preview
-- (song, show, dedication, key) before the metadata is approved. Safe to re-run.

ALTER TABLE public.content_assets ADD COLUMN IF NOT EXISTS preview_path text;