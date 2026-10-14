# tiktok-browser-poster

> ⚠️ **UNOFFICIAL. This is not TikTok's API. It drives the TikTok web app with a
> logged-in browser session, which TikTok's Terms of Service do not permit.**
> Consequences are real and can be permanent: content removal → shadowban →
> temporary suspension → **account ban**, plus IP/device bans that follow you to
> new accounts. It is also brittle: TikTok's UI changes break it without warning.
> Use of this tool is a deliberate, accepted risk. See
> `docs/tiktok-wide-audience-plan.md` §10.

Posts due TikTok teasers to **@pianobackingsbydaniele** by driving
`tiktok.com/upload` with Playwright, instead of the (private-only) Content Posting
API. It claims rows from the same `publications` table the edge worker uses, so the
two can't double-post.

## Why this exists
TikTok's official API can only post **privately** (`SELF_ONLY`) until the app passes
their audit, and the audit rejects a single-owner tool. This is the only
free + public + automatic route. The trade-off is the account risk above.

**The account must be public.** The API path needs the account *private*; the
browser path needs it *public*, or "public" posts are seen by nobody. Switching
this on means flipping `@pianobackingsbydaniele` to a public account in the TikTok
app. Posts use the composer's default visibility, which is *Everyone* on a public
account.

## How it works
```
claim a `scheduled` tiktok row  ->  status `publishing`   (the lock)
download the teaser from Storage
open Chromium (persisted profile), go to /upload
attach file -> type caption -> click Post
success  -> `published`
failure  -> `failed` (screenshot saved)
```

## Setup

```bash
cd tools/tiktok-browser-poster
cp .env.example .env          # fill SUPABASE_SERVICE_ROLE_KEY
pnpm install
npx playwright install chromium
```

### 1. Log in once
```bash
HEADLESS=0 pnpm login         # opens a window; log in by hand (2FA/CAPTCHA)
```
The session is saved to `USER_DATA_DIR`. **Do the login on the same machine/IP that
will run the poster** — TikTok flags a session that jumps to a datacenter IP later.
On a headless server, run `xvfb-run -a pnpm login` and connect over VNC, or use
`HTTPS_PROXY` so both steps share an IP.

### 2. Dry run (never posts)
```bash
pnpm dry                      # attaches the video, types the caption, screenshots, stops
```
Inspect `.screenshots/dry-run.png` to confirm the flow before going live.

### 3. Go live
```bash
pnpm post:once                # post whatever is due, then exit
pnpm start                    # long-lived loop (POLL_SECONDS)
```

## Deploy (always-on)
Edge Functions can't run Chromium, so this needs its own host:

- **Fly.io** (recommended): `fly launch` (uses the Dockerfile), then
  `fly volumes create tiktok_profile -s 1` and mount it at `/data`.
- **Railway / Render**: same Dockerfile; add a persistent volume at `/data`.
- **VPS**: `docker build` + `docker run -v /srv/tiktok:/data`.

Then schedule it however you prefer: the built-in loop, or a host cron calling
`pnpm post:once` every N minutes.

## Safety rails
- `DRY_RUN=1` never clicks Post.
- `MAX_PER_RUN` caps posts per pass.
- The `publishing` status flip is the same lock the edge worker uses.
- Kill switch: stop the process (or set `MAX_PER_RUN=0`).
- Screenshots on every failure in `SCREENSHOTS_DIR`.

## Keeping it from racing the API worker
While this runs, the edge function must **not** also post TikTok. Set the flag so
`run-social-queue` skips tiktok (migration `0045`):
```sql
update public.publishing_settings set social_tiktok_poster = 'browser';
```
Set it back to `'api'` to hand TikTok back to the worker.

## Maintenance reality
Expect to fix selector drift periodically (TikTok's composer DOM moves), and to
re-run `pnpm login` when the session expires or a challenge appears. Budget a few
minutes a month, unpredictably. This is the price of the free route.
