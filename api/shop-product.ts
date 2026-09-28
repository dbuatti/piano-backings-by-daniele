// Serves /shop/:slug, one page per song (vercel.json rewrites the path here).
// - A song that existed at build time has a prerendered page (dist/seo/shop/<slug>.html,
//   see scripts/prerender-seo.mjs), served while the song is unchanged since the build.
// - A newer or edited song gets its title, description, canonical and structured data
//   on the plain app shell, and the app renders the page.
// - Old /shop/<product id> links, and slugs from before a show was renamed, 301 to the
//   song's current page. Anything else is a 404.
import { applyPageMeta } from '../shared/html-meta.mjs';
import { normaliseSiteUrl } from '../shared/site-url.mjs';
import { buildSongCatalog, findSong, songPath, songSeo, type CatalogProduct } from '../shared/song-catalog.mjs';

const BASE_URL = normaliseSiteUrl(process.env.VITE_SITE_URL);
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const PRODUCT_FIELDS = [
  'id', 'title', 'artist_name', 'price', 'currency', 'key_signature', 'show_key_signature', 'category',
  'vocal_ranges', 'duration_seconds', 'preview_url', 'image_url', 'product_type', 'is_active', 'updated_at', 'created_at',
].join(',');

const NAV = [
  { href: '/shop', label: 'Backing track library' },
  { href: '/form-page', label: 'Order a custom track' },
  { href: '/pricing', label: 'Pricing' },
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Req = { query: Record<string, string | string[] | undefined>; headers: Record<string, string | string[] | undefined> };
type Res = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { send: (body: string) => void };
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || '';

const getText = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    return response.ok ? await response.text() : '';
  } catch {
    return '';
  }
};

const loadProducts = async (): Promise<CatalogProduct[] | null> => {
  if (!SUPABASE_URL || !ANON_KEY) return null;
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/products?select=${PRODUCT_FIELDS}&is_active=eq.true`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    });
    return response.ok ? ((await response.json()) as CatalogProduct[]) : null;
  } catch {
    return null;
  }
};

export default async function handler(req: Req, res: Res) {
  const slug = first(req.query.id);
  const host = first(req.headers['x-forwarded-host']) || first(req.headers.host);
  const origin = host ? `https://${host}` : BASE_URL;

  const redirect = (path: string) => {
    res.setHeader('Location', path);
    res.setHeader('Cache-Control', 's-maxage=3600');
    res.status(301).send('');
  };

  const products = await loadProducts();
  if (!products) {
    res.setHeader('Retry-After', '60');
    res.status(503).send('The shop is temporarily unavailable.');
    return;
  }
  const catalog = buildSongCatalog(products);

  if (UUID.test(slug)) {
    const owner = catalog.find((s) => s.variants.some((v) => v.id === slug));
    if (owner) return redirect(songPath(owner));
  }

  const match = findSong(catalog, slug);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (!match) {
    res.setHeader('Cache-Control', 's-maxage=300');
    const notFound = await getText(`${origin}/404.html`);
    res.status(404).send(notFound || 'Not found');
    return;
  }
  if (match.redirect) return redirect(`/shop/${match.redirect}`);

  const { song } = match;
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

  // Only if no version of the song has been edited since the build (the page embeds
  // the rows it was rendered from); otherwise serve fresh tags, not a stale price.
  const prerendered = await getText(`${origin}/seo/shop/${song.slug}.html`);
  const upToDate = prerendered && song.variants.every(
    (v) => v.updated_at && prerendered.includes(`"updated_at":${JSON.stringify(v.updated_at)}`),
  );
  if (upToDate) {
    res.status(200).send(prerendered);
    return;
  }

  const shell = await getText(`${origin}/index.html`);
  if (!shell) {
    res.status(502).send('The shop is temporarily unavailable.');
    return;
  }
  const seo = songSeo(song, BASE_URL);
  res.status(200).send(applyPageMeta(shell, {
    title: seo.title,
    description: seo.description,
    url: seo.url,
    heading: seo.heading,
    jsonLd: seo.jsonLd,
    links: NAV,
  }));
}
