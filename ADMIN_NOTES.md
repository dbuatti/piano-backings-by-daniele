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
    *   **Account Used:** `pianobackingsbydaniele@gmail.com` — the same account whose refresh token is stored by the Gmail OAuth flow.
    *   **Purpose:** Uploads the generated title-card clip. By default the access token is minted **server-side** (Edge Function `get-youtube-token`) from the stored refresh token, so there is **no browser popup** and uploads always land on the channel. If the server token is unavailable, the client silently falls back to the Google Identity Services popup.
    *   **Scope:** `https://www.googleapis.com/auth/youtube.upload` (added to the Google connect flow alongside `gmail.send`).
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

*   **OAuth Client Configuration:** Ensure the Google Cloud Project's OAuth 2.0 Client ID for "Web application" has the correct "Authorized JavaScript origins" and "Authorized redirect URIs" for both local development (`http://localhost:32100/...`) and production (`https://pianobackingsbydaniele.vercel.app/...`).
*   **API Enablement:** The Gmail API must be explicitly enabled in your Google Cloud Project.
*   **OAuth Consent Screen:** If your OAuth consent screen is in "Testing" status, ensure all admin accounts (e.g., `daniele.buatti@gmail.com`, `pianobackingsbydaniele@gmail.com`) are added as "Test users".

---

## YouTube Publish (server-side token, no popup)

The **Publish to YouTube** button on the Video Title Cards tool (`/admin` → Shop → Marketing) records the clip in the browser. The access token is normally minted **server-side** by the `get-youtube-token` Edge Function from the Google refresh token already stored for `pianobackingsbydaniele@gmail.com`, so publishing is **silent** (no OAuth popup) and always uploads as the channel. If that call fails (e.g. the stored token predates the YouTube scope), the client falls back to the Google Identity Services popup so publishing never breaks.

**One-off Google Cloud + Supabase setup:**
1.  **Enable the API:** APIs & Services → Library → **YouTube Data API v3** → Enable.
2.  **Add the scope:** Google Auth Platform → **Data access** → Add or remove scopes → `https://www.googleapis.com/auth/youtube.upload` → Update → Save.
3.  **Origins (only needed for the fallback popup):** Google Auth Platform → **Clients** → open the **Web application** client whose ID matches `VITE_GMAIL_CLIENT_ID` → under **Authorized JavaScript origins** add:
    *   `http://localhost:8080` — local dev (`server.port` in `vite.config.ts`)
    *   `https://pianobackings.danielebuatti.com` — production (`VITE_SITE_URL`)
4.  **Redirect URI:** ensure `https://<your-host>/gmail-oauth-callback` is listed for the Web client (both local and production) — this is the existing Gmail connect redirect.
5.  **Test users:** if the consent screen is in **Testing**, add both admin accounts under Audience → Test users.
6.  **Deploy the function:** `supabase functions deploy get-youtube-token` (also deploy `gmail-oauth-callback` since its scope list changed).
7.  **Reconnect the channel account:** in Admin → Settings, click **Connect Gmail Account** while signed into Google as `pianobackingsbydaniele@gmail.com`. This replaces the stored refresh token with one that also has the `youtube.upload` scope — the step that enables silent uploads. (The same token continues to power email sending.)
8.  **Environment:**
    *   `VITE_YOUTUBE_CLIENT_ID` (optional) or `VITE_GMAIL_CLIENT_ID` must be present at build time — set in `.env.local` for dev and in the Vercel project's env for production.
    *   `VITE_YOUTUBE_CHANNEL_EMAIL` (optional) — defaults to `pianobackingsbydaniele@gmail.com`; used as the Google `login_hint` on connect.
    *   Supabase secrets `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` are **reused** by `get-youtube-token`; optionally set `YT_ACCOUNT_EMAIL` (defaults to `pianobackingsbydaniele@gmail.com`).
9.  **Propagation:** config changes can take ~5 minutes. An `origin_mismatch` error in the fallback popup usually means the origin isn't listed yet.

**Quota:** every upload costs **1,600 units** of the default 10,000 units/day YouTube quota, so the project allows roughly **6 uploads per day**. Request a quota increase in Google Cloud if you need more.

**Privacy:** the tool defaults to **Unlisted**; `private` and `public` are also selectable. Uploads appear as a `youtu.be/…` link once complete.

**Video title format:** built from the live card fields as `Song — Banner (from Show)`, e.g. `Wondering — Audition Cut (from Bridges of Madison County)`.