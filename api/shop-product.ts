// Serves /shop/:id with that product's title, description, canonical URL and
// Product/Offer structured data already in the HTML (vercel.json rewrites the path
// here). The React shop then loads on top exactly as before.
import { productSeo, type ProductSeoInput } from '../shared/product-seo.mjs';
import { applyPageMeta } from '../shared/html-meta.mjs';
import { normaliseSiteUrl } from '../shared/site-url.mjs';

const BASE_URL = normaliseSiteUrl(process.env.VITE_SITE_URL);
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const PRODUCT_FIELDS = [
  'id', 'title', 'artist_name', 'description', 'price', 'currency', 'key_signature',
  'show_key_signature', 'category', 'vocal_ranges', 'cut_description', 'image_url', 'is_active',
].join(',');

const NAV = [
  { href: '/shop', label: 'Backing track library' },
  { href: '/form-page', label: 'Order a custom track' },
  { href: '/pricing', label: 'Pricing' },
];

type Req = { query: Record<string, string | string[] | undefined>; headers: Record<string, string | string[] | undefined> };
type Res = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { send: (body: string) => void };
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || '';

export default async function handler(req: Req, res: Res) {
  const id = first(req.query.id);
  const host = first(req.headers['x-forwarded-host']) || first(req.headers.host);
  const origin = host ? `https://${host}` : BASE_URL;

  // The plain SPA entry, so the only structured data is this product's.
  let shell = '';
  for (const path of ['/index.html']) {
    try {
      const response = await fetch(`${origin}${path}`);
      if (response.ok) {
        shell = await response.text();
        break;
      }
    } catch {
      // try the next one
    }
  }
  if (!shell) {
    res.status(502).send('Shop is temporarily unavailable.');
    return;
  }

  let product: (ProductSeoInput & { is_active?: boolean }) | null = null;
  if (/^[0-9a-f-]{36}$/i.test(id) && SUPABASE_URL && ANON_KEY) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/products?select=${PRODUCT_FIELDS}&id=eq.${id}&is_active=eq.true`,
        { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } },
      );
      if (response.ok) {
        const rows = await response.json();
        product = rows[0] || null;
      }
    } catch {
      // fall through and serve the plain shop page
    }
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (!product) {
    // Unknown or retired product: still render the shop, but tell crawlers.
    res.setHeader('Cache-Control', 's-maxage=300');
    res.status(404).send(applyPageMeta(shell, {
      title: 'Track not found | Piano Backings by Daniele',
      description: 'This backing track is no longer available. Browse the library for other musical theatre piano backing tracks.',
      url: `${BASE_URL}/shop`,
      noindex: true,
      links: NAV,
    }));
    return;
  }

  const seo = productSeo(product, BASE_URL);
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(applyPageMeta(shell, {
    title: seo.title,
    description: seo.description,
    url: seo.url,
    heading: seo.title.split(' | ')[0],
    jsonLd: seo.jsonLd,
    links: NAV,
  }));
}
