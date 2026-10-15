// @ts-nocheck
// Keeps the stored social tokens alive. TikTok refresh tokens rotate and
// Instagram long-lived tokens (~60 days) must be refreshed *before* they expire
// — an expired Instagram token can no longer be refreshed at all. A 6-hourly
// cron (0046_social_token_refresh_cron_frequent.sql) calls this, but a scheduled
// run only refreshes a token that is close to expiring, so running often does
// not mean refreshing often. Safe to run any time; platforms with no stored
// token are simply skipped.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { requireSupabaseEnv } from '../_shared/env.ts';
import { getSocialToken, saveSocialToken } from '../_shared/social.ts';
import { refreshTikTokToken } from '../_shared/tiktok.ts';
import { refreshInstagramToken } from '../_shared/instagram.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const ADMIN_EMAILS = ['daniele.buatti@gmail.com', 'pianobackingsbydaniele@gmail.com'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { url: supabaseUrl, serviceKey: supabaseServiceKey } = requireSupabaseEnv('refresh-social-tokens');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const callerToken = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const body = await req.json().catch(() => ({}));
    // `scheduled: true` from the refresh cron (anon key) is allowed, matching the
    // audit function — this function only refreshes tokens, it never posts.
    const fromCron = body?.scheduled === true;
    let authorized = fromCron || callerToken === supabaseServiceKey;
    if (!authorized && callerToken) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(callerToken);
      authorized = !!user && ADMIN_EMAILS.includes(user.email || '');
    }
    if (!authorized) return json({ error: 'Forbidden' }, 403);

    const results = [];

    // A scheduled run refreshes a token only when it is close to expiring.
    // TikTok's refresh token rotates on every call, and Instagram refuses to
    // refresh a long-lived token younger than 24 hours, so running the cron
    // every 6 hours must not mean refreshing every 6 hours. A manual (non-cron)
    // call forces, so a service-role test can still refresh on demand.
    //
    // Each window must be comfortably wider than the cron period, otherwise a
    // token could cross into its window between runs and expire before the next
    // one — and an expired Instagram token can no longer be refreshed. Instagram
    // uses 8 days so it is also safe under the older weekly cron.
    const force = !fromCron;
    const dueSoon = (expiresAt: string | null, hours: number) => {
      if (!expiresAt) return true; // unknown expiry: refresh rather than risk a lapse
      return new Date(expiresAt).getTime() - Date.now() <= hours * 3_600_000;
    };
    const TIKTOK_WINDOW_HOURS = 12; // 24h access token, rotated every day or so
    const INSTAGRAM_WINDOW_HOURS = 8 * 24; // 60-day token, refreshed ~8 days out

    const tiktok = await getSocialToken(supabaseAdmin, 'tiktok');
    if (tiktok?.refresh_token) {
      if (!force && !dueSoon(tiktok.expires_at, TIKTOK_WINDOW_HOURS)) {
        results.push({ platform: 'tiktok', refreshed: false, skipped: 'not due' });
      } else {
        try {
          const data = await refreshTikTokToken(
            Deno.env.get('TIKTOK_CLIENT_KEY'),
            Deno.env.get('TIKTOK_CLIENT_SECRET'),
            tiktok.refresh_token
          );
          await saveSocialToken(supabaseAdmin, {
            platform: 'tiktok',
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresIn: data.expires_in,
            externalId: tiktok.external_id,
            displayName: tiktok.display_name,
            scope: data.scope,
          });
          results.push({ platform: 'tiktok', refreshed: true });
        } catch (err) {
          results.push({ platform: 'tiktok', refreshed: false, error: err?.message || String(err) });
        }
      }
    }

    const instagram = await getSocialToken(supabaseAdmin, 'instagram');
    if (instagram?.access_token) {
      if (!force && !dueSoon(instagram.expires_at, INSTAGRAM_WINDOW_HOURS)) {
        results.push({ platform: 'instagram', refreshed: false, skipped: 'not due' });
      } else {
        try {
          const data = await refreshInstagramToken(instagram.access_token);
          await saveSocialToken(supabaseAdmin, {
            platform: 'instagram',
            accessToken: data.access_token,
            externalId: instagram.external_id,
            displayName: instagram.display_name,
            expiresIn: data.expires_in,
            scope: instagram.scope,
          });
          results.push({ platform: 'instagram', refreshed: true });
        } catch (err) {
          results.push({ platform: 'instagram', refreshed: false, error: err?.message || String(err) });
        }
      }
    }

    return json({ refreshed: results.filter((r) => r.refreshed).length, results });
  } catch (error) {
    return json({ error: error?.message || 'Unknown error' }, 500);
  }
});
