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
npm install
npx playwright install chromium
```

### 1. Log in once
```bash
HEADLESS=0 npm run login      # opens a window; log in by hand (2FA/CAPTCHA)
```
The session is saved to `USER_DATA_DIR`. **Do the login on the same machine/IP that
will run the poster** — TikTok flags a session that jumps to a datacenter IP later.
On a headless server, run `xvfb-run -a npm run login` and connect over VNC, or use
`HTTPS_PROXY` so both steps share an IP.

### 2. Dry run (never posts)
```bash
npm run dry                   # attaches the video, types the caption, screenshots, stops
```
Inspect `.screenshots/dry-run.png` to confirm the flow before going live.

### 3. Go live
```bash
npm run post:once             # post whatever is due, then exit
npm run start                 # long-lived loop (POLL_SECONDS)

## Deploy (always-on)

**Best host: a Mac Mini (or any always-on Mac) on your own network.** It's free,
it's always on, and it posts from your real residential IP — the single biggest
factor in not getting flagged. Datacenter IPs (Fly/Railway/VPS) are far easier
for TikTok to spot.

### Run it on a Mac Mini
```bash
cd tools/tiktok-browser-poster
cp .env.example .env          # fill SUPABASE_SERVICE_ROLE_KEY
npm install && npx playwright install chromium
# 1) create the session (see "Log in once" below)
# 2) then install it as a launch agent:
bash deploy/deploy/install-macos.sh   # note: path is deploy/install-macos.sh
```
`install-macos.sh` writes a `LaunchAgent` that starts the poster at login and
restarts it if it dies, wrapped in `caffeinate -s` so the Mac won't idle-sleep
mid-job. Logs land in `.launchd.out.log` / `.launchd.err.log`. Undo with
`deploy/uninstall-macos.sh`.

Two things to set on the Mac Mini:
- **Enable automatic login** (System Settings → Users & Groups → Automatically log
  in). LaunchAgents only start inside a logged-in user session.
- Keep it on Ethernet/wifi and let it stay on; the profile and session live in
  `tools/tiktok-browser-poster/.auth/profile` on that machine.

### Logging in without a screen
The login step needs a visible browser, but the Mac Mini may be headless. Two
options:
- **Simplest:** log in on another Mac **on the same network** (same public IP),
  then copy the profile over:
  ```bash
  rsync -a --delete ~/…/tools/tiktok-browser-poster/.auth/profile/ \
    mac-mini.local:~/…/tools/tiktok-browser-poster/.auth/profile/
  ```
  Same public IP is the point — TikTok shouldn't see a host jump.
- Or enable Screen Sharing on the Mac Mini and run `HEADLESS=0 npm run login`
  over VNC.

## Other hosts
- **Fly.io**: `fly launch` (uses the Dockerfile), mount a volume at `/data`.
- **Railway / Render**: same Dockerfile; add a persistent volume at `/data`.
- **VPS**: `docker build` + `docker run -v /srv/tiktok:/data`.
Datacenter IPs are easier for TikTok to flag, so prefer the Mac Mini.


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
re-run `npm run login` when the session expires or a challenge appears. Budget a few
minutes a month, unpredictably. This is the price of the free route.
