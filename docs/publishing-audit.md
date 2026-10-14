# Publishing tool — audit findings

Full read-through of the publishing area, 2026-10-14.
Files: `PublishingSection.tsx`, `ReleaseBoard.tsx`, `PublishingBands.tsx`,
`TikTokComposer.tsx`, `TeaserCoverFrame.tsx`, `UpcomingCalendar.tsx`,
`titleCard.ts`, `canvasRecorder.ts`, `publishingPipeline.ts`,
`useDeliveredTracks.ts`, `types/publishing.ts`, `run-social-queue`,
`run-publish-queue`, `post-tiktok-teaser`, `post-social-teasers`,
`draft-publication-metadata`, `_shared/tiktok.ts`, `_shared/instagram.ts`.

Items marked **[verified]** were confirmed by hand after the automated pass.

---

## A. Things that can mislead or surprise the owner

### A1. "Book slots" runs the teaser worker, switch or no switch **[verified]**
`PublishingSection.tsx:1084-1090` — `runNow()` invokes `run-social-queue` with
`{ force: true }`, and `run-social-queue/index.ts:102` treats `force` as
"enabled" regardless of `publishing_settings.social_auto_post`.
`scheduleAll` ("Book N slots") calls `runNow()` at `PublishingSection.tsx:1240`.

So pressing **Book slots** while auto-post is **off** still arms the teasers onto
the slots — and will post any whose slot has already passed. The kill switch does
not kill this path. Same for `retryTeaser` (`1123-1134`).

### A2. A broken query reads as "all good" **[verified]**
`PublishingSection.tsx:952-967` destructures `{ data: queue = [], isLoading }` with
no `error`. On failure the page falls through to
"Nothing needs you. Every queued song is booked or live." (`1434-1438`). The owner
is told everything is fine while the data never arrived. The same pattern makes
the publishing-settings query silent (`939-950`), and
`useDeliveredTracks` silent (`981`).

### A3. Settings tab hangs on "Loading settings…" forever **[verified]**
`PublishingSection.tsx:269-271` returns the loading state when
`isLoading || !settings`. On a query error `isLoading` is false and `settings` is
undefined, so the card never resolves and no error is shown.

### A4. Stale reads after a re-record / reset
`ReleaseBoard.tsx:187` and `1171` invalidate `['publications']`, but the live
Publishing query is keyed `['publications_queue']` (`PublishingSection.tsx:957`).
Those invalidations are no-ops; correctness depends on the callback props being
wired by hand. Same in `VettingDialog` (`ReleaseBoard.tsx:1020, 1029, 1171`).

### A5. Re-space decouples teasers from their video
`respace` re-books YouTube rows only (`PublishingSection.tsx:1041-1062`), and
`sync-youtube-schedule` only touches YouTube rows
(`sync-youtube-schedule/index.ts:50-58`). Teaser rows keep their old
`scheduled_for`, so after a cadence change the teaser can go out on a different
day from the video it belongs to.

### A6. A failed teaser can loop forever
`retryTeaser` resets the row to `pending_approval` and forces a pass
(`PublishingSection.tsx:1123-1134`). But the worker only *arms* a teaser whose
YouTube slot is **in the future** (`run-social-queue/index.ts:167-173`). For a
video whose slot has passed, the retry resets the row and nothing re-arms it, so
it lands back in "Needs you" unchanged.

### A7. Two different row states for the same TikTok outcome
`run-social-queue/index.ts:303-312` marks a `SEND_TO_USER_INBOX` result `failed`;
`post-tiktok-teaser/index.ts:117-125` leaves the row `publishing`. Which one you
get depends on which button you pressed.

### A8. The recorded file can be retired out from under a teaser
Retention nulls `content_assets.storage_path` based on the **YouTube** row's age
(`run-publish-queue/index.ts:278-299`). A teaser row sharing that asset loses its
source with no warning.

### A9. Reset leaves stale state behind
`resetTeaserFor` (`PublishingSection.tsx:1136-1162`) and `ReleaseBoard.resetTeaser`
(`160-196`) clear `platform_post_id`, `published_at` and `error`, but leave
`scheduled_for` and `metadata.caption` in place, so a re-arm can reuse a stale
slot and a stale caption.

---

## B. Where things live (information architecture)

- **Two different "Settings"**: the rail's Settings (`AdminShell.tsx:25`) and
  Publishing → Settings (`PublishingSection.tsx:50-56`). The pipeline's copy says
  "Settings → Integrations" meaning the *top-level* one
  (`PublishingSection.tsx:92-93, 1376`). First-time users will pick wrong.
- Both sections write the same `?sub` query param
  (`PublishingSection.tsx:914-923`, `SettingsSection.tsx:41-50`) and
  `AdminShell.handleSectionChange` clears only `request` (`AdminShell.tsx:75-84`),
  so the URL carries a meaningless `sub` across sections.
