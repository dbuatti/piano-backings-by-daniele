-- 0045_social_tiktok_poster.sql
-- Who posts TikTok: the sanctioned API worker, or the unofficial browser poster.
--
-- 'api'     (default) — run-social-queue posts TikTok through the Content Posting
--                        API. While the app is unaudited this is SELF_ONLY, and it
--                        only works if the account is private.
-- 'browser'            — the tools/tiktok-browser-poster service owns TikTok
--                        (browser automation). run-social-queue stops touching
--                        TikTok so the two can never double-post.
--
-- Apply after the run-social-queue function is deployed.

ALTER TABLE public.publishing_settings
  ADD COLUMN IF NOT EXISTS social_tiktok_poster text NOT NULL DEFAULT 'api'
    CHECK (social_tiktok_poster IN ('api', 'browser'));

COMMENT ON COLUMN public.publishing_settings.social_tiktok_poster IS
  'Which poster owns TikTok: the API worker (api) or the browser-automation service (browser).';
