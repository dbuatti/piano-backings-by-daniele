// @ts-nocheck
// Exchanges an OAuth authorization code for a social platform token and stores
// it in `social_tokens`. Called by the frontend /social-oauth-callback page,
// mirroring gmail-oauth-callback (admin bearer required, service role writes).
//
// Secrets (set only the platform you're connecting — this function only reads
// the pair for the requested platform):
//   TikTok:    TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET
//   Instagram: INSTAGRAM_CLIENT_ID, INSTAGRAM_CLIENT_SECRET
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { requireSupabaseEnv } from '../_shared/env.ts';
import { saveSocialToken, type SocialPlatform } from '../_shared/social.ts';

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

async function connectTikTok({ code, redirectUri, codeVerifier, userId, supabaseAdmin }) {
  const clientKey = Deno.env.get('TIKTOK_CLIENT_KEY');
  const clientSecret = Deno.env.get('TIKTOK_CLIENT_SECRET');
  if (!clientKey || !clientSecret) {
    throw new Error('TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET must be set.');
  }

  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || `TikTok token exchange failed (${res.status})`);
  }

  // Best-effort display name; not worth failing the connection over.
  let displayName = null;
  try {
    const infoRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=display_name', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    if (infoRes.ok) {
      const info = await infoRes.json();
      displayName = info?.data?.user?.display_name ?? null;
    }
  } catch (_) {
    // ignore
  }

  await saveSocialToken(supabaseAdmin, {
    platform: 'tiktok',
    userId,
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresIn: data.expires_in ?? null,
    externalId: data.open_id ?? null,
    displayName,
    scope: data.scope ?? null,
  });

  return { message: 'TikTok connected', account: displayName };
}

async function connectInstagram({ code, redirectUri, userId, supabaseAdmin }) {
  const clientId = Deno.env.get('INSTAGRAM_CLIENT_ID');
  const clientSecret = Deno.env.get('INSTAGRAM_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    throw new Error('INSTAGRAM_CLIENT_ID and INSTAGRAM_CLIENT_SECRET must be set.');
  }

  // 1) code -> short-lived token (Instagram Business Login).
  const shortRes = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    }),
  });
  const shortData = await shortRes.json();
  if (!shortRes.ok || !shortData.access_token) {
    throw new Error(shortData.error_message || shortData.error?.message || `Instagram token exchange failed (${shortRes.status})`);
  }

  // 2) short-lived -> long-lived (~60 days).
  const longRes = await fetch(
    'https://graph.instagram.com/access_token?' +
      new URLSearchParams({
        grant_type: 'ig_exchange_token',
        client_secret: clientSecret,
        access_token: shortData.access_token,
      })
  );
  const longData = await longRes.json();
  const accessToken = longData.access_token || shortData.access_token;
  const expiresIn = longData.expires_in ?? null;

  // 3) Resolve the username for display; the numeric user id is what publishing
  //    uses as {ig-user-id}.
  let displayName = null;
  try {
    const meRes = await fetch(
      'https://graph.instagram.com/v21.0/me?' +
        new URLSearchParams({ fields: 'user_id,username', access_token: accessToken })
    );
    if (meRes.ok) {
      const me = await meRes.json();
      displayName = me?.username ?? null;
    }
  } catch (_) {
    // ignore
  }

  await saveSocialToken(supabaseAdmin, {
    platform: 'instagram',
    userId,
    accessToken,
    refreshToken: null,
    expiresIn,
    externalId: String(shortData.user_id ?? '') || null,
    displayName,
    scope: Array.isArray(shortData.permissions) ? shortData.permissions.join(',') : null,
  });

  return { message: 'Instagram connected', account: displayName };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url: supabaseUrl, serviceKey: supabaseServiceKey } = requireSupabaseEnv('social-oauth-callback');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Admin bearer only, same gate as gmail-oauth-callback.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) throw new Error('Invalid or expired token');
    if (!ADMIN_EMAILS.includes(user.email)) throw new Error('Unauthorized');

    const { platform, code, redirectUri, codeVerifier } = await req.json();
    if (platform !== 'tiktok' && platform !== 'instagram') {
      return json({ error: "platform must be 'tiktok' or 'instagram'" }, 400);
    }
    if (!code || !redirectUri) {
      return json({ error: 'Missing code or redirectUri' }, 400);
    }

    const args = { code, redirectUri, codeVerifier, userId: user.id, supabaseAdmin };
    const result =
      platform === 'tiktok' ? await connectTikTok(args) : await connectInstagram(args);

    return json(result, 200);
  } catch (error) {
    return json({ error: error?.message || 'Unknown error' }, 500);
  }
});
