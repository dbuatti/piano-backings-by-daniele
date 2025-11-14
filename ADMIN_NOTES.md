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

**Important Considerations:**

*   **OAuth Client Configuration:** Ensure the Google Cloud Project's OAuth 2.0 Client ID for "Web application" has the correct "Authorized JavaScript origins" and "Authorized redirect URIs" for both local development (`http://localhost:32100/...`) and production (`https://pianobackingsbydaniele.vercel.app/...`).
*   **API Enablement:** The Gmail API must be explicitly enabled in your Google Cloud Project.
*   **OAuth Consent Screen:** If your OAuth consent screen is in "Testing" status, ensure all admin accounts (e.g., `daniele.buatti@gmail.com`, `pianobackingsbydaniele@gmail.com`) are added as "Test users".