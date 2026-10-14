// @ts-nocheck
// Reports which social accounts are connected, for the Settings status card.
// Admin-only; the social_tokens table itself stays service-role only.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { requireSupabaseEnv } from '../_shared/env.ts';
import { getSocialToken } from '../_shared/social.ts';

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

// Which Edge Function secrets each platform's OAuth exchange needs. Only whether
// each is set is reported — never the value. The browser cannot see these, so
// this is the only way the in-app setup guide can tick them off.
const REQUIRED_SECRETS: Record<string, Record<string, string>> = {
  tiktok: { clientKey: 'TIKTOK_CLIENT_KEY', clientSecret: 'TIKTOK_CLIENT_SECRET' },
  instagram: { clientId: 'INSTAGRAM_CLIENT_ID', clientSecret: 'INSTAGRAM_CLIENT_SECRET' },
};

function configuredFor(platform: string) {
  const wanted = REQUIRED_SECRETS[platform] ?? {};
  const out: Record<string, boolean> = {};
  for (const [label, name] of Object.entries(wanted)) out[label] = !!Deno.env.get(name);
  return out;
}

function summarize(row, platform: string) {
  return {
    connected: !!row?.access_token,
    account: row?.display_name ?? null,
    externalId: row?.external_id ?? null,
    expiresAt: row?.expires_at ?? null,
    scope: row?.scope ?? null,
    // False here means the Connect button cannot possibly succeed yet.
    configured: configuredFor(platform),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { url: supabaseUrl, serviceKey: supabaseServiceKey } = requireSupabaseEnv('social-status');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const callerToken = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!callerToken) return json({ error: 'Forbidden' }, 403);
    if (callerToken !== supabaseServiceKey) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(callerToken);
      if (!user || !ADMIN_EMAILS.includes(user.email || '')) return json({ error: 'Forbidden' }, 403);
    }

    const [tiktok, instagram] = await Promise.all([
      getSocialToken(supabaseAdmin, 'tiktok'),
      getSocialToken(supabaseAdmin, 'instagram'),
    ]);

    return json({
      tiktok: summarize(tiktok, 'tiktok'),
      instagram: summarize(instagram, 'instagram'),
    });
  } catch (error) {
    return json({ error: error?.message || 'Unknown error' }, 500);
  }
});
