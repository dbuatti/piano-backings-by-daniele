# Automatic scheduling on TikTok & Instagram — research

Written 2026-10-14, to settle one question before more is built on top of the
social pipeline: **can a post be scheduled once and published by a machine, with
no app tap?** Short answer: yes on Instagram, only conditionally on TikTok.

Sources are the platform docs current at the time of writing; a couple of
third-party 2026 guides are cited where the docs are silent.

---

## TikTok

### There is no "scheduled post" field

The Content Posting API has no `scheduled_at` / `publish_at`. A post goes out when
the API call is made. So "scheduling" on TikTok always means **our cron calls the
API at the slot time** — which is exactly what `run-social-queue` already does.
(`/v2/post/publish/video/init/`, `post_info` fields:
`developers.tiktok.com` → Content Posting API → Direct Post.)

### The audit is the whole story

- An **unaudited** client can only post to a **private** account, and every post
  is forced to `SELF_ONLY` ("Only me"). Posting to a public account errors with
  `unaudited_client_can_only_post_to_private_accounts`. This matches what we see.
- To lift the restriction the app must **pass TikTok's audit**. Two requirements
  matter to us and are hard to meet:
  1. *Wide audience.* The app must not be a single-user/private tool; it has to
     serve a general audience. A personal publishing tool is the shape TikTok
     rejects.
  2. *User-initiated.* TikTok's guidelines expect the creator to submit each post
     themselves and to give explicit, per-post consent on TikTok's own UI. A
     purely timer-driven post is the shape the audit is there to catch.
- Direct Post also requires calling **`/v2/post/publish/creator_info/query/`**
  first and rendering the returned privacy options/max duration in the posting
  UI. We already do this (`tiktok-creator-info`, `_shared/tiktok.ts`).

### Implication

**"Fully automatic, public TikTok" is not achievable compliantly.** Not because
of a missing parameter — because the approval model forbids unattended posting.
The realistic options:

| Path | Public? | Taps | Compliant? |
|---|---|---|---|
| **A.** Direct post, unaudited (today) | no — "Only me" | 0 | yes, while private |
| **B.** Direct post, audited | yes | 0 | unlikely — audit expects user-initiated, wide-audience |
| **C.** Send to drafts/inbox, owner taps publish | yes | 1 | yes — the path TikTok intends for unaudited apps |

Path **B** is what the roadmap calls "the audit". Treat it as a long shot, not a
plan. Path **C** (`/v2/post/publish/inbox/video/init/`, `video.upload` scope)
drops the finished post into the owner's TikTok drafts at the slot time; the owner
opens the app and taps publish. That is the maximum automation TikTok permits for
a tool like this.

Until a path is chosen, keep the account **private**, keep Auto-post landing posts
as "Only me", and treat public TikTok as a manual step.

### Other limits worth knowing

- Creator-info query: 20 requests/min per user token.
- Post init: ~6 requests/min per user token.
- Posting cap: ~15 posts / 24 h per creator account, shared across apps.
- Chunks: 5–64 MB each, final chunk up to 128 MB; a file under 5 MB goes as one
  chunk. `_shared/tiktok.ts` already implements this.
- Cover: `video_cover_timestamp_ms`. Already used, and now meaningful because
  teasers record with `fade = 0` (frame 0 is the card, not the pink fade).

---

## Instagram

### The blocker is smaller than we assumed

Instagram publishing is the ordinary **Content Publishing API**: create a media
container, poll it, then publish it.

```
POST https://graph.instagram.com/<ver>/<IG_USER_ID>/media
     media_type=REELS & video_url=<public url> & caption=… (& thumb_offset / cover_url)
   → creation_id
GET  /{container-id}?fields=status_code          # IN_PROGRESS → FINISHED
POST /<IG_USER_ID>/media_publish  creation_id=...
```

Key corrections to our earlier assumptions:

- **No Facebook Page is required.** That was true of the old Facebook-Login
  route. With **Instagram Business Login** (`graph.instagram.com`) the account is
  linked directly. Tokens come from the app dashboard's "API setup with
  Instagram login" (or the Instagram OAuth flow).
- **No App Review is needed to post to your own account.** Advanced Access is for
  posting to accounts you don't own. A dev-mode/long-lived token for your own
  professional account is enough.
- The account must be a **professional account** (Business or Creator). Personal
  accounts are not supported — this is the one prerequisite to check first.

### Specs and limits

- Reels: MP4/MOV, H.264/HEVC, AAC, 23–60 fps, 3 s – 15 min, ≤ 300 MB, 9:16
  recommended. → our 30 s IG cut (H.264 MP4, 1080×1920) fits.
- `video_url` must be **publicly fetchable** by Meta. Our `content` bucket is
  private, but `getSignedUrl` (3600 s) makes the exact file fetchable for an hour,
  which is what `post-tiktok-teaser`/`run-social-queue` already pass.
- Optional `cover_url` (JPEG, ≤ 8 MB) or `thumb_offset` (ms) sets the Reel cover.
- Caption ≤ 2200 chars, ≤ 30 hashtags.
- Publish limit: ~100 API-published posts / 24 h.
- Token lifetime: **60 days**, refreshable once it is ≥ 24 h old. Our cron already
  refreshes it (`refresh-social-tokens`, `_shared/social.ts`).

### Implication

Instagram is **not blocked by policy** — only by credentials. Once
`INSTAGRAM_CLIENT_ID` / `INSTAGRAM_CLIENT_SECRET` / `VITE_INSTAGRAM_CLIENT_ID`
exist and the account is professional, the container→publish flow in
`_shared/instagram.ts` should work unattended. No audit, no Facebook Page.

---

## What this changes in the tool

1. **Roadmap §8's "decision needed" is answered:** path A stays as-is (private
   auto-post), path B is not worth the audit effort for a private app, path C
   (drafts/inbox) is the only compliant route to public TikTok and still needs one
   tap. Nothing to build until that choice is made.
2. **Instagram should be treated as connectable now**, with the prerequisites
   stated in Settings: professional account, Instagram Business Login, no Facebook
   Page. The remaining blocker is credentials, not code.
3. **The Graph API version must not be stale** — an expired version 400s before
   anything else runs. `_shared/instagram.ts` now pins one `GRAPH_VERSION`
   constant so it is a one-line bump.
4. **Show token expiry** in Settings → Integrations, so a silent refresh failure
   is visible before the next post 401s.
