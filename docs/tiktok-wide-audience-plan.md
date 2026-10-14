# TikTok "wide audience" plan — rebuild toward a passable Direct Post audit

Written 2026-10-15. The decision this serves: TikTok **public + automatic + free**
is not reachable through TikTok's own API for a private, single-owner tool. The
only *free* sanctioned route is to become a genuine **wide-audience product** and
pass TikTok's Content Posting (Direct Post) audit. This document specs what that
takes, phased, with decision gates and an honest cost/odds read.

Read with:
- `docs/social-automation-research.md` — why a private tool is the shape the audit rejects.
- `docs/publishing-roadmap.md` §8 — the current decision (stay on private auto-post).

---

## 1. The constraint, in TikTok's own words

TikTok's Content Sharing Guidelines, **Intended Use**:

> "API Clients must not be limited to test applications and should be intended for
> a **wide audience**, not limited to internal groups/private use."
>
> "Not acceptable: A utility tool to help upload contents to the account(s) you or
> your team manages. ❌"

"Wide audience" is about the **app**, not your follower count. It has to be a
product where **many creators each publish their own content** through your UI.
The audit also enforces a UI checklist (§3). Until it passes, every Direct Post is
`SELF_ONLY`, and an unaudited app can only post to a **private** account.

**Consequence that matters immediately:** while unaudited, `@pianobackingsbydaniele`
must stay **private** or the current auto-post breaks with
`403 unaudited_client_can_only_post_to_private_accounts`. Public account and
private auto-post are mutually exclusive until the audit passes.

---

## 2. The core insight (why this is a product decision)

The only way to make *your own* TikTok post publicly and hands-off, for free, is
to **stop being a private tool**. Your posting then rides on the product:

> A public app where any musician connects their own TikTok and schedules their own
> promo clips. You are just creator #1 on it.

That is exactly what Buffer / Later / Postiz do — and why they passed. It also means
the "price" of the free route is: **build and run a small product with real users.**
There is no version of this that keeps the app a single-owner admin and still passes.

The good news: the hard, differentiated piece already exists — the teaser recorder,
caption drafter, cadence scheduler, queue worker, and the TikTok/Instagram clients
in this repo. We are not starting over; we are **lifting a proven single-tenant
pipeline into a multi-tenant product** and wrapping it in a compliant composer.

---

## 3. What the audit inspects (the pass/fail checklist)

### 3a. Product-level (can it be rejected wholesale)
- [ ] App is a **general product**, publicly available, not an internal utility.
- [ ] It has real, non-test users (TikTok reads your usage estimates and can sanity-check the product).
- [ ] App is in **Production** (not Sandbox) status before applying for the Direct Post audit.
- [ ] A public **website**, **Privacy Policy**, and **Terms of Service** URLs exist.
- [ ] Media for any PULL_FROM_URL path (photos) is served from a **verified domain/prefix**.

### 3b. In-app UX (each item is a documented hard requirement)
- [ ] Fetch `/post/publish/creator_info/query/` **when rendering the post page** and
      display the **connected creator's nickname** (which TikTok account this goes to).
- [ ] If `creator_info` says the creator can't post right now, **stop** and prompt to retry later.
- [ ] **Privacy picker** populated from the returned `privacy_level_options`.
- [ ] **Content disclosure** toggle (off by default): "Your brand" / "Branded content",
      with the required "Paid partnership" wording; disable publish when disclosure is on
      but nothing is selected; "Only me" is invalid with branded content.
- [ ] **Preview** of the exact content to be posted.
- [ ] **Editable** caption/title (presets must be editable).
- [ ] **Consent** before publish: "By posting, you agree to TikTok's Music Usage Confirmation."
- [ ] No promotional watermarks/logos added to the creator's content.
- [ ] Inform the user the post **may take a few minutes** to appear.
- [ ] **Poll publish status** (or handle webhooks) so the user can see the outcome.

