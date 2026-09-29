import { normaliseSiteUrl } from '../../shared/site-url.mjs';

// Always the production domain, so previews and the old vercel.app address never
// present themselves to search engines as the real site. No trailing slash.
export const SITE_URL = normaliseSiteUrl(import.meta.env.VITE_SITE_URL);

/** Canonical URL for a path: production domain, no query string, no trailing slash. */
export const canonicalFor = (pathname: string): string => {
  const path = `/${pathname.replace(/^\/+|\/+$/g, '')}`;
  return path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`;
};

/** The one public contact address. Order emails are sent from (and replied to) this inbox. */
export const CONTACT_EMAIL = 'pianobackingsbydaniele@gmail.com';

/** Google Business Profile review form (Business Profile → Ask for reviews). */
export const GOOGLE_REVIEW_URL = 'https://g.page/r/CdYOLqci-9TKEBM/review';
