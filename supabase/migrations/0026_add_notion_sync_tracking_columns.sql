-- Track Notion sync state for backing requests
ALTER TABLE public.backing_requests
  ADD COLUMN IF NOT EXISTS notion_page_id text,
  ADD COLUMN IF NOT EXISTS notion_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS notion_sync_error text;

-- Track Notion sync state for products (catalog tracks / finished backings)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS notion_page_id text,
  ADD COLUMN IF NOT EXISTS notion_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS notion_sync_error text;