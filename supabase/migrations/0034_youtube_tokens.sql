-- Separate Google OAuth token for the YouTube channel, which is a Brand Account
-- distinct from the Gmail mailbox. The title-card tool mints upload tokens from
-- this so uploads land on the channel, while gmail_tokens keeps powering email
-- sending. Only the service role (edge functions) reads/writes this table.

create table if not exists public.youtube_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  refresh_token text not null,
  channel_id text,
  channel_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.youtube_tokens enable row level security;
