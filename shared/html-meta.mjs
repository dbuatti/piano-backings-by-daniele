// Rewrites the <head> of the built index.html for one page: title, description,
// canonical, Open Graph / Twitter tags, extra JSON-LD, and crawler-readable
// <noscript> content. Used at build time (scripts/prerender-seo.mjs) and at request
// time for shop products (api/shop-product.ts), so both produce identical markup.
// Plain JS (.mjs) so Node scripts and Vercel functions import it without a build step.

export const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// JSON inside <script> must not be able to close the tag.
const safeJson = (data) => JSON.stringify(data).replace(/</g, '\\u003c');

const setMeta = (html, attr, name, content) => {
  const pattern = new RegExp(`<meta\\s+${attr}="${name}"\\s+content="[^"]*"\\s*/?>`);
  const tag = `<meta ${attr}="${name}" content="${escapeHtml(content)}">`;
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace('</head>', `    ${tag}\n  </head>`);
};

/**
 * @param {string} html built index.html
 * @param {{ title: string, description: string, url: string, heading?: string,
 *           jsonLd?: object[], links?: { href: string, label: string }[], noindex?: boolean,
 *           bodyHtml?: string, state?: object, pageId?: string }} page
 *   bodyHtml: the page prerendered by src/entry-server.tsx, placed inside #root.
 *   state: react-query data it was rendered from, for the browser's first render.
 */
export const applyPageMeta = (html, page) => {
  let out = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(page.title)}</title>`);
  out = setMeta(out, 'name', 'description', page.description);
  out = setMeta(out, 'property', 'og:title', page.title);
  out = setMeta(out, 'property', 'og:description', page.description);
  out = setMeta(out, 'property', 'og:url', page.url);
  out = setMeta(out, 'name', 'twitter:title', page.title);
  out = setMeta(out, 'name', 'twitter:description', page.description);
  out = setMeta(out, 'name', 'twitter:url', page.url);
  if (page.noindex) out = setMeta(out, 'name', 'robots', 'noindex');

  out = out.replace(/\s*<link rel="canonical"[^>]*>/g, '');
  const extras = [`<link rel="canonical" href="${escapeHtml(page.url)}" />`];
  for (const data of page.jsonLd || []) {
    extras.push(`<script type="application/ld+json">${safeJson(data)}</script>`);
  }
  out = out.replace('</head>', `    ${extras.join('\n    ')}\n  </head>`);

  if (page.pageId) out = out.replace(/<html([^>]*)>/, `<html$1 data-page="${escapeHtml(page.pageId)}">`);

  if (page.bodyHtml) {
    // The real page is in the HTML, so no summary is needed for crawlers.
    const state = page.state
      ? `\n    <script type="application/json" id="__PBD_STATE__">${safeJson(page.state)}</script>`
      : '';
    out = out.replace(/<div id="root"><\/div>/, () => `<div id="root">${page.bodyHtml}</div>${state}`);
    return out.replace(/<noscript>[\s\S]*?<\/noscript>/, '<noscript>Ordering and previews need JavaScript enabled.</noscript>');
  }

  // Readable summary + links for crawlers that don't run JavaScript.
  const links = (page.links || [])
    .map((l) => `<a href="${escapeHtml(l.href)}">${escapeHtml(l.label)}</a>`)
    .join(' · ');
  const noscript = `<noscript><h1>${escapeHtml(page.heading || page.title)}</h1><p>${escapeHtml(page.description)}</p>${links ? `<p>${links}</p>` : ''}<p>This site needs JavaScript enabled to run.</p></noscript>`;
  out = out.replace(/<noscript>[\s\S]*?<\/noscript>/, noscript);
  return out;
};
