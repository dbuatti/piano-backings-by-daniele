const BASE_URL = process.env.VITE_SITE_URL || 'https://pianobackingsbydaniele.vercel.app';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

type Product = { id: string };

const xmlEscape = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export default async function handler(
  _req: { method: string },
  res: {
    setHeader: (name: string, value: string) => void;
    status: (code: number) => { send: (body: string) => void };
  }
) {
  const today = new Date().toISOString().slice(0, 10);

  const staticPages = [
    { path: '/', changefreq: 'weekly', priority: '1.0' },
    { path: '/shop', changefreq: 'weekly', priority: '0.9' },
    { path: '/form-page', changefreq: 'monthly', priority: '0.8' },
    { path: '/pricing', changefreq: 'monthly', priority: '0.8' },
    { path: '/about', changefreq: 'monthly', priority: '0.6' },
  ];

  let products: Product[] = [];
  if (SUPABASE_URL && ANON_KEY) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/products?select=id&is_active=eq.true`,
        { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } }
      );
      if (response.ok) {
        products = await response.json();
      }
    } catch {
      // fall back to static pages only
    }
  }

  const urls = [
    ...staticPages.map((p) => ({
      loc: `${BASE_URL}${p.path}`,
      lastmod: today,
      changefreq: p.changefreq,
      priority: p.priority,
    })),
    ...products.map((p) => ({
      loc: `${BASE_URL}/shop/${p.id}`,
      lastmod: today,
      changefreq: 'monthly',
      priority: '0.8',
    })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${xmlEscape(u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  res.status(200).send(body);
}
