# Admin Notes for Google Services Configuration

This document outlines the specific Google accounts used for different services within this application. This is crucial for troubleshooting and future maintenance.

## Google Account Usage Summary:

1.  **Gmail API (for sending emails):**
    *   **Account Used:** `pianobackingsbydaniele@gmail.com`
    *   **Purpose:** This account is used to authenticate with the Gmail API for sending all outgoing emails (e.g., request confirmations, product deliveries, admin notifications).
    *   **Configuration:**
        *   This account must complete the **Gmail OAuth flow** via the `/test-email` page in the admin dashboard.
        *   The `GMAIL_USER` environment variable in Supabase secrets **must** be set to `pianobackingsbydaniele@gmail.com`.
        *   The Google Cloud Project's OAuth client must have the `https://www.googleapis.com/auth/gmail.send` scope added and be properly configured (Client ID, Client Secret, Authorized Redirect URIs).

2.  **Supabase Authentication (Admin Access):**
    *   **Account Used:** `daniele.buatti@gmail.com` (and potentially `pianobackingsbydaniele@gmail.com` if also used for admin login)
    *   **Purpose:** This account is used to log into the application's admin dashboard (`/admin`) via Supabase's authentication system.
    *   **Configuration:** This email address (or any other designated admin email) must be listed in the `adminEmails` array within the application's code (e.g., `src/components/Header.tsx`, `src/pages/AdminDashboard.tsx`, `src/components/UnreadIssueReportsNotice.tsx`, and relevant Edge Functions like `gmail-oauth-callback`, `send-email`, `list-all-users`).

3.  **YouTube Data API (for the title-card "Publish to YouTube" tool):**
    *   **Account Used:** the **Piano Backings by Daniele** YouTube channel — a **Brand Account**, which is a separate Google identity from the Gmail mailbox.
    *   **Purpose:** Uploads the generated title-card clip. The access token is minted **server-side** (Edge Function `get-youtube-token`) from a refresh token stored in the `youtube_tokens` table, so there is **no browser popup**. This is deliberately separate from `gmail_tokens` so channel uploads never disturb email sending. If no YouTube token is stored yet, the function falls back to the Gmail token, and if that fails the client falls back to the Google Identity Services popup.
    *   **Scope:** `https://www.googleapis.com/auth/youtube.upload`.
    *   **Configuration:** See the dedicated section below.

---

## Edge Functions Deployment (Manual Process)

**Note:** Dyad writes the function code, but you must manually deploy them to Supabase using the CLI because deployment requires your personal account credentials.

