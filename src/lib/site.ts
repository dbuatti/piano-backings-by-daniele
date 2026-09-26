// Always the production domain, so previews and the old vercel.app address never
// present themselves to search engines as the real site.
export const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://pianobackings.danielebuatti.com';

/** Canonical URL for a path: production domain, no query string, no trailing slash. */
export const canonicalFor = (pathname: string): string =>
  `${SITE_URL}${pathname === '/' ? '/' : pathname.replace(/\/+$/, '')}`;
