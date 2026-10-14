-- 0044_auto_book.sql
-- Hands-off booking.
--
-- A track you record on the release board is written up and left at "queued":
-- file recorded, copy written, but with no slot yet. Today a person still has to
-- press "Book slots" (or "Publish this song") to give it the next free cadence
-- slot. This flag lets the run-publish-queue worker do that itself, so the chain
-- from "queued" to "live on YouTube" needs nobody watching it.
--
-- OFF BY DEFAULT: the owner flips `auto_book` on in Publishing → Settings, and
-- can flip it back off at any time. The worker only books rows that are already
-- reviewed (a recorded file and a drafted description) and never touches rows
-- that have failed or opted out of socials.
--
-- Apply after the run-publish-queue function is deployed.

ALTER TABLE public.publishing_settings
  ADD COLUMN IF NOT EXISTS auto_book boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.publishing_settings.auto_book IS
  'When true, the publishing worker books queued YouTube videos into the next free cadence slot on its own.';
