import { normaliseSiteUrl } from '../shared/site-url.mjs';
import { SITEMAP_PAGES } from '../shared/sitemap-pages.mjs';

const BASE_URL = normaliseSiteUrl(process.env.VITE_SITE_URL);
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

type Product = { id: string; updated_at?: string | null; created_at?: string | null };

const xmlEscape = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const supabaseGet = async <T>(query: string): Promise<T | null> => {
  if (!SUPABASE_URL || !ANON_KEY) return null;
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
};

type OrderSettings = {
  is_service_closed: boolean;
  is_holiday_mode_active: boolean;
  holiday_mode_return_date: string | null;
};

// List the order form only when we know orders are open: not closed, and not on a
// holiday whose return date is still ahead (same rule as useAppSettings).
const areOrdersOpen = (settings?: OrderSettings): boolean => {
  if (!settings || settings.is_service_closed) return false;
  if (!settings.is_holiday_mode_active) return true;
  const back = settings.holiday_mode_return_date;
  return !!back && back <= new Date().toISOString().slice(0, 10);
};

const day = (value?: string | null): string | null => (value || '').slice(0, 10) || null;

export default async function handler(
  _req: { method: string },
  res: {
    setHeader: (name: string, value: string) => void;
    status: (code: number) => { send: (body: string) => void };
  }
) {
  const [productRows, settingsRows] = await Promise.all([
    supabaseGet<Product[]>('products?select=id,updated_at,created_at&is_active=eq.true'),
    supabaseGet<OrderSettings[]>(
      'app_settings?select=is_service_closed,is_holiday_mode_active,holiday_mode_return_date&limit=1',
    ),
  ]);
  const products = productRows || [];
  const ordersOpen = areOrdersOpen(settingsRows?.[0]);

  const productDates = products.map((p) => day(p.updated_at || p.created_at)).filter(Boolean) as string[];
  const newestProduct = productDates.sort().at(-1) || null;

  const urls = [
    ...SITEMAP_PAGES.filter((p) => !p.requiresOrdersOpen || ordersOpen).map((p) => ({
      loc: p.path === '/' ? `${BASE_URL}/` : `${BASE_URL}${p.path}`,
      // The shop listing changes whenever a product does.
      lastmod: p.path === '/shop' && newestProduct && newestProduct > p.lastmod ? newestProduct : p.lastmod,
      changefreq: p.changefreq,
      priority: p.priority,
    })),
    ...products.map((p) => ({
      loc: `${BASE_URL}/shop/${p.id}`,
      lastmod: day(p.updated_at || p.created_at),
      changefreq: 'monthly',
      priority: '0.8',
    })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${xmlEscape(u.loc)}</loc>${u.lastmod ? `
    <lastmod>${u.lastmod}</lastmod>` : ''}
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
