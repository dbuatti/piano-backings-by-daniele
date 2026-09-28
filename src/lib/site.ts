import { normaliseSiteUrl } from '../../shared/site-url.mjs';

// Always the production domain, so previews and the old vercel.app address never
// present themselves to search engines as the real site. No trailing slash.
export const SITE_URL = normaliseSiteUrl(import.meta.env.VITE_SITE_URL);

/** Canonical URL for a path: production domain, no query string, no trailing slash. */
export const canonicalFor = (pathname: string): string => {
  const path = `/${pathname.replace(/^\/+|\/+$/g, '')}`;
  return path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`;
};
