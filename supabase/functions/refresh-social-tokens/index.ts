// @ts-nocheck
// Keeps the stored social tokens alive. TikTok refresh tokens rotate and
// Instagram long-lived tokens (~60 days) must be refreshed while still valid, so
// a weekly cron (0042_social_token_refresh_cron.sql) calls this. Safe to run any
// time; platforms with no stored token are simply skipped.
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
    // `scheduled: true` from the weekly cron (anon key) is allowed, matching the
    // audit function — this function only refreshes tokens, it never posts.
    const fromCron = body?.scheduled === true;
    let authorized = fromCron || callerToken === supabaseServiceKey;
    if (!authorized && callerToken) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(callerToken);
      authorized = !!user && ADMIN_EMAILS.includes(user.email || '');
    }
    if (!authorized) return json({ error: 'Forbidden' }, 403);

    const results = [];

    const tiktok = await getSocialToken(supabaseAdmin, 'tiktok');
    if (tiktok?.refresh_token) {
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
        results.push({ platform: 'tiktok', ok: true });
      } catch (err) {
        results.push({ platform: 'tiktok', ok: false, error: err?.message || String(err) });
      }
    }

    const instagram = await getSocialToken(supabaseAdmin, 'instagram');
    if (instagram?.access_token) {
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
        results.push({ platform: 'instagram', ok: true });
      } catch (err) {
        results.push({ platform: 'instagram', ok: false, error: err?.message || String(err) });
      }
    }

    return json({ refreshed: results.filter((r) => r.ok).length, results });
  } catch (error) {
    return json({ error: error?.message || 'Unknown error' }, 500);
  }
});
