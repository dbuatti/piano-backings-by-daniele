// Owner-facing health check for the serverless runtime. Exists because a missing
// env var here fails silently: Vite inlines VITE_* into the browser bundle from
// the committed .env, so the site looks fine while /api functions get an empty
// process.env and the shop 503s. This endpoint makes that configuration visible.
// No secrets are returned — only booleans and a live product count.
import { normaliseSiteUrl } from '../shared/site-url.mjs';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

type Res = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { send: (body: string) => void };
};

export default async function handler(_req: { method: string }, res: Res) {
  const checks = {
    site_url: Boolean(process.env.VITE_SITE_URL),
    supabase_url: Boolean(process.env.VITE_SUPABASE_URL),
    supabase_anon_key: !!process.env.VITE_SUPABASE_ANON_KEY,
  };

  let dbReachable = false;
  let activeProducts = -1;
  if (checks.supabase_url && checks.supabase_anon_key) {
    try {
      const response = await fetch(
        `${process.env.VITE_SUPABASE_URL}/rest/v1/products?select=id&is_active=eq.true`,
        {
          headers: {
            apikey: process.env.VITE_SUPABASE_ANON_KEY as string,
            Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
            Range: '0-0',
            Prefer: 'count=exact',
          },
        }
      );
      dbReachable = response.ok;
      const range = response.headers.get('content-range') || '';
      if (response.ok && range.includes('/')) activeProducts = Number(range.split('/')[1]);
    } catch (error) {
      console.error('[health] Supabase reachability check failed:', error);
    }
  }

  const ok = checks.site_url && checks.supabase_url && checks.supabase_anon_key && dbReachable;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(ok ? 200 : 503).send(
    JSON.stringify(
      {
        ok,
        checks,
        db: { reachable: dbReachable, active_products: activeProducts },
        base_url: normaliseSiteUrl(process.env.VITE_SITE_URL),
        time: new Date().toISOString(),
      },
      null,
      2
    )
  );
}
