// After `vite build`: write dist/seo/<page>.html for each public page with its own
// title, description, canonical URL and structured data already in the HTML, so
// search engines see page-specific tags without running JavaScript.
// vercel.json rewrites /pricing → /seo/pricing.html etc.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyPageMeta } from '../shared/html-meta.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const siteUrl = (process.env.VITE_SITE_URL || 'https://pianobackings.danielebuatti.com').replace(/\/+$/, '');

const pages = JSON.parse(readFileSync(join(root, 'src/lib/seo-pages.json'), 'utf8'));
const faqs = JSON.parse(readFileSync(join(root, 'src/lib/about-faqs.json'), 'utf8'));
const shell = readFileSync(join(dist, 'index.html'), 'utf8');

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/form-page', label: 'Order a custom track' },
  { href: '/shop', label: 'Backing track library' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About & FAQ' },
];

const HEADINGS = {
  '/': 'Custom piano backing tracks for singers worldwide, recorded in Melbourne',
  '/shop': 'Musical theatre piano backing track library',
  '/form-page': 'Order a custom piano backing track',
  '/pricing': 'Piano backing track pricing',
  '/about': 'About Daniele Buatti, Melbourne pianist and music director',
};

const extraJsonLd = {
  '/about': [{
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }],
};

const breadcrumb = (route, name) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
    { '@type': 'ListItem', position: 2, name, item: `${siteUrl}${route}` },
  ],
});

mkdirSync(join(dist, 'seo'), { recursive: true });
const written = [];
for (const [route, meta] of Object.entries(pages)) {
  const name = route === '/' ? 'home' : route.slice(1);
  const html = applyPageMeta(shell, {
    ...meta,
    url: route === '/' ? `${siteUrl}/` : `${siteUrl}${route}`,
    heading: HEADINGS[route],
    links: NAV,
    jsonLd: [
      ...(extraJsonLd[route] || []),
      ...(route === '/' ? [] : [breadcrumb(route, HEADINGS[route] || meta.title.split(' | ')[0])]),
    ],
  });
  const file = join(dist, 'seo', `${name}.html`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  written.push(`seo/${name}.html`);
}
// index.html is also the fallback for every other route (dashboard, admin...), so it
// gets the home page's crawler summary but no canonical URL of its own.
const home = applyPageMeta(shell, { ...pages['/'], url: `${siteUrl}/`, heading: HEADINGS['/'], links: NAV })
  .replace(/\s*<link rel="canonical"[^>]*>/, '');
writeFileSync(join(dist, 'index.html'), home);

console.log(`[prerender-seo] wrote ${written.length} pages: ${written.join(', ')}`);
