# Publishing tool — roadmap

Working notes for the "everything about one song in one place" build.
Owner: Daniele. Written 2026-10-14.

## The goal

Today the publishing tool is organised **by platform and by queue state**. The
owner thinks **per song**. The end state:

> Open a song, see everything about it, be told what is missing, fix it there,
> and take it from delivered to published without leaving the page.

Everything below serves that. Order is "defect first, then consolidate, then
automate".

---

## 0. RESOLVED — audio artefacts in teaser uploads

Reported: small audio artifacts in a TikTok post. **Answered 2026-10-15:** the
artefact is in the recorded file, not in TikTok's transcode — and only in one
recording, not across the board. See the resolution at the end of this section.

The candidates that were considered, in the order they were suspected:

1. **Real-time encoder contention.** `MediaRecorder` encodes H.264 in real time
   while the page also runs a 30 fps timer that repaints a *static* card. The card
   is a still image, so 30 fps buys nothing and starves the audio muxer.
   (`src/utils/canvasRecorder.ts` — `fps = options.fps ?? 30`)
2. **No audio bitrate set.** Only `videoBitsPerSecond` is passed, so the browser
   picks its own (low) default. (`src/utils/canvasRecorder.ts:151`)
3. **Boundary clicks.** `recorder.start()` then `audio.source.start()` a few ms
   later, and `recorder.stop()` cuts exactly at the audio length. Both ends can
   clip a partial sample.
4. **The audio also plays out loud** during recording (`source.connect(context.destination)`
   in `ReleaseBoard.tsx:1069`), which is extra work for no benefit to the file.
5. TikTok's own transcode of a MediaRecorder fragmented MP4.

Fixes to try, cheapest first: set `audioBitsPerSecond`, drop the teaser frame rate
(the card is static), add a short silent lead-in/tail, and stop monitoring the
audio out loud. Then re-record one teaser and compare.