### 3c. Submission packet
- [ ] **UX mockups as a PDF** illustrating the TikTok flow in the app.
- [ ] A **screen recording** demonstrating the full flow: sign-in → authorize → compose → publish.
- [ ] **Usage estimates**: how many users publish to TikTok per day (this sets your app's cap).

---

## 4. What we build (grounded in the current repo)

Current state (the gap):
- `social_tokens` is keyed by `platform` **PRIMARY KEY** — one owner, one row per platform.
- Auth is a hardcoded `ADMIN_EMAILS` allowlist (`src/hooks/useAdmin.ts`).
- The worker (`run-social-queue`) posts for the single stored token via service role.
- The teaser recorder, caption drafter, cadence engine, and IG/TikTok clients are solid and reusable.

The transformation is **tenancy + a compliant composer**, not a rewrite of the pipeline.

### Workstream A — Multi-tenant foundation
- Public auth (Supabase Auth) with per-user accounts; retire the `ADMIN_EMAILS` gate for creators.
- `social_accounts` keyed by `(user_id, platform)`; move/rename `social_tokens`; tokens
  encrypted at rest (Supabase Vault or `pgcrypto`), RLS so a user sees only their own.
- Per-user `publishing_settings`, `publications`, `content_assets`, cadence; RLS on every table.
- OAuth connect/disconnect per creator; handle token revoke + data-deletion callback.
- Token refresh worker becomes per-row, not single-platform.

### Workstream B — Compliant composer (the audit's heart)
A "New post" screen implementing §3b literally:
1. On open → call `creator_info` (server-side, per user) → show **nickname/avatar**
   and, if posting is blocked, a "can't post right now, try later" state that disables publish.
2. Preview player with the exact vertical clip.
2. Editable caption (pre-filled by the existing drafter).
3. Privacy dropdown from `privacy_level_options`.
4. Content-disclosure toggle with the required wording and validation rules.
5. Consent line: *"By posting, you agree to TikTok's Music Usage Confirmation."*
2. Publish / schedule button; on submit, poll status and show "may take a few minutes".

### Workstream C — Compliance surface
- Public marketing site + Privacy Policy + ToS (the app must look like a product).
- No watermarks/branded overlays on posted media.
- Post-status notifications (in-app + email).
- Abuse/limits: surface caps and `spam_risk_*` errors as plain messages.

### Workstream C-bis — Caps & reliability
- Honor the **active-user cap** (5/24h while unaudited; estimate-based once audited) and the
  **per-creator daily post cap** (~low teens); surface both, back off, and retry after reset.
- Handle `spam_risk_too_many_posts`, `reached_active_user_cap`, `scope_not_authorized`.
- Idempotent posting (the claim guard we already added), reconcile stuck rows (already added).

### Workstream D — Audit submission
- Move the TikTok app to Production, enable Direct Post, request scopes.
- Produce the **UX mockups PDF**, the **screen recording**, and **usage estimates**.
- Submit; iterate on rejections.

---

## 4b. Minimum passable product (scope control)

To keep this shippable, the smallest product that passes looks like:

> **"Promote your track" — a public web app.** Sign up → connect TikTok → pick/record
> a vertical clip → write a caption → preview → schedule or post now. One composer,
> one queue, one platform (TikTok) first; Instagram/YouTube can follow.

No teams, no billing, no analytics required for the audit — but real, public,
self-serve so a stranger could use it. Everything else is optional.

---

## 5. Phases, deliverables, gates

| Phase | Work | Deliverable | Gate |
|---|---|---|---|
| 0 | Product definition | 1-page product spec, name, domain, and the audit "use case" statement | **Gate 1: do you want to run a product?** |
| 1 | Multi-tenant foundation (A) | A second, unrelated user can sign up, connect their own TikTok, and see an empty queue | — |
| 2 | Compliant composer (B) | Composer reviewed line-by-line against §3b | — |
| 3 | Compliance surface (C) | Public site + Privacy/ToS + deletion/revoke + notifications | **Gate 2: submit?** |
| 4 | Audit submission (D) | Production app review, then Direct Post audit submitted | — |
| 5 | Caps & reliability (A/D) | Cap-aware queue, quota dashboard, honest errors | — |
| 6 | Launch | First non-owner creators onboarded, accounts warmed, monitored | — |

**Rough effort:** Phase 1 ≈ 2–3 weeks; Phase 2 ≈ 2–3 weeks; Phase 3 ≈ 1 week;
Phase 4 ≈ 1–2 weeks prep then **2–6 weeks waiting / resubmits**; Phase 5 ≈ 1–2 weeks.
Build ≈ **6–10 weeks of focused work**; end-to-end to a live, audited post ≈
**2–4 months calendar** if approvals go smoothly (rejections add cycles).

---

## 6. What we're in for (honest read)

**This is not a feature. It's becoming a business.** Past Gate 1 you are signing up
to: host other people's content, handle their account tokens, do user support,
moderate abuse, publish a privacy policy you actually honour, and keep the app
compliant or lose API access. That is the real cost — not the code.

**Odds of approval:**
- Genuine public product with real users → **good** (this is literally the Buffer/Postiz shape).
- Thin wrapper that only ever serves you → **near zero** (it's the named ❌).

**Things that guarantee rejection** (avoid these): no public users; missing any §3b
item; a hidden hard-coded `PUBLIC_TO_EVERYONE`; no consent text; watermarks on content.

**Recurring constraints after approval:** per-creator daily post caps, an app-level
active-user cap sized from your estimates, and TikTok's own advice to **warm a new
TikTok account (~4 weeks) before connecting any third-party tool**.

**The economics — the blunt comparison:**
A paid audited API (Blotato Starter / Upload-Post Basic / Postiz Cloud) is
**~$24–29/mo**. Even pricing this build cheaply at ~100 hours, the paid API is the
equivalent of **many years** of subscription. So:

- If the **product itself is the goal** → this plan pays for itself; build it.
- If you **only want your own TikTok public and automatic** → paying ~$25/mo is far
  cheaper than 6–10 weeks plus running a product, and it's the same result.

---

## 7. Where this leaves the current app

Nothing here changes today's behaviour. The existing private auto-post (Path A) keeps
working **as long as the account stays private**. If you want the account public
before this plan lands, Path A must be turned off (it will 403 otherwise) and you
fall back to the drafts/inbox flow until the audit passes.

## 8. Decision

- **No-go** → stay on Path A (private) or route through a paid audited API.
- **Go** → start at Phase 0 (a 1-page product definition) and re-evaluate at Gate 1,
  before any code is written.

---

## 9. How the product would exist (architecture)

**Short answers:** a separate **website/domain** yes; a separate **repo** no — the
pipeline is too valuable to fork. Backend: a **separate Supabase project** for
creator data (the shop's project holds customer PII and payments; a public app with
untrusted users should not share it).

### Why its own domain
TikTok audits the **product's public presence** — website + Privacy Policy + ToS URLs.
It also can't live under a piano-shop brand: a public self-serve tool looks nothing
like a storefront, and mixing a public signup surface into the shop app is both a
product and a security smell. Its own domain is part of the audit deliverable.

### Repo layout (target)
```
/                       npm workspaces
  apps/
    shop/               current Vite app (storefront + admin)  -> piano-backings-bydaniele.com
    promoter/           new public Vite app (the product)      -> e.g. promotethatrack.com
  packages/
    pipeline/           recorder, caption drafter, cadence, queue client,
                        tiktok/instagram API clients  (extracted from src/)
    ui/                 shared shadcn components
  supabase/
    migrations/         shop schema (current) + product schema
    functions/          shared workers (run-social-queue, refresh-social-tokens, ...)
```

### What is reused vs new
| Reused as-is (the moat) | New (the product) |
|---|---|
| Teaser recorder, caption drafter, cadence engine | Public auth + open signup |
| `run-social-queue` worker (claim guard, reconcile, IG resumable, TikTok duration guard) | Per-creator `social_accounts` (RLS, encrypted tokens) |
| TikTok/Instagram clients (`_shared/*.ts`) | The compliant composer (§3b) |
| Slot/scheduling logic | Website, Privacy, ToS, deletion/revoke, notifications |

### Backend choice
| Option | When |
|---|---|
| **Separate Supabase project** (recommended) | Isolates creator data from shop customers; a compromise or abuse spike in the product can't reach shop data. Cost: deploy the shared functions to both projects (a script). |
| Same project, separate `publisher` schema + RLS | Simplest to start; acceptable if the product stays small. |

### Fastest alternative (if you want to validate the idea first)
Skip the monorepo. Add the product as a **new route group in this app** behind its
own subdomain, with **separate tables + RLS + a separate signup audience**, and split
into apps later only if it gains users. Faster to ship, but you carry the shared-project
security smell until you split. The monorepo is the "do it right" version.

---

## 10. Appendix: the unofficial ("banned") method

The only approach that satisfies all three of {public, automatic, free} today. It
means posting **without TikTok's Content Posting API** — outside their sanctioned
surface, which their ToS forbid. Three flavours, worst-to-best in practice:

### 10a. Browser automation (most practical unofficial route)
- **How:** a headless Chromium with a **persisted logged-in session** (cookies) drives
  `tiktok.com/upload`: set the file input, type the caption, click Post. It uses the
  real web UI, so the result is a genuine public post.
- **Why it's tempting:** free, public, and fully automatic once the session is warm.
- **Why it hurts:**
  - **Doesn't fit our stack.** Supabase Edge Functions are Deno with no Chromium; this
    needs an always-on box — a small VPS, or a browser service (Browserless/Fly/Railway).
  - **Brittle:** TikTok ships UI changes and A/B variants constantly; selectors break
    without warning. Expect ongoing repair work.
  - **Login friction:** CAPTCHA/slider challenges, device verification, email/SMS
    codes; sessions expire and need re-auth (a human step you were trying to remove).
  - **Detected as a bot:** headless fingerprints, datacenter IPs, no mouse/typing
    entropy. TikTok actively counters this.
- **Status: built.** `tools/tiktok-browser-poster` is a standalone Playwright service
  that claims due TikTok rows from `publications`, posts them through the web
  composer, and writes the result back. It ships `DRY_RUN`, `MAX_PER_RUN`, stale-claim
  recovery, and screenshot-on-failure. TikTok ownership is toggled with
  `publishing_settings.social_tiktok_poster` (migration `0045`), so the API worker
  stops racing it. The account must be **public** for the posts to be seen. See the
  service `README.md` for deploy and the one-time login.

### 10b. Reverse-engineered mobile API (what bot farms use)
- **How:** call the private endpoints the mobile app uses with forged device-signature
  params (`X-Gorgon`/`X-Khronos`-style). Unofficial libraries (`TikTok-Api` etc.) do a
  mix of read/scrape and, region-dependent, post.
- **Why it's worse:** the signatures are obfuscated and rotate; detection is the most
  aggressive; this is the pattern most associated with bans.

### 10c. Paid unofficial wrappers (e.g. TikAPI)
- Unofficial, ToS-risky, mostly read-oriented, ~$29–189/mo. Not "free", and still not
  sanctioned.

### What "banned" actually means
- **ToS breach**, first. Then, escalating: content removal → shadowban (posts hidden
  from For-You) → temporary suspension → **permanent account ban**, plus IP and
  device-fingerprint bans that follow you to new accounts.
- The thing at risk is `@pianobackingsbydaniele` — the brand account this is all for.
- It can also sour the *legitimate* API connection on the same account.

### If it were built anyway (honest design sketch)
A separate small service — not Edge Functions — running Playwright with a persistent
profile on a residential-ish IP; a **kill switch** and **dry-run mode**; screenshot-on-
failure; a manual fallback when detection trips. Note the irony: the infra
(~$5–15/mo) plus permanent upkeep and ban risk gets you **close to the cost of the paid
audited API (~$24–29/mo), without the guarantee.**

### Verdict
It is the only free+public+automatic option, and it is the one that bets the account.
Recommended only if you explicitly accept losing the account as a possible outcome.
