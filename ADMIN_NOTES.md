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

---

## Edge Functions Deployment (Manual Process)

**Note:** Dyad writes the function code, but you must manually deploy them to Supabase using the CLI because deployment requires your personal account credentials.

To deploy all Edge Functions from your local terminal:

1.  **Login:** `supabase login`
2.  **Link Project:** `supabase link --project-ref kyfofikkswxtwgtqutdu`
3.  **Deploy All:** `supabase functions deploy`

If "Deploy All" fails to find functions, deploy them individually:
*   `supabase functions deploy create-backing-request`
*   `supabase functions deploy create-stripe-checkout`
*   `supabase functions deploy get-guest-request-by-token`
*   `supabase functions deploy get-order-by-session-id`
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