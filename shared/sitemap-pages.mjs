// Public pages listed in sitemap.xml. `lastmod` is the date the page's content last
// meaningfully changed: bump it when you edit that page's copy, not on every deploy.
// /form-page is only listed while custom orders are open (not closed, not on holiday).
export const SITEMAP_PAGES = [
  { path: '/', lastmod: '2026-09-27', changefreq: 'weekly', priority: '1.0' },
  { path: '/shop', lastmod: '2026-09-27', changefreq: 'weekly', priority: '0.9' },
  { path: '/form-page', lastmod: '2026-09-27', changefreq: 'monthly', priority: '0.8', requiresOrdersOpen: true },
  { path: '/pricing', lastmod: '2026-09-27', changefreq: 'monthly', priority: '0.8' },
  { path: '/about', lastmod: '2026-09-27', changefreq: 'monthly', priority: '0.6' },
  { path: '/terms', lastmod: '2026-09-26', changefreq: 'yearly', priority: '0.3' },
  { path: '/privacy', lastmod: '2026-09-26', changefreq: 'yearly', priority: '0.3' },
];
