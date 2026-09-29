// The production origin with no trailing slash, so `${SITE_URL}/shop` never becomes
// `//shop` when VITE_SITE_URL is set as "https://example.com/". Used by vite.config.ts,
// the prerender script and the Vercel functions.
export const DEFAULT_SITE_URL = 'https://pianobackings.danielebuatti.com';

export const normaliseSiteUrl = (value) =>
  String(value || DEFAULT_SITE_URL).trim().replace(/\/+$/, '') || DEFAULT_SITE_URL;