**Resolved 2026-10-15 — measured, not guessed.** Every teaser the recorder
produced ends in digital silence (see the dated entry below), so there is no
boundary click and no systemic encoder fault. One file is the exception, and it
is the one that went out: `66fe309d` (Don't Wanna Be Here, TikTok) ends at full
level mid-performance — re-record it if the tail matters. Two claims in this
section turned out to be wrong: the pinned bitrate/frame-rate targets never reach
the file (the browser treats them as hints; teasers land at ~29.4 fps, ~500 kbps
video, ~125 kbps AAC), and monitoring the audio out loud has no bearing on the
file. What did fix the tail was the stop sequence waiting for the recorder's
final flush. The silent lead-in/tail was never needed — it is already there. The
four 30 s Instagram trims made with `ffmpeg -c copy` *did* cut mid-note; those
were re-encoded with a 0.5 s fade-out, video stream copied, on 2026-10-15.

The prerequisite held: §1 made the file downloadable, so the artifact was located
in the file rather than guessed at.

## 1. Verify — download and play a teaser, as uploaded

There is currently **no way** to get the actual asset file out of the admin.

Needed:

- **Download** the teaser video (the exact uploaded file) from the song page and
  from the TikTok composer.
- **Download the card preview PNG** alongside it.
- A **Play** control that is the real file, not a re-render.
- Show the file's facts: container, dimensions, duration, size — so a wrong file
  is visible before it is posted.

Signed URLs already exist as a pattern (`TikTokComposer.tsx:117`,
`CardPreview.tsx:50`).

## 2. The song page (read-only dashboard) — the big one, part 1

One page per song, reachable from Pipeline and Tracks. No new behaviour: it
gathers what already exists so the owner can see the whole song at a glance.

Shows:

- **Song**: title, show, key, dedication/client, whether it is a shop product,
  price, "not for socials" flag.
- **Sheet music PDF preview** (already exists as a preview card).
- **Card**: the title card at 16:9 and 9:16.
- **YouTube**: the full-length video, status (draft/approved/scheduled/live),
  slot, description, tags, link once live, download the source file.
- **TikTok**: the teaser (full song), status, caption, link, download.
  Duet/stitch/comment settings.
- **Instagram**: the teaser (30 s), status, caption, link, download.
- **Audition cut**: its metadata and a link to adjust it.
- **Readiness**: what is missing before this song can go out.

Sources that already exist and should be reused, not rebuilt:
`src/utils/titleCard.ts`, `src/components/admin/CardPreview.tsx`,
`draft-publication-metadata`, `run-publish-queue`, `run-social-queue`,
`sync-youtube-schedule`, `src/utils/publishingPipeline.ts`.

## 3. The wizard — the big one, part 2

The same page, but stepped, with **Next** and a readiness checklist. Steps:

1. **Song** — confirm/adjust title, show, key, dedication, price.
2. **Card** — preview 16:9 and 9:16, regenerate.
3. **Video** — YouTube description (AI draft + edit), tags, privacy, preview.
4. **Teasers** — TikTok (full song) and Instagram (30 s): previews, captions,
   download.
5. **Schedule** — one slot for all three, or "publish now".
6. **Publish & track** — approve / book / publish now, then see where it landed.

Step 6 is the "one action for TT + IG + YT" the owner asked for.

## 4. Per-platform teasers: TikTok full song, Instagram 30 s

**Not supported by the current data model.** A teaser asset today is one file
shared by the tiktok and instagram rows
(`addTeaserToQueue` in `src/pages/TitleCardGenerator.tsx`, and the re-record flow
in `src/components/admin/sections/ReleaseBoard.tsx`).

Needed:

- TikTok teaser = full song. Instagram teaser = first 30 s, 9:16.
- One recording pass should produce both, or the model must carry two assets.
- Instagram safe areas: the card's bottom logo currently sits where Instagram's
  caption/UI overlay lands.

## 5. One action per song across platforms

Today:

- YouTube: "Publish now" exists per video (`PublishingSection.tsx:656`).
- TikTok: "Post it" exists per teaser (via the composer).
- Booking is all-or-nothing ("Book 5 slots"), never per song.
- Force-posting exists only inside the "Test the pipeline" panel.

Needed: on the song page, **Publish now** (all platforms, immediately) and
**Schedule** (book just this song, teasers riding the same slot).

## 6. Captions: more creative on TikTok and Instagram

`draft-publication-metadata` already drafts per platform. This is prompt work:
TikTok should read like a hook, Instagram like a caption with line breaks and
hashtags, YouTube like search copy. Keep the owner's voice; do not become
corporate.

## 7. Instagram, live

**Live as of 2026-10-15** — the worker posts Reels unattended (the first was
`Wondering`). It was only ever blocked on credentials, **not policy** — see
`docs/social-automation-research.md`. Prerequisites: the account must be a
**professional** (Business/Creator) account, and the Meta app needs
`INSTAGRAM_CLIENT_ID`, `INSTAGRAM_CLIENT_SECRET`, `VITE_INSTAGRAM_CLIENT_ID` and
**Instagram Business Login**. No Facebook Page and no App Review are needed when
posting only to the owner's own account.
`supabase/functions/_shared/instagram.ts` already implements the
container→poll→publish flow; everything Instagram-facing stays
disabled-with-a-reason until the credentials exist.

## 8. TikTok: automatic scheduling, and the audit

- Automation **exists and is off**: `run-social-queue` on a 15-minute cron
  (`supabase/migrations/0043_social_auto_queue.sql`), gated by
  `publishing_settings.social_auto_post`, exposed as "Auto-post teasers" in
  Publishing → Settings.
- TikTok's Content Posting API has **no scheduled-publish field**; "scheduling"
  means this tool calls the API at the slot time.
- An unaudited app on a private account is forced to `SELF_ONLY`, so every post is
  currently "Only me".
- **Researched (see `docs/social-automation-research.md`).** Lifting the
  restriction needs TikTok's Content Posting audit, whose bar is a *wide-audience*
  app that posts *user-initiated* content. A single-owner, timer-driven tool is
  exactly what it is designed to reject. So:
  - **Path A (current):** direct post, unaudited → private "Only me", no taps,
    compliant. Keep as-is.
  - **Path B:** submit the audit for public unattended posts → not worth pursuing;
    the approval model forbids unattended posting.
  - **Path C:** the cron prepares the post in the owner's TikTok **drafts/inbox**
    at the slot time (`video.upload` scope) and the owner taps publish in the app.
    The only compliant route to a *public* TikTok post, and it costs one tap.
- **Decision:** stay on A; adopt C only if a public TikTok feed matters enough to
  build the drafts flow and accept the one tap. Nothing to build until then.

---

## Order of work

| # | Item | Size | Blocked by |
|---|------|------|-----------|
| 0 | Audio artifacts: diagnose, then fix the recorder | S | — |
| 1 | Download/play a teaser + file facts | S | — |
| 2 | Song page, read-only | M/L | — |
| 3 | Song wizard steps + readiness | L | 2 |
| 4 | Per-platform teasers (TT full / IG 30 s) | M | 2 |
| 5 | One action per song (publish now / schedule) | M | 2 |
| 6 | TT/IG caption prompts | S | — |
| 7 | Instagram live | L | Meta credentials (professional account) |
| 8 | TikTok audit / drafts | M | decision: stay on A (see §8) |

Do **0 and 1 first**: they are small, and 1 is what makes 0 diagnosable instead
of guessed at.

---

## Done so far

### 2026-10-15 — first end-to-end scheduled release, all three platforms

**Confirmed on a live run, not in theory.** Love Revolution was moved from its
16 Oct slot to a few minutes ahead and went out everywhere:

- **YouTube** — the video was already uploaded carrying a `publishAt`; YouTube
  made it public at that instant and the queue's confirmation pass then labelled
  the row `published`. Checked independently against the YouTube API:
  `privacyStatus: public` → https://youtu.be/55W_Wuz2WCI
- **Instagram** — `run-social-queue` posted the 30 s portrait teaser.
- **TikTok** — the mini's browser poster claimed the row on its next poll and
  posted it. That poll is `POLL_SECONDS` (default 300 s), so a TikTok can land
  up to five minutes after its slot, where YouTube and Instagram fire on time.
  Its row keeps a synthetic `browser-…` id and no URL, so the board has nothing
  to link to for TikTok.

Until this run only TikTok's scheduled path had ever fired for real: the live
Instagram post had been made during setup, and no YouTube release had happened
at all. All three are now confirmed.

**What it cost:** Love Revolution published 15 Oct rather than 16 Oct, so the
rhythm now reads 15 / 19 / 22 / 25 / 28 Oct — a four-day gap after today. The
other four can be pulled back to 18 / 21 / 24 / 27 Oct to restore an exact
three-day cadence.

### 2026-10-15 — the first full cadence is booked

**Five songs took the 16 / 19 / 22 / 25 / 28 Oct slots** — the whole backlog that
had been sitting in *draft* since 13 October. Every row was already complete (a
recorded file and a written description), so nothing tripped the ready checks.

Booked through the app's own hands-off pass rather than by writing SQL: `auto_book`
was switched on, `run-publish-queue` ran once, and it was switched **off again**.
That matters, because hand-rolled slot maths got it *wrong* — the first attempt
anchored the 3-day grid on today, and since today's 10:59 Sydney had already
passed, it put the first slot on 18 Oct. The server's `allocatePublishingSlots`
said 16 Oct, and it is right: the cadence starts at the soonest 10:59 still
ahead, not at today's. Two days of drift, from arithmetic no one would have
noticed until the videos appeared late.

| slot (10:59 AEDT) | song | goes out |
| --- | --- | --- |
| ~~Fri 16 Oct~~ **15 Oct** | Love Revolution | YouTube + Instagram + TikTok — pulled forward as the live test |
| Mon 19 Oct | Wondering | YouTube |
| Thu 22 Oct | Don't Wanna Be Here | YouTube + Instagram |
| Sun 25 Oct | How it ends | YouTube + Instagram + TikTok |
| Wed 28 Oct | Tonight at eight | YouTube + Instagram + TikTok |

All five YouTube videos uploaded straight away with `publishAt` set to their
slot, so they are **scheduled/private until then** — every row carries a
`platform_post_id` and none carries an error. `run-social-queue` armed the 7
teasers (4 Instagram, 3 TikTok) onto their songs' slots, so the social passes
ride the videos rather than firing early. Wondering appears with a video only
because its Instagram Reel and TikTok are already live; Don't Wanna Be Here
likewise, so its slot has no second TikTok.

**Nothing went public before the test above**, and any future slot can still be
cancelled from the board before it lands.

### 2026-10-15 — migrations now apply from CI

**The project's database was unreachable from this machine.** Applying a
migration needs account privileges on `kyfofikkswxtwgtqutdu`, and every local
route was shut: the Supabase CLI is logged in as an account that gets **403** on
this project (it can see two unrelated ones instead), `supabase/.temp/pooler-url`
carries no password so `psql` cannot connect, and the database exposes no
SQL-running RPC — only app functions (`crm_stats`, `join_waitlist`, …). There is
no `supabase_migrations.schema_migrations` table either, which is why migrations
had always been pasted into the SQL editor by hand.

**So the jump is made from CI.** `.github/workflows/apply-migration.yml` runs one
migration file through the Supabase Management API using the repo's
`SUPABASE_ACCESS_TOKEN`, which does have access — the same secret the function
deploy uses, and it has to stay on the `Production` environment or the job sees
an empty token and 401s.

It is `workflow_dispatch` only, so a merge can never alter the schema by itself.
It opens with a preflight that runs `select 1; select 2` and stops if
multi-statement SQL is not accepted. That guard earns its keep: without it a
cron-replacing migration could retire the old job and *then* fail before
installing the new one, leaving no refresh cron at all. An empty `file` input
runs the verify query alone — which is how the state below was read.

**Used to apply 0046**, and to confirm 0044 and 0045 were already live:
`publishing_settings.auto_book` and `social_tiktok_poster` both exist,
`social-token-refresh-6h` is active, and `social-token-refresh-weekly` is gone.
Every migration in `supabase/migrations/` is now applied.

### 2026-10-15 — the audio artefact was one file, not the encoder

**Measured the teasers instead of guessing at them.** §0 listed five candidates
for the "audio artefacts in a TikTok post". I pulled eleven assets straight out
of storage and decoded their audio, so the artefact could be located in a file
rather than inferred from the code.

- **Every teaser the recorder produced ends in digital silence.** A silent lead-in
  (0.1–1.8 s) and a silent tail (0.2–2.8 s), final sample ≤0.001 (about −60 dBFS).
  No boundary click at either end, on any take, old or new. The recorder is not
  the fault.
- **One file is the exception, and it is the one that shipped.**
  `66fe309d-8bef-4965-9c76-9c4f9fffd0f7` ("Don't Wanna Be Here", TikTok, posted
  2026-10-14T23:18) holds full musical level right up to its last sample (last
  200 ms RMS 0.17) and stops dead mid-performance (final sample 0.174, no tail).
  That is the most likely source of what the owner heard.
- **The pinned encoder targets never reach the file.** Every teaser lands at
  ~29.4 fps (configured 15), ~500 kbps video (configured 8 Mbps) and ~125 kbps
  AAC (configured 192 kbps) — `MediaRecorder` treats all three as hints the
  browser overrides. What actually fixed the tail was the stop sequence waiting
  for the recorder's final flush. Don't "fix" the levers again.
- **The four 30 s Instagram trims did cut mid-note.** They were made with
  `ffmpeg -c copy`, which keeps the audio but cuts at exactly 30.0 s with the
  music still playing (final sample 0.015–0.080). Re-encoded with a 0.5 s
  fade-out and the video stream copied, so the video stays **bit-exact** (checked
  by stream md5); same storage paths, so no row, asset id or signed URL changed.
  (A re-download immediately after the upload can still return the old bytes from
  the CDN — the stored object was already correct; verified by size, etag and md5.)
- Re-verified by downloading each from storage and comparing md5: `a19bba2e`
  (How it ends), `7a3807bd` (Tonight at eight), `9bffa087` (Don't Wanna Be Here),
  `5b3edb18` (Love Revolution). All four are Instagram and all four are still
  `pending_approval`, so nothing had posted from the chopped versions.
- Long near-silent stretches in `a260ab8e` (3.7 s) and `67b20cbe` (1.5 s) are
  musical rests in long takes, not dropouts — recorded here so a later "silence"
  report is not mistaken for this defect.

### 2026-10-15 — token refresh: weekly → 6-hourly, and only when due

Posting already self-heals — every worker refreshes an expired token through
`getFreshSocialAccessToken` before it posts — so a lapsed token never blocked a
post. The gap was elsewhere:

- **Instagram can't refresh an expired token.** A long-lived token must be
  refreshed *while it still has life*; once it expires the only fix is a full
  reconnect. The weekly cron gave it one shot a week, and `pg_net` calls fail
  silently, so a single missed run meant a manual reconnect.
- **TikTok's token looked dead all week.** Its access token lives 24 hours and
  the weekly cron only reset it on Sundays, so the connections badge showed
  "login expired" most of the time even though posting worked.

`refresh-social-tokens` now refreshes a platform only when its token is close to
expiring (TikTok 12 hours, Instagram 8 days; a manual, non-cron call still
forces), and `0046_social_token_refresh_cron_frequent.sql` moves the cron to
every 6 hours. Each window is wider than the cron period so a token can't slip
past between runs; the Instagram window stays wide enough to be safe under the
old weekly schedule too.

**Applied 2026-10-15.** `social-token-refresh-6h` (`0 */6 * * *`, active) is
live and `social-token-refresh-weekly` is gone, checked against `cron.job`. It
went in through the new `apply-migration` workflow, because nothing on this
machine can reach the project's database — see the 2026-10-15 CI entry above.

### 2026-10-15 — Instagram is live (and the bug that hid it)

**The first Reel posted itself.** `Wondering` went out through the ordinary
15-minute worker — container → poll → publish, no manual step. The failure that
preceded it was never the video.

**Root cause: a rounded id.** `social-oauth-callback` read the Instagram account
id out of the token-exchange JSON, where it arrives as a *number*. The id is 17
digits (`28950502854580359`), past `Number.MAX_SAFE_INTEGER`, so the last digit
rounded to `…360` — and every publish then asked Graph for an id that does not
exist ("object does not exist, cannot be loaded due to missing permissions").
The fix reads the id from `/me`, which returns it as a *string*, with the exact
digits off the raw response text as a fallback, so a reconnect can no longer
store a rounded id.

The encoding red herring is worth recording: a fragmented `MediaRecorder` MP4 is
**fine** for the Instagram API. A container built from the original fragmented
teaser reaches `FINISHED` in about 40s — no remux and no transcode is needed, and
the recorder stays as it is. (`/me` also returns a separate `user_id` — the
app-scoped id — so the publishing id must come from the `id` field.)

**Legacy Instagram teasers re-cut to 30s.** The tracks queued before the
per-platform split shared one full-length file with TikTok. The four still
pending are trimmed to a 30-second progressive MP4 (`ffmpeg -c copy`, no
re-encode) and now sit on their own Instagram asset; TikTok keeps the full cut.

### 2026-10-14 — in-app social setup guide (Instagram-ready morning)

Settings → Integrations now contains a **Set up social posting** guide, so the
Instagram work is a copy-paste morning rather than a research project:

- The exact redirect URI (`{origin}/social-oauth-callback`) with a copy button —
  the usual reason a connect bounces back.
- Instagram, expanded: switch to a **professional** account → create the Meta app
  with *Instagram Business Login* → add the redirect URI → request
  `instagram_business_basic` + `instagram_business_content_publish` → put the app
  id/secret in Supabase secrets (`INSTAGRAM_CLIENT_ID`/`INSTAGRAM_CLIENT_SECRET`)
  and the app id in the frontend build (`VITE_INSTAGRAM_CLIENT_ID`) → redeploy →
  Connect → Test.
- TikTok, collapsed: the same shape of steps, plus a table of where "automatic"
  actually stands today (Route A private auto-post = 0 taps but not public;
  Route C drafts = 1 tap and public; Route B audit = a long shot).

Two trust fixes came with it:

- `social-status` now reports **which secrets are set** (booleans only, never
  values), and the guide ticks them off live. A missing secret is visible as
  *not configured* instead of masquerading as a failed connection.
- **Connect** is disabled when the frontend does not know the client id/key
  (`VITE_…` is baked in at build time), with a pointer to the guide — instead of
  failing after the owner has already committed to the redirect. The status row
  says "credentials not configured yet" instead of a bare "Not connected".

The duplicated TikTok/Instagram bullets in the Integrations card were collapsed
into one line, since the guide now says it in full.

### 2026-10-14 — honesty + discoverability pass

**The song page is now findable.** It existed but the only way in was hovering a
song title, so it read as plain text. Now:

- The song name in every Pipeline row (Needs you, Booked, Live) carries a book
  icon and a tooltip, and the Needs-you row also gets an explicit **Song page**
  button next to Edit/Approve.
- The Pipeline card explains it: *"Open a song's page … to see everything about it
  — video, teasers, captions — and publish it in one place."*
- It was already reachable from Tracks → `⋯` → **Open song page**.

**Stopped the checklist blocking what the worker does.** The song page's
**Captions** item was a hard blocker, so *Publish this song* refused to run when a
teaser had no caption — even though `run-social-queue` rebuilds one from the title
and hashtags and posts it anyway. It is now **advisory**: it nudges ("it would
post the title and hashtags instead") without pretending the song is stuck. This
matches the rule the rest of the checklist already follows.

**A missing Instagram id now says so.** `publishInstagramReel` is called with
`tokenRow?.external_id`; when the account is half-connected that is `null`, and
the old code posted to `/v25.0/null/media` and failed with an opaque Graph error.
It now fails immediately with "reconnect Instagram in Settings → Integrations".

**Small cleaning:** the duplicated comment on `TrackPipelineRow` is gone.

### 2026-10-14 — social automation research + integrations polish

**Answered the TikTok/Instagram "can it be automatic?" question.** New
`docs/social-automation-research.md`: TikTok has no scheduled-publish field (the
cron calling at the slot is the schedule), and its audit expects a wide-audience,
user-initiated app — so "fully automatic, public TikTok" is not achievable
compliantly; the drafts/inbox flow is the only compliant route to public and still
needs one tap. Instagram is blocked by **credentials, not policy**: a professional
account plus Instagram Business Login (no Facebook Page, no App Review for your
own account) is all that's missing.

**Integrations card now tells the truth.** The mangled "Content Posting          audit"
line is gone; the card states each platform's real prerequisite, and Instagram is
described as connectable-now rather than "not wired up".

**Graph API version pinned.** `_shared/instagram.ts` and `social-oauth-callback`
both used `v21.0`, which Meta retires on a schedule — an expired version 400s
before any of the flow runs. Now one exported `GRAPH_VERSION` constant (`v25.0`).

**Token expiry is visible.** `SocialConnectionStatus` shows an amber "Expires in
Nd" (or red "Login expired") badge from the `expiresAt` that `social-status`
already returned but the UI discarded — so a silent token-refresh failure is
caught before the next post fails.

### 2026-10-14 — hands-off booking (the last manual step)

**The chain is unattended now.** Recording was already automatic (three cuts in
one pass) and posting already rode the slot (Auto-post), but every video still
waited for a human to press **Book slots** — that press was the only thing
between a queued track and a live one.

- New setting **Book new videos automatically** (Publishing → Settings, off by
  default). When on, the 15-minute publishing worker gives every reviewed-but-
  unscheduled video the next free cadence slot by itself, then uploads it.
- "Reviewed" is enforced: the row must have a recorded file **and** a drafted
  description, so nothing ships a blank description or an empty asset. Rows that
  are not ready are counted and returned as `autoBookSkipped`, and any request
  marked *no socials* is never booked.
- Booking is race-safe: the update is guarded by
  `.eq('status', row.status).is('scheduled_for', null)`, so two worker runs can't
  double-book, and it starts after every slot that already exists.
- The cadence maths now exists on the server too (`_shared/schedule.ts`), a
  faithful port of `utils/nextWeeklySlot.ts` so the forecast and the booking
  always agree. Runs on the existing publish cron; no new function or cron.
- Migration `0044_auto_book.sql` adds `publishing_settings.auto_book`
  (**must be applied before the toggle will save**).

### 2026-10-14 — trust + automation pass

**Stopped the tool doing things behind the owner's back**

- `Run now` no longer forces the social pass. It obeys the Auto-post switch.
- `Book N slots` no longer runs the social worker at all — booking is a YouTube
  job. It reports an upload failure instead of swallowing it.
- `Retry teaser` clears the row and only runs a pass when Auto-post is on;
  otherwise it says to post it by hand. It also clears `scheduled_for`, so a
  retry can actually be re-armed.
- Reset (both copies) now clears `scheduled_for` too.

**Stopped the page lying**

- The queue query's error is captured: the header says "Couldn't load the queue"
  and a red banner with a **Try again** button appears, instead of the false
  "Nothing needs you. Every queued song is booked or live."
- Publishing → Settings can no longer hang on "Loading settings…" — a failed
  query shows the error.
- Fixed the no-op cache invalidations (`['publications']` → the real
  `['publications_queue']` key) so a re-record or reset refreshes the page.
- `QueueRow` prints the platform label, not the raw enum.
- Leaving a section now clears `?sub`, so the URL can't claim a tab that doesn't
  exist in the new section.

**Made the teaser recordable by machine, not by hand**

- `Review & queue` now records **both** cuts in one pass: the landscape video for
  YouTube and a **vertical 9:16 teaser** for TikTok/Instagram, as two separate
  assets. This removes the manual re-record that used to gate every new track.
- The teaser asset no longer carries a "(Teaser)" suffix in its title, which was
  leaking into AI-drafted captions.

**Worker: run a whole week unattended**

- The arm pass now also picks up videos whose slot has **already passed**, so a
  teaser left behind (reset, or queued late) still posts instead of sitting in
  "Needs you" forever. A past slot posts on the next pass rather than at a time
  in the past.
- Guard on that path: a past-slot teaser is only posted unattended when the file
  is genuinely **vertical and playable**; a leftover landscape clip waits for a
  person instead of going out letterboxed. Reported as `armSkipped`.

**Audio artefacts (first pass)**

- `audioBitsPerSecond: 192000` is now pinned (it was left to the browser).
- Teasers record at **15 fps** and 3 Mbps instead of 30 fps / 8 Mbps. The card is
  a still image, so the picture is identical and the encoder has half the work,
  which is what starves the audio muxer.
- The stream and audio graph are torn down only **after** the recorder has
  flushed, so the tail of the audio can't be clipped.

**Verify a teaser**

- **Download** on the exact uploaded file, with a proper filename
  (`song-teaser.mp4`), in the TikTok composer and from the release board's `⋯`
  menu. The composer also shows the container and aspect under the preview.

### 2026-10-14 — per-platform cuts, real captions, one press per song

**Each platform gets the right file**

- Queueing a track now records **three** cuts in one sitting: the landscape video
  for YouTube, the **full-length vertical** teaser for TikTok, and a **30-second
  vertical** Reel for Instagram. Until now TikTok and Instagram shared one file,
  which forced them to be the same length.
- `content_assets.aspect` / `duration_seconds` were already per-asset, so this is
  purely a recording change; grouping still collapses the three rows into one song
  because they share a `request_id`.
- The Instagram cut is drawn with the brand block lifted out of Instagram's
  caption overlay (`drawCard(..., { brandBottom })`); the other cuts are
  untouched.
- The recorder tab's "Save teaser" does the same, and now paints into its own
  9:16 canvas instead of the editor canvas, so a teaser is vertical whatever
  aspect the editor is set to.

**TikTok and Instagram finally have captions**

- The drafter had no `caption` field at all, so a TikTok/Instagram row fell back
  to the asset title. It now has a platform-specific prompt: hook-first lines, a
  plain invitation, hashtags inside the text, at most two tasteful emojis.
- `run-social-queue`'s `captionFor` prefers `metadata.caption`, and for legacy
  rows rebuilds one from the title plus hashtags rather than posting a bare title.
- Editing the caption in the composer is now written back to `metadata` on post.
- **Rewrite with AI** in the composer fetches a fresh one for an existing teaser,
  so the new prompts also reach tracks that were queued under the old ones.

**One press for a whole song**

- Each "needs you" song now has **Publish this song**: it approves the video,
  gives it the next free cadence slot, and runs both workers. The button says
  what it will do before you press it, and refuses if the YouTube description is
  missing.
- It cannot post a teaser behind your back — the social worker still obeys
  Auto-post. It only does what the 15-minute cron would have done.
- `willAutoPost` now also reports true when the video is already live, which is
  what the worker actually does.

### 2026-10-14 — the song page

**A page per song, with the wizard built into it.** Reachable from Pipeline (the
song title is a link in every row) and from Tracks (`⋯` → Open song page). It is
one dialog with four steps — **Overview → Video → Teasers → Publish** — with Back
and Next, and a publish button on the last step. It stays open while the recorder
or the composer opens on top, so fixing something never loses your place.

- **Overview** — the track's facts (key, client, which platforms are queued,
  shop listing), a player for the delivered audio, and the readiness checklist.
- **Video** — the title card as recorded, the file (aspect, length, container),
  the slot, the YouTube copy, plus *Draft/Re-draft copy*, download the video, and
  a link to the live video.
- **Teasers** — one panel per platform: status, file, caption, and the single fix
  that unblocks it (record teaser / retry / edit caption & post), plus download.
- **Publish** — what will happen, what is still missing, and *Publish this song*:
  the same handler as the pipeline bar, so it books the next free slot and runs
  both workers while still obeying Auto-post.

**The checklist is now shared, not re-invented.** `trackReadiness` in
`utils/publishingPipeline.ts` is the one place that decides what a song is missing
(Song details, YouTube cut, YouTube copy, TikTok teaser, Instagram teaser,
Captions, and an *advisory* shop listing). Advisory items never block a publish,
and the YouTube copy only blocks while the video still needs booking — the same
rule the "Publish this song" bar already used.

**One download helper.** `utils/assetDownload.ts` (`signedAssetDownloadUrl`,
`assetFilename`) signs the exact file a row will post; the release board and the
song page now share it instead of each rolling their own.

### Morning checklist

Ordered so the cheap, unblocking things come first.

1. **Instagram** — **done**; Instagram is live (§7, and the Reel that posted
   itself). The steps below are kept as the record of what it took.
   In Settings → Integrations, open **Set up social posting → Instagram** and
   follow it top to bottom. In short: switch the IG account to Business/Creator →
   create a Meta app with *Instagram Business Login* → paste the redirect URI the
   guide shows → request `instagram_business_basic` +
   `instagram_business_content_publish` → add `INSTAGRAM_CLIENT_ID` /
   `INSTAGRAM_CLIENT_SECRET` as Supabase Edge secrets and
   `VITE_INSTAGRAM_CLIENT_ID` in Vercel → redeploy → **Connect Instagram** →
   **Test**. The guide's live checklist turns green as each piece lands, so the
   first thing to check is what is still unticked after the deploy.
2. **TikTok** — already works (private auto-post). Confirm **Test** is green, and
   read the guide's *Where "fully automatic" stands* table before expecting public
   posts. Public TikTok = Route C (drafts, 1 tap), a separate build. See §8.
3. **Apply `supabase/migrations/0044_auto_book.sql`** — **done**, the `auto_book`
   column is present, so **Book new videos automatically** can be trialled.
4. **Apply `supabase/migrations/0046_social_token_refresh_cron_frequent.sql`** —
   **done 2026-10-15.** Tokens are checked every 6 hours now
   (`social-token-refresh-6h`), which keeps the connections badge honest and
   gives the Instagram token a wide margin before it lapses. 0045 was already in
   too, so every migration in `supabase/migrations/` is applied.
5. **Confirm the audio artefacts are gone** — **done 2026-10-15.** Decoded every
   teaser in storage: all end in digital silence. The only file that doesn't is
   the one already live on TikTok (`66fe309d`, Don't Wanna Be Here), which stops
   mid-performance. The four chopped Instagram trims were repaired. See §0.
6. **Re-record the pending teasers** — **not needed for this batch.** The five
   backlog songs are booked onto 16-28 Oct with their good cuts armed, so
   nothing pending is waiting on a re-record. The one known-bad teaser is the
   already-live TikTok above, which cannot be replaced in place.
7. **Song page, next slices** (if they earn their space): inline caption editing
   (today it hands off to the composer), the audition cut's own metadata, and a
   price/PDF block.


