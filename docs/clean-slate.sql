-- Clean slate for the publishing tool.
--
-- READ THIS FIRST. Two facts about your setup:
--
--  1. YouTube videos are uploaded as `private` with a native `publishAt`, so
--     YOUTUBE ITSELF will publish them at their slot. Wiping the row here does
--     not un-schedule the video on YouTube. If you wipe the row and then later
--     press Schedule all, the tool will upload the same track A SECOND TIME —
--     you'd get duplicate videos. So: delete the YouTube videos first (step 2),
--     then reset (step 3).
--  2. Teaser rows are pure bookkeeping. Resetting them changes nothing outside
--     this tool. Posts already on TikTok stay there until you delete them in
--     the TikTok app — never via SQL or the API.
--
-- Run these in the Supabase SQL editor, top to bottom, project kyfofikkswxtwgtqutdu.


-- ---------------------------------------------------------------------------
-- 0) Backup. Restores the whole table if you change your mind.
-- ---------------------------------------------------------------------------
create table if not exists publications_backup_20261014 as
select * from publications;


-- ---------------------------------------------------------------------------
-- 1) Look at what you've got, before changing anything.
-- ---------------------------------------------------------------------------
select p.platform, p.status, count(*)
from publications p
group by p.platform, p.status
order by p.platform, p.status;


-- ---------------------------------------------------------------------------
-- 2) YouTube videos that are already uploaded and scheduled ON YouTube.
--    Copy this list. Then open YouTube Studio → Content, and delete (or unschedule)
--    these. If you'd rather keep them, SKIP step 3's YouTube block — just know
--    the tool will no longer track them.
-- ---------------------------------------------------------------------------
select
  platform_post_id                        as youtube_video_id,
  scheduled_for,
  metadata ->> 'title'                    as title
from publications
where platform = 'youtube'
  and platform_post_id is not null
order by scheduled_for;


-- ---------------------------------------------------------------------------
-- 3a) Reset EVERY teaser row: back to "needs a teaser", unbooked, forgotten.
--     "Not for socials" tracks (status = skipped) are left alone.
-- ---------------------------------------------------------------------------
update publications p
set status           = 'pending_approval',
    platform_post_id = null,
    published_at     = null,
    scheduled_for    = null,
    approved_at      = null,
    approved_by      = null,
    url              = null,
    error            = null,
    attempts         = 0,
    updated_at       = now()
from content_assets a
where a.id = p.asset_id
  and p.platform in ('tiktok', 'instagram')
  and p.status <> 'skipped';

-- Metadata (the drafted captions) is deliberately kept, so re-posting doesn't
-- mean re-drafting. Add `metadata = '{}'::jsonb,` above if you want those gone too.


-- ---------------------------------------------------------------------------
-- 3b) Reset EVERY YouTube row: back to draft, no slot, no video id.
--     ONLY run this after step 2's videos are deleted on YouTube.
-- ---------------------------------------------------------------------------
update publications
set status           = 'draft',
    platform_post_id = null,
    published_at     = null,
    scheduled_for    = null,
    approved_at      = null,
    approved_by      = null,
    url              = null,
    error            = null,
    attempts         = 0,
    updated_at       = now()
where platform = 'youtube'
  and status <> 'published';   -- live videos are never touched

-- The drafted titles/descriptions in `metadata` are kept on purpose — that is
-- the AI-proposal work, and re-scheduling reuses it.


-- ---------------------------------------------------------------------------
-- 4) Kill the automation while you rebuild, so nothing fires mid-cleanup.
-- ---------------------------------------------------------------------------
update publishing_settings
set social_auto_post = false,
    updated_at       = now()
where id = 1;


-- ---------------------------------------------------------------------------
-- 5) Check the result. Expect every platform ~= draft / needs-a-teaser, no slots.
-- ---------------------------------------------------------------------------
select p.platform, p.status, count(*)
from publications p
group by p.platform, p.status
order by p.platform, p.status;


-- ---------------------------------------------------------------------------
-- How to undo (whole table, all platforms)
-- ---------------------------------------------------------------------------
-- update publications p
-- set status           = b.status,
--     platform_post_id = b.platform_post_id,
--     published_at     = b.published_at,
--     scheduled_for    = b.scheduled_for,
--     approved_at      = b.approved_at,
--     approved_by      = b.approved_by,
--     url              = b.url,
--     error            = b.error,
--     attempts         = b.attempts,
--     updated_at       = b.updated_at
-- from publications_backup_20261014 b
-- where b.id = p.id;
--
-- Then delete the backup when you're happy:
-- drop table publications_backup_20261014;


-- ---------------------------------------------------------------------------
-- Tidying up afterwards (optional, later)
-- ---------------------------------------------------------------------------
-- Re-recording a teaser creates a NEW content_assets row and repoints the
-- publication at it, so the old rows are left orphaned. Harmless — they are not
-- shown anywhere. Once you're settled, list them with:
--
-- select a.id, a.song_title, a.mime_type, a.created_at
-- from content_assets a
-- left join publications p on p.asset_id = a.id
-- where p.id is null
-- order by a.created_at desc;
--
-- Deleting them also needs their files removed from the `content` bucket first,
-- so it's usually not worth it.
