// After `vite build`: write dist/seo/<page>.html for each public page (and
// dist/seo/shop/<id>.html for each song) with the page itself rendered into the HTML
// by dist-ssr/entry-server.js, plus its own title, description, canonical URL and
// structured data, so search engines see everything without running JavaScript.
// vercel.json rewrites /pricing → /seo/pricing.html etc.; api/shop-product.ts serves
// the song pages.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { applyPageMeta } from '../shared/html-meta.mjs';
import { productSeo } from '../shared/product-seo.mjs';
import { normaliseSiteUrl } from '../shared/site-url.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const siteUrl = normaliseSiteUrl(process.env.VITE_SITE_URL);

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

const { render, listShopProducts } = await import(pathToFileURL(join(root, 'dist-ssr', 'entry-server.js')).href);

// framer-motion renders each element's entrance start state (opacity:0, offset) into
// the HTML. Drop it so the content is visible before JavaScript runs; the app skips
// the entrance animation for content that was already on screen.
const showMotionContent = (html) =>
  html.replace(/ style="([^"]*)"/g, (attr, css) => {
    if (!/(^|;)opacity:0(;|$)/.test(css)) return attr;
    const kept = css
      .split(';')
      .filter((d) => d && !/^(opacity|transform|will-change)\s*:/.test(d))
      .join(';');
    return kept ? ` style="${kept}"` : '';
  });

const renderPage = async (url, options) => {
  const { html, state, errors } = await render(url, options);
  for (const error of errors) console.warn(`[prerender-seo] ${url}: part of the page will only render in the browser:\n${error}`);
  return { bodyHtml: showMotionContent(html), state };
};

const writePage = (relative, html) => {
  const file = join(dist, relative);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  written.push(relative);
};

const written = [];
for (const [route, meta] of Object.entries(pages)) {
  const name = route === '/' ? 'home' : route.slice(1);
  const html = applyPageMeta(shell, {
    ...meta,
    ...(await renderPage(route)),
    url: route === '/' ? `${siteUrl}/` : `${siteUrl}${route}`,
    jsonLd: [
      ...(extraJsonLd[route] || []),
      ...(route === '/' ? [] : [breadcrumb(route, HEADINGS[route] || meta.title.split(' | ')[0])]),
    ],
  });
  writePage(`seo/${name}.html`, html);
}

// One page per song in the shop. Songs added after this build are still served by
// api/shop-product.ts, with their tags but without prerendered content.
let products = [];
try {
  products = await listShopProducts();
} catch (error) {
  console.warn(`[prerender-seo] could not load shop products, skipping song pages: ${error?.message || error}`);
}
for (const product of products) {
  const seo = productSeo(product, siteUrl);
  const html = applyPageMeta(shell, {
    title: seo.title,
    description: seo.description,
    url: seo.url,
    jsonLd: seo.jsonLd,
    ...(await renderPage(`/shop/${product.id}`)),
  });
  writePage(`seo/shop/${product.id}.html`, html);
}

// index.html is also the fallback for every other route (dashboard, admin...), so it
// gets the home page's crawler summary but no canonical URL of its own, and no
// prerendered content (those pages are private).
const home = applyPageMeta(shell, { ...pages['/'], url: `${siteUrl}/`, heading: HEADINGS['/'], links: NAV })
  .replace(/\s*<link rel="canonical"[^>]*>/, '');
writeFileSync(join(dist, 'index.html'), home);

// Vercel serves dist/404.html with a real 404 status for any URL no route in
// vercel.json matches; it holds the app's own "Page not found" page.
const notFound = applyPageMeta(shell, {
  title: 'Page Not Found | Piano Backings by Daniele',
  description: "This page doesn't exist. Browse custom piano backing tracks and the backing track library instead.",
  url: `${siteUrl}/`,
  noindex: true,
  pageId: 'not-found',
  ...(await renderPage('/404', { notFound: true })),
}).replace(/\s*<link rel="canonical"[^>]*>/, '');
writePage('404.html', notFound);

const songPages = written.filter((f) => f.startsWith('seo/shop/')).length;
console.log(`[prerender-seo] wrote ${written.length - songPages} pages (${written.filter((f) => !f.startsWith('seo/shop/')).join(', ')}) and ${songPages} song pages`);
