-- OAuth tokens for the social platforms we post teasers to (TikTok, Instagram),
-- alongside the existing youtube_tokens / gmail_tokens. One row per platform:
-- there is a single owner account, so the platform name is the natural key and
-- a reconnect simply overwrites the row. Service-role access only (RLS is on and
-- no policies are granted), mirroring youtube_tokens.
create table if not exists public.social_tokens (
  platform text primary key,
  user_id uuid references auth.users (id) on delete set null,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  -- Platform-side account id: TikTok open_id, or the Instagram user id used as
  -- {ig-user-id} when publishing.
  external_id text,
  display_name text,
  scope text,
  updated_at timestamptz not null default now()
);

alter table public.social_tokens enable row level security;