> **Auto-deploy on push:** `.github/workflows/deploy-supabase-functions.yml` deploys **all** Edge Functions whenever `supabase/functions/**` or `supabase/config.toml` changes on `main` (or via a manual **Run workflow** dispatch). It needs a secret named **`SUPABASE_ACCESS_TOKEN`** (create at https://supabase.com/dashboard/account/tokens), added **either** as a repository secret (Settings → Secrets and variables → Actions → Repository secrets) **or** as an environment secret under the **`Production`** environment (the workflow declares `environment: Production`). `supabase/config.toml` pins the `verify_jwt` setting per function so a bulk deploy can't accidentally require JWTs on the guest-facing endpoints.

To deploy all Edge Functions from your local terminal:

1.  **Login:** `supabase login`
2.  **Link Project:** `supabase link --project-ref kyfofikkswxtwgtqutdu`
3.  **Deploy All:** `supabase functions deploy`

If "Deploy All" fails to find functions, deploy them individually:
*   `supabase functions deploy create-backing-request`
*   `supabase functions deploy create-stripe-checkout`
*   `supabase functions deploy get-guest-request-by-token`
*   `supabase functions deploy get-order-by-session-id`
*   `supabase functions deploy get-youtube-token`
*   `supabase functions deploy gmail-oauth-callback`
*   `supabase functions deploy list-all-users`
*   `supabase functions deploy send-email`
*   `supabase functions deploy stripe-webhook`
*   `supabase functions deploy test-dropbox`

---

## Managing Secrets

Ensure all sensitive API keys are set in Supabase Secrets (Dashboard -> Settings -> API -> Secrets). **Never hardcode these in the function files.**

Required Secrets include:
*   `STRIPE_SECRET_KEY`
*   `STRIPE_WEBHOOK_SECRET`
*   `GMAIL_CLIENT_ID`
*   `GMAIL_CLIENT_SECRET`
*   `GMAIL_USER` (pianobackingsbydaniele@gmail.com)
*   `DROPBOX_APP_KEY`
*   `DROPBOX_APP_SECRET`
*   `DROPBOX_REFRESH_TOKEN`
*   `NOTION_TOKEN` (secret_xxx — from an internal integration at https://www.notion.so/my-integrations)
*   `NOTION_REQUESTS_DATABASE_ID` (the Notion DB for backing requests — e.g. `11caad21cd0980d8a3eeeffb27fc43c0`)
*   `NOTION_PRODUCTS_DATABASE_ID` (optional — Notion DB for catalog/backing tracks. If unset, product sync is skipped.)

---

## Notion Sync

The `sync-to-notion` Edge Function upserts rows from Supabase into Notion for cost/tracking visibility.

**Setup:**
1. Create an internal integration at https://www.notion.so/my-integrations and copy the token.
2. Open your Notion request database → `…` → `Connections` → add the integration. (Repeat for the products DB if used.)
3. Set the secrets above via `supabase secrets set NOTION_TOKEN=...` (or Dashboard → Settings → API → Secrets).
4. Add the tracking columns by applying the migration `0026_add_notion_sync_tracking_columns.sql` (Supabase SQL editor).
5. Deploy: `supabase functions deploy sync-to-notion` and `supabase functions deploy create-backing-request`.

**How it stays in sync:**
- On every new request, `create-backing-request` fires-and-forgets a call to `sync-to-notion` with the new row id.
- The function looks up the Notion DB schema and only writes properties that exist there, so it tolerates column renames.
- It dedupes via the `Request ID` (rich_text) property and the stored `notion_page_id` column — re-running it safely updates existing pages.
- Each sync writes the page id back to `backing_requests.notion_page_id` and updates `notion_synced_at`; errors land in `notion_sync_error`.

**Backfilling existing rows:** run a one-off script that calls the function for each id, e.g.:
```bash
# requests backfill
for id in $(psql "$SUPABASE_DB_URL" -tAc 'select id from backing_requests order by created_at'); do
  curl -s -X POST "$SUPABASE_URL/functions/v1/sync-to-notion" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" -H "Content-Type: application/json" \
    -d "{\"type\":\"request\",\"id\":\"$id\"}"
done
```

**Notion DB columns recommended:** `Request ID` (text), `Song` (text), `Artist / Musical` (text), `Tier` (select), `Email` (text), `Client Name` (text), `Key` (text), `Due Date` (date), `Cost` (number), `Final Price` (number), `Paid` (checkbox), `Additional Services` (multi-select), `Status` (select), `YouTube` (url). The function gracefully skips any column not present.

**Important Considerations:**

*   **OAuth Client Configuration:** Ensure the Google Cloud Project's OAuth 2.0 Client ID for "Web application" has the correct values for both local development and production:
    *   **Authorized JavaScript origins:**
        *   `http://localhost:8080`
        *   `https://pianobackings.danielebuatti.com`
    *   **Authorized redirect URIs** (the Gmail connect flow redirects to `<origin>/gmail-oauth-callback`):
        *   `http://localhost:8080/gmail-oauth-callback`
        *   `https://pianobackings.danielebuatti.com/gmail-oauth-callback`
    *   A `redirect_uri_mismatch` (Error 400) means the exact redirect URI isn't listed yet (changes take ~5 minutes to propagate). Origins and redirect URIs are separate fields.
*   **API Enablement:** The Gmail API must be explicitly enabled in your Google Cloud Project.
*   **OAuth Consent Screen:** If your OAuth consent screen is in "Testing" status, ensure all admin accounts (e.g., `daniele.buatti@gmail.com`, `pianobackingsbydaniele@gmail.com`) are added as "Test users".

---

## YouTube Publish (server-side token, no popup)

The **Publish to YouTube** button on the Video Title Cards tool (`/admin` → Shop → Marketing) records the clip in the browser. The access token is normally minted **server-side** by the `get-youtube-token` Edge Function from the channel refresh token in `youtube_tokens`, so publishing is **silent** (no OAuth popup) and always uploads as the channel. If no `youtube_tokens` row exists it falls back to the Gmail token, and if that fails the client falls back to the Google Identity Services popup so publishing never breaks.

**One-off Google Cloud + Supabase setup:**
1.  **Enable the API:** APIs & Services → Library → **YouTube Data API v3** → Enable.
2.  **Add the scopes:** Google Auth Platform → **Data access** → Add or remove scopes → add `https://www.googleapis.com/auth/youtube.upload` (publishing), `https://www.googleapis.com/auth/youtube.readonly` (status checks / channel name) and `https://www.googleapis.com/auth/youtube.force-ssl` (updating an uploaded video's metadata after an edit) → Update → Save. Read/update endpoints reject upload-only tokens, so all three are needed.
3.  **Origins (only needed for the fallback popup):** Google Auth Platform → **Clients** → open the **Web application** client whose ID matches `VITE_GMAIL_CLIENT_ID` → under **Authorized JavaScript origins** add:
    *   `http://localhost:8080` — local dev (`server.port` in `vite.config.ts`)
    *   `https://pianobackings.danielebuatti.com` — production (`VITE_SITE_URL`)
4.  **Redirect URIs:** under the same Web client's **Authorized redirect URIs**, add:
    *   `http://localhost:8080/gmail-oauth-callback`
    *   `https://pianobackings.danielebuatti.com/gmail-oauth-callback`
5.  **Test users:** if the consent screen is in **Testing**, add both admin accounts under Audience → Test users.
6.  **Apply the migration:** run `0034_youtube_tokens.sql` in the Supabase SQL editor (creates the `youtube_tokens` table).
7.  **Connect the YouTube channel:** in Admin → Settings → **Integrations**, click **Connect YouTube Channel** and, on Google's account picker, choose the **Piano Backings by Daniele** channel (Brand Account). This stores a channel-only refresh token in `youtube_tokens` — the step that enables silent uploads. The **Connect Gmail Account** button separately keeps the mailbox token for email sending.
8.  **Deploy the functions:** `supabase functions deploy get-youtube-token` and `supabase functions deploy gmail-oauth-callback` (or just push to `main` and let the Action do it).
9.  **Environment:**
    *   `VITE_YOUTUBE_CLIENT_ID` (optional) or `VITE_GMAIL_CLIENT_ID` must be present at build time — set in `.env.local` for dev and in the Vercel project's env for production.
    *   `VITE_YOUTUBE_CHANNEL_EMAIL` (optional) — defaults to `pianobackingsbydaniele@gmail.com`; used as the Google `login_hint` on the Gmail connect.
    *   Supabase secrets `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` are **reused** by `get-youtube-token`; optionally set `YT_ACCOUNT_EMAIL` (defaults to `pianobackingsbydaniele@gmail.com`).
10. **Propagation:** config changes can take ~5 minutes. An `origin_mismatch` error in the fallback popup usually means the origin isn't listed yet.

**Quota:** every upload costs **1,600 units** of the default 10,000 units/day YouTube quota, so the project allows roughly **6 uploads per day**. Request a quota increase in Google Cloud if you need more.

**Privacy:** the tool defaults to **Unlisted**; `private` and `public` are also selectable. Uploads appear as a `youtu.be/…` link once complete.

**Video title format:** built from the live card fields as `Song — Banner (from Show)`, e.g. `Wondering — Audition Cut (from Bridges of Madison County)`.

---

## Publishing Queue (catalogue + approval + weekly scheduler)

The **Video Title Cards** tool has two queue destinations:
- **Save to publishing queue** — records the full-length title-card video, uploads it to the private `content` bucket, catalogues it in `content_assets`, creates a YouTube `publications` row, and has Gemini draft the title/description/tags.
- **Save teaser (TikTok & IG)** — records a ~30s teaser with a "Full version on YouTube" footer band, creates one asset plus a `tiktok` **and** an `instagram` `publications` draft, and AI-drafts each platform's caption.

Nothing is posted until approved. Both use the background-safe recorder, so you can start a recording and navigate away — it finishes and saves itself.

**Flow:** generate (or vet a delivered track) → AI drafts metadata → **Admin → Publishing** review/edit → **Approve & schedule** → uploaded to YouTube **now** as a `private` video → YouTube itself promotes it to public exactly at the cadence slot → the queue confirms via YouTube and emails you.

**One-off setup:**
1.  **Apply the migrations** in the Supabase SQL editor, in order (after `0034`):
    - `0035_content_publishing.sql` — `content_assets`, `publications`, `publishing_settings`, and the private `content` bucket (admin-only policies).
    - `0036_publishing_cron.sql` — calls `run-publish-queue` every 15 minutes (to upload anything not client-triggered and to flip/verify statuses). Apply **after** the function is deployed.
    - `0037_add_card_preview.sql` — `preview_path` column for the PDF key preview.
    - `0038_make_content_storage_path_nullable.sql` — lets the retention cleanup clear `content_assets.storage_path` (the queue deletes old source webms after `CONTENT_RETENTION_DAYS`).
    - `0039_review_and_cadence.sql` — `backing_requests.no_socials` flag ("never post to socials") and the cadence columns on `publishing_settings` (`schedule_mode` weekly|interval, `interval_days`).
2.  **Set the Gemini secret:** Supabase → Settings → API → Secrets: `GEMINI_API_KEY` (server-side only).
3.  **Deploy the functions** (push to `main` and the Action deploys all): `run-publish-queue`, `draft-publication-metadata`, `check-publication-status`, `update-youtube-video`.
4.  **Set the cadence:** Admin → **Publishing** → Publishing cadence (once a week, or every N days, plus time, timezone, auto-schedule). The timezone matters — scheduling converts wall time to UTC.
5.  **Connect the YouTube channel** (Admin → Settings → Integrations) if not done — publishing uses the same server-side channel token as the "Publish" button.

**How it works:**
- **Approve & schedule** marks the row `approved`, assigns the next weekly slot (auto mode), and triggers one queue pass that uploads **immediately** as a private video with `publishAt` = the slot. YouTube schedules the public flip — no second upload at publish time.
- **Schedule…** opens a manual datetime picker (used instead of the auto slot, or when auto-schedule is off).
- **Publish now** sets the slot to now and uploads immediately (`unlisted` by default).
- **run-publish-queue** claims `approved` rows one at a time (`publishing`), downloads from `content`, uploads to YouTube with `publishAt`. Failures retry up to 3 times, then go `failed` with an **email alert**. It also confirms with YouTube (`videos.list`) that a slot that has passed actually went public before labelling it `published` (with a **"now live" email**).
- **Check** re-syncs one row against YouTube's real state any time (via `check-publication-status`).
- **Re-draft AI / Edit** regenerate or hand-edit the metadata. On rows already uploaded to YouTube, saving (or re-drafting) also pushes the new title/description/tags to the live video via `update-youtube-video` (needs the channel connected with the `youtube.force-ssl` scope — reconnect once in Settings → Integrations if the stored token predates it).
- **Metadata guardrail:** Approve & schedule / Publish now / Schedule… are blocked on rows with no drafted description, so a video never goes out looking unfinished. As a backstop the queue uploads a deterministic default description if metadata is somehow missing.
- **Shop links in descriptions:** the AI drafter (and the default description) link to the track's shop page (`/shop/<slug>`) when the track is an active shop product; videos that aren't in the shop still publish fine — their description just points at the custom-order form instead.
- **Storage retention:** source webms in the `content` bucket are deleted `CONTENT_RETENTION_DAYS` (default **30**) after their YouTube publication goes live — the row, URL and PDF preview are kept. Set the env in Supabase secrets to change the window.
- **Duplicate guard:** saving the same song to the YouTube queue twice is blocked at the generator page.
- **Cadence:** the Publishing cadence card sets either a **weekly** slot (day/time) or an **every-N-days** interval (1–90), plus timezone + auto-schedule. `Approve & schedule` and **Schedule all ready** book the next free slots from that cadence, sliding past anything already scheduled so two videos never collide.
- **Schedule all ready:** bulk-assigns the next free cadence slots to every vetted YouTube row that has drafted metadata and no slot yet, then runs the queue. Rows without a description are skipped (use Re-draft AI / Edit first).
- **Upcoming schedule calendar:** the 6-week grid at the top of Publishing shows every approved/scheduled row on its local calendar day (timezone-aware), so you can see exactly which song goes out when.
- **Release board:** every delivered backing track in one row with its progress across platforms — YouTube status/link, TikTok/IG teaser state, and whether it has a **shop listing** (missing listings show an amber “No shop listing — Add →” link to Admin → Shop). Use **Review & queue** to record a fresh title card for a track with the verified title/show/key and drop it into the queue; use the ban/restore button to flip **Not for socials**.
- **Not for socials (`no_socials`):** a per-track flag on `backing_requests`. Marked tracks are excluded from the queue and `run-publish-queue` skips any of their rows (`skipped`, with the reason), so they can never be posted to YouTube/TikTok/IG.
- **Delete (trash) on any row:** removes the publication from the catalogue (and the asset + files when nothing else references them). It never deletes the YouTube video — use it to clear ghost rows after removing a video on YouTube directly.

**Operating (weekly, ~2 min):**
1. Check you got the **"Now live on YouTube"** email for last week (or that the badge is `Published`).
2. Open **Admin → Publishing** → approve the next item(s) for this week's slot. YouTube will promote them privately → public at the slot.
3. If anything shows `Failed`, check the error, re-draft/edit, and **Approve & schedule** again.

**Platforms:** only YouTube is wired for posting so far. TikTok (Content Posting API) and Instagram Reels (Meta API) are mapped as `platform` values in `publications`; teasers + AI captions are already produced and shown in Admin → Publishing (buttons are hidden until posting integrations land).