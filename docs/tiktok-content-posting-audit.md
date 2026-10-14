# TikTok Content Posting audit — what to submit

The app currently posts with `privacy_level: SELF_ONLY` on a private account,
because TikTok only allows that until the Content Posting API is audited. To
get teasers posting publicly under the brand account, submit the app for the
Content Posting audit. This file is the copy to paste into the submission form
plus the checklist to get through it.

Everything below is already implemented in the repo unless marked `TODO`.

## What TikTok wants to see

1. The app requests the minimum scopes. **Already done** — the OAuth flow asks
   for `user.info.basic,video.publish` only (`src/utils/socialOAuth.ts`). There
   is no unused `video.upload` scope to remove.
2. The posting UX follows their guidelines: the creator's own options are read
   from the API first, and the user picks them before posting.
   **Already done** in `src/components/admin/TikTokComposer.tsx`:
   - privacy level choices come from `creator_info` (`privacy_level_options`),
     never hard-coded;
   - comment / duet / stitch toggles, defaulted off, as their guidelines require;
   - the commercial-content disclosure toggles;
   - the caption is authored by the user, not generated silently.
3. A demo video that walks through the flow in the app.

## Submission copy

**App description**

> Piano Backings by Daniele is a small, single-owner service. When a customer
> orders a custom backing track, the owner records it, and this app publishes
> the promotional clips for that track: the full performance to YouTube and a
> short vertical teaser to the owner's own TikTok account. Only the owner uses
> the app; there are no other users. The TikTok integration exists so the owner
> does not have to re-upload the same teaser by hand every week.

**How the TikTok scopes are used**

> `user.info.basic` — to display which TikTok account is connected, and to read
> the creator's posting options before posting.
> `video.publish` — to upload and publish the teaser to the connected account.
> The owner selects the privacy level, and whether duets, stitches and comments
> are allowed, on the post screen before anything is sent. Nothing is posted
> without the owner having chosen a teaser and its caption.

**Why the account is not public yet**

> While the app is unaudited, posts are made with `privacy_level: SELF_ONLY` so
> nothing goes out before the integration is approved.

## Demo video script (2–3 minutes, record with QuickTime)

1. Open the admin → **Publishing → Tracks**. Point out the delivered tracks.
2. Click **Record teaser** on one track; let the recorder finish and save it.
   *(Shows the app produced the vertical 9:16 MP4.)*
3. Click **Post it** on that track. In the composer, point out, in order:
   - the video preview **and the cover photo preview** (frame 1.5s in);
   - the **connected TikTok username**;
   - the **privacy** dropdown — say the options are the ones TikTok returned;
   - the comment / duet / stitch toggles, still off;
   - the caption.
4. Post it, and show the result on the board (`TikTok: Published`), then open
   TikTok to show the post.
5. Optional but persuasive: show **Publishing → Settings** where automatic
   teaser posting is explained as a scheduling convenience for the same flow.

## Checklist

- [ ] Sandbox app uses client key `sbawiiifjxxze0cv06` (`VITE_TIKTOK_CLIENT_KEY`,
      `TIKTOK_CLIENT_KEY`). The production app can keep its own key.
- [ ] Redirect URI registered exactly: `https://pianobackings.danielebuatti.com/social-oauth-callback`
      (and the localhost equivalent for dev).
- [ ] Demo video recorded per the script above.
- [ ] Submit **Content Posting API** for review in the developer portal.
- [ ] After approval: set the brand account to public, and flip
      `publishing_settings.social_tiktok_privacy` from `SELF_ONLY` to
      `PUBLIC_TO_EVERYONE` (Admin → Publishing → Settings, or SQL).
- [ ] Keep an eye on `SEND_TO_USER_INBOX`. If TikTok ever answers that instead
      of `PUBLISH_COMPLETE`, the row is marked failed with an explanation —
      it means the video went to the account's drafts and needs posting by hand.

## Honest caveats

- TikTok's guidelines expect posting to be user-initiated. This app's automatic
  teaser posting runs on a timer. If the audit is refused on those grounds, the
  fallback is to switch the automation to `video.upload` (drafts) so each teaser
  arrives in the TikTok inbox ready to tap Post. That keeps the owner's one-tap
  workflow and is always allowed.
- The Instagram side needs a Meta app (Business Login for Instagram) before it
  can do anything; that is separate from this submission.
