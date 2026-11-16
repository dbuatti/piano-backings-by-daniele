# SEO check log — pianobackings.danielebuatti.com

Read-only weekly check of Google Search Console (property `sc-domain:danielebuatti.com`),
the sitemap, the Google Business Profile and a Google search for "Piano Backings by Daniele".
Newest first. Owner: Daniele. Started 2026-10-04.

Related code: `api/sitemap.xml.ts` (sitemap), `shared/song-catalog.mjs` (slugs/product
grouping), `shared/html-meta.mjs` + `scripts/prerender-seo.mjs` (prerendered `<head>` and
`<noscript>`), `vercel.json` (redirects/rewrites).

---

## Mon 17 Nov 2026 — code fixes shipped (commit `42105dd`)

Two of the open code-level items were fixed in the repo and pushed to `main`:

- **PB-4 (noscript snippets) — DONE in code.** The "This site needs JavaScript enabled
  to run" / "Ordering and previews need JavaScript enabled" text came from three places:
  `index.html:177` and both `<noscript>` branches in `shared/html-meta.mjs`. All replaced
  with descriptive, keyword-rich copy so Google snippets read well. Verified with a full
  `pnpm build` (8 static pages + 37 song pages) — no apology strings remain in `dist/`.
  Takes effect on the next Vercel deploy.
- **flloyd typo slug (to-do #72) — 301 added.** `vercel.json` now redirects
  `/shop/through-the-mountain-flloyd-collins` → `/shop/through-the-mountain-floyd-collins`
  (301). Both URLs returned 200 before this; the typo was a real live duplicate page.
  - **Root cause is still open (see below):** the typo comes from a Supabase `products`
    row with `artist_name = "Flloyd Collins"`. Until that row is corrected the sitemap
    keeps listing the typo URL (it now redirects, but is still advertised).

### Open actions carried forward

1. Reply to **rayhan maskun's** 5★ review (~8 Nov) — Business Profile → Reviews. (to-do #2)
2. Correct the DB typo: `products.artist_name` "Flloyd Collins" → "Floyd Collins"
   (cleans the sitemap automatically — grouping is by title + show). (to-do #72)
3. **vercel.app root 301:** `pianobackingsbydaniele.vercel.app/` still returns 200
   (not 301) while `/about` correctly 301s. Rule in `vercel.json` looks correct — check
   Vercel dashboard domain/alias config. (PB-1/PB-2, to-do #70)
4. Business Profile completeness (PB-7) — owner action.

Resolved: **PB-3** (request indexing of `/`) no longer needed — recrawled 2 Nov with the
correct canonical.

---

## Mon 16 Nov 2026 — weekly check

- **Sitemap:** Success, last read 13 Nov, 44 discovered pages (unchanged).
- **URL Inspection** (Googlebot smartphone; all on Google + indexed; Google canonical =
  inspected URL; user-declared canonical correct):
  - `/` — RECRAWLED 2 Nov 19:25 (was 30 Oct). Discovery shows sitemap "Temporary
    processing error" (minor); referring page thestageroster.com.
  - `/shop` — last crawl still 20 Oct 17:18; discovered via sitemap.
  - `/about` — RECRAWLED 13 Nov 06:54 (first since 11 Oct); discovered via sitemap.
- **Performance, web, last 7 days (7–13 Nov), query contains "pianobackings":**
  1 click, 30 impressions, CTR 3.3%, avg position 6.2 (was 3 / 42 / 14.9 — fewer clicks,
  much better average position).
- Sitemap double-slash bug: still FIXED (44 URLs, none with "//").
  "flloyd" duplicate slug STILL in the sitemap alongside the correct "floyd" one.
- **Business Profile:** Verified. 4 reviews, all 5★. rayhan maskun (~8 Nov) STILL has no
  owner reply; Joel, Angie and Samantha replied. "Profile strength: Complete info".
- **Google "Piano Backings by Daniele":** pianobackings.danielebuatti.com #1 (with an
  "About Daniele Buatti" sitelink), then YouTube, SoundCloud, Facebook, Instagram, The
  Stage Roster, danielebuatti.com. No vercel.app on page 1. Business Profile panel shows
  (5.0, 4 Google reviews, Musician; owner view). Snippets still read "This site needs
  JavaScript enabled to run" / "Ordering and previews need JavaScript enabled" → fixed
  in code 17 Nov (above).

### Earlier checks (summary)

- **9 Nov:** 1 click / 30 impr / pos 6.2 (from 3/42/14.9). `/` recrawled 2 Nov;
  `/about` recrawled 13 Nov. New rayhan review still unanswered. flloyd duplicate open.
- **2 Nov:** sitemap now 44 pages (7 core + 37 shop). `/` recrawled 30 Oct (double-slash
  canonical gone). flloyd duplicate first noticed. vercel.app still reachable via /pricing.
- **11 Oct:** vercel.app still #1; custom domain #2. Knowledge panel shows 5.0 / 3 reviews.
- **4 Oct:** baseline. 6 sitemap pages. vercel.app #1. 3 reviews, 1 replied.