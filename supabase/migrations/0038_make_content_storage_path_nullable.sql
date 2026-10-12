-- Run-publish-queue storage retention: once a publication has been live for the
-- retention window (CONTENT_RETENTION_DAYS, default 30) the queue deletes the
-- source webm from the `content` bucket and clears the pointer so content_assets
-- keeps no dangling reference to a removed object.
alter table public.content_assets
    alter column storage_path drop not null;