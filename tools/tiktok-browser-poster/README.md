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
app. The composer defaults to *Everyone* on a public account, and the poster now
**forces** *Everyone* explicitly before posting, so a remembered *Only you* can't
silently make a post private.

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
bash deploy/install-macos.sh
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

### Reaching the mini remotely
Nothing about the poster needs this — it is only how you get a shell on the host
when you are not at home. Add two SSH aliases in `~/.ssh/config`: one pointing at
the mini's **Tailscale** address (installed on both the mini and your laptop) so
the same alias works on the home network *and* away from it, and one for the plain
LAN address as a fallback for when Tailscale is not running. Tailscale routes
directly over the LAN when both machines are home, so the first alias is no slower
there than the second.

### Logging in without a screen
The login step needs a visible browser, but the Mac Mini may be headless.

**Do not copy the `.auth/profile` folder between Macs.** macOS encrypts
Chromium's cookie database with a per-machine Keychain key, so a copied profile
silently comes up logged out. Move the session as plaintext instead:

```bash
# on the Mac you logged in on:
cd tools/tiktok-browser-poster
npm run export-state                 # writes .auth/state.json (plaintext cookies)

# copy just that file over (same LAN = same public IP):
scp .auth/state.json mac-mini.local:~/…/tools/tiktok-browser-poster/.auth/state.json
```

On its first run the mini seeds a fresh profile from `.auth/state.json` and
persists the cookies from then on; `index.ts` refreshes the file each pass so it
stays in step with the live profile. The poster also re-exports it for you.

(Alternatively, enable Screen Sharing on the mini and run
`HEADLESS=0 npm run login` over VNC.)

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

## Why TikTok browser posting is fragile (observed failure modes)
The composer is undocumented and changes without notice. Two quirks already
handled in code, documented so they're easy to spot again:
- **First-visit product tour** — a `react-joyride` overlay covers the composer and
  swallows clicks (Playwright reports `element ... intercepts pointer events`).
  `dismissTour()` clicks through it, else removes `#react-joyride-portal`.
- **"Continue to post?" dialog.** After clicking Post, TikTok runs a pre-post
  safety check and shows a modal whose only way forward is **"Post now"**. If it
  is not clicked, nothing publishes and the check then reports a false failure
  (which would trigger a duplicate retry). `post.ts` clicks it when present.
- The composer lives at `/tiktokstudio/upload`; success navigates to
  `/tiktokstudio/content` ("Everyone" = public when the account is public).
- **Visibility is forced public.** The "Who can see this post" select
  (`[data-e2e="video_visibility_container"] button[role="combobox"]`) remembers the
  last choice, so a stale *Only you*/*Friends* would post privately with no error.
  `ensurePublicVisibility()` in `post.ts` reads that combobox and switches it back to
  *Everyone* before clicking Post. It is best-effort: if the control is missing it
  logs a warning and continues, so it can never break posting.

One more trap: macOS encrypts Chromium's cookie DB with a per-machine Keychain
key, so never copy `.auth/profile` between Macs — move `.auth/state.json` instead.

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