- **"Test the pipeline"** is the only place to force a single platform pass, and
  it is inside a collapsed Disclosure (`PublishingSection.tsx:1522-1580`).
- **Live** is collapsed by default (`1504`).
- Composer, re-record, reset, "Preview posts", "Never post to socials", shop
  actions all live behind a row `⋯` (`ReleaseBoard.tsx:532-568`).
- **Teaser captions can only be typed in the composer, at post time, and are
  never saved** (`TikTokComposer.tsx:263-272`; not written back on success at
  `156-188`). There is nowhere to edit a TikTok or Instagram caption afterwards.
- A complete **`UpcomingCalendar` component exists and is never rendered**
  (`UpcomingCalendar.tsx` — no importer) **[verified]**.

## C. Duplication

- Three status-colour maps: `STATUS_STYLE` (`PublishingSection.tsx:143-152`),
  `CHIP` (`PublishingBands.tsx:19-28`), `STATUS_LABELS`
  (`types/publishing.ts:84-93`) — the same status can look different on one page.
- Three platform pills: `PlatformCell` (`PublishingBands.tsx:31-62`),
  `PlatformChip` (`ReleaseBoard.tsx:661-708`), raw badge
  (`PublishingSection.tsx:801-803`) — and that last one prints the raw lowercase
  enum ("youtube") even though `PLATFORM_LABELS` exists.
- Reset implemented twice (`ReleaseBoard.tsx:160-196`,
  `PublishingSection.tsx:1139-1162`); re-record implemented twice
  (`ReleaseBoard.tsx:1150-1184`, `PublishingSection.tsx:1604-1608`).
- The YouTube description skeleton exists in three places that can drift:
  `ReleaseBoard.tsx:713-742`, `draft-publication-metadata/index.ts:29-49`,
  `TitleCardGenerator.tsx:753-771`.
- "Queue a track" exists twice: `ReleaseBoard.tsx:1186-1209` and
  `TitleCardGenerator.tsx:845-942` / `998-1085`.
- Four ways to get a video onto a slot: bulk "Book N slots", per-row
  "Approve & schedule", per-row "Schedule…", and "Publish now".
- `post-social-teasers/index.ts` exists alongside `run-social-queue` with
  overlapping responsibility.
- Naming: "Write descriptions" / "Re-draft AI" / "Draft metadata" for one action;
  "Record teaser" / "Re-record teaser"; "Reset teaser" / "Reset teaser row";
  "Vett backlog" / "vetting".

## D. The teaser pipeline (the structural one)

1. **Teasers are born wrong.** "Review & queue" records a **16:9** card and
   inserts the youtube, tiktok *and* instagram rows pointing at that one asset
   (`ReleaseBoard.tsx:1190-1194`). `isPostable` then rejects the teaser rows for
   being landscape (`publishingPipeline.ts:63-70`), which is why **every** track
   needs a re-record. Not an accident in one track — it is the default path.
2. **TikTok and Instagram permanently share one file.** A teaser re-record makes
   one 9:16 asset and repoints both rows onto it
   (`ReleaseBoard.tsx:1150-1169`). There is no per-platform asset, so
   *TikTok full song + Instagram 30 s is not expressible today.*
3. **The Recorder tab records teasers at the current aspect**, default 16:9
   (`TitleCardGenerator.tsx:1035-1050`, dims from `42`, default at `33`), so
   teasers made there are landscape unless vertical is picked by hand.
4. **No duration check anywhere.** `run-social-queue/index.ts:244-359` and
   `instagram.ts:31-76` never validate length; only the manual TikTok path checks
   the creator's max (`post-tiktok-teaser/index.ts:87`). A 3-minute teaser is
   accepted locally and rejected by the platform.
5. **No Instagram manual post.** The backend supports it
   (`run-social-queue/index.ts:336-359`, `instagram.ts`), but `igBlocked`
   suppresses both post and retry (`PublishingSection.tsx:94-99`), so a failed
   Instagram teaser can only be waited out.
6. **No way to get the file.** Nothing exposes a download or the file's real
   facts (container, size, duration, dimensions). The composer's `<video>` and
   the cover panel are previews, not the file.

---

## E. Suggested order

**Batch 1 — trust (small, verified, do first)**
A1 stop `Book slots` forcing the social pass · A2/A3 surface query errors instead
of false success states · A4 fix the invalidation keys · B caption editing
persisted · remove the raw enum from `QueueRow`.

**Batch 2 — verification (small)**
Download/play the real teaser file + show its facts; audio-bitrate and
frame-rate fixes in `canvasRecorder.ts`.

**Batch 3 — the song page** (read-only dashboard per song), then the wizard on
top of it.

**Batch 4 — the model change**
Per-platform teaser assets (TikTok full, Instagram 30 s) and a duration guard.

**Batch 5 — automation**
TikTok audit / drafts decision; Instagram once the Meta app exists.
