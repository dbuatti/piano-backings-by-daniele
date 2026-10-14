// @ts-nocheck
// "Test Instagram" for Settings → Integrations. Reads the stored long-lived
// token (refreshing it if it has expired), asks Instagram who it belongs to, and
// reports what the account is and whether it can actually publish.
//
// This exists so the connection can be proven *before* a teaser is on the line.
// Instagram only publishes from a professional account, so a connected-but-personal
// account is reported as a warning rather than a pass. READ ONLY — it never posts
// and never mutates the account.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { requireSupabaseEnv } from '../_shared/env.ts';
import { getSocialToken, getFreshSocialAccessToken } from '../_shared/social.ts';
import { GRAPH_VERSION } from '../_shared/instagram.ts';

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

// Instagram only lets a *professional* account publish through the API. PERSONAL
// can log in and read, but `media` creation is refused.
const PUBLISHING_ACCOUNT_TYPES = ['BUSINESS', 'CREATOR', 'MEDIA_CREATOR'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { url: supabaseUrl, serviceKey: supabaseServiceKey } = requireSupabaseEnv('instagram-account');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const callerToken = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!callerToken) return json({ error: 'Forbidden' }, 403);
    if (callerToken !== supabaseServiceKey) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(callerToken);
      if (!user || !ADMIN_EMAILS.includes(user.email || '')) return json({ error: 'Forbidden' }, 403);
    }

    const row = await getSocialToken(supabaseAdmin, 'instagram');
    if (!row?.access_token) {
      return json({ error: 'No Instagram account connected. Use Connect Instagram in Settings → Integrations.' }, 400);
    }

    // Refreshes and persists the token when it is stale, so a successful test
    // also repairs an expired one.
    const accessToken = await getFreshSocialAccessToken(supabaseAdmin, 'instagram');

    const url =
      `https://graph.instagram.com/${GRAPH_VERSION}/me?` +
      new URLSearchParams({
        fields: 'user_id,username,account_type,media_count',
        access_token: accessToken,
      });
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok || data?.error) {
      const message =
        data?.error?.message ||
        `Instagram rejected the token (${res.status}). Reconnect the account in Settings → Integrations.`;
      return json({ error: message, code: data?.error?.code ?? null }, 400);
    }

    const accountType = String(data.account_type || '').toUpperCase() || null;
    const canPublish = accountType ? PUBLISHING_ACCOUNT_TYPES.includes(accountType) : false;

    return json({
      ok: true,
      username: data.username ?? row.display_name ?? null,
      userId: String(data.user_id ?? row.external_id ?? '') || null,
      accountType,
      mediaCount: typeof data.media_count === 'number' ? data.media_count : null,
      canPublish,
      warning: canPublish
        ? null
        : 'This account is not a professional account, so Instagram will refuse to publish. Switch it to a Business or Creator account in the Instagram app (Settings → Account type).',
      graphVersion: GRAPH_VERSION,
      expiresAt: row.expires_at ?? null,
    });
  } catch (error) {
    return json({ error: error?.message || 'Unknown error' }, 500);
  }
});
