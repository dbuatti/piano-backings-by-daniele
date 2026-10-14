// @ts-nocheck
// Shared helpers for the social (TikTok / Instagram) posting pipeline. Tokens
// live in `social_tokens`, one row per platform, written by social-oauth-callback
// and read by whatever posts the teasers. Every function here is service-role
// only — the table has RLS on with no policies.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { refreshTikTokToken } from './tiktok.ts';
import { refreshInstagramToken } from './instagram.ts';

type Admin = ReturnType<typeof createClient>;

export type SocialPlatform = 'tiktok' | 'instagram';

export interface SocialTokenRow {
  platform: SocialPlatform;
  user_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  external_id: string | null;
  display_name: string | null;
  scope: string | null;
}

export async function saveSocialToken(
  supabaseAdmin: Admin,
  row: {
    platform: SocialPlatform;
    userId?: string | null;
    accessToken?: string | null;
    refreshToken?: string | null;
    expiresIn?: number | null;
    externalId?: string | null;
    displayName?: string | null;
    scope?: string | null;
  }
) {
  const { error } = await supabaseAdmin.from('social_tokens').upsert(
    {
      platform: row.platform,
      user_id: row.userId ?? null,
      access_token: row.accessToken ?? null,
      refresh_token: row.refreshToken ?? null,
      expires_at:
        row.expiresIn != null && row.expiresIn > 0
          ? new Date(Date.now() + row.expiresIn * 1000).toISOString()
          : null,
      external_id: row.externalId ?? null,
      display_name: row.displayName ?? null,
      scope: row.scope ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'platform' }
  );
  if (error) throw error;
}

export async function getSocialToken(
  supabaseAdmin: Admin,
  platform: SocialPlatform
): Promise<SocialTokenRow | null> {
  const { data } = await supabaseAdmin
    .from('social_tokens')
    .select('*')
    .eq('platform', platform)
    .maybeSingle();
  return (data as SocialTokenRow) ?? null;
}

// Returns a usable access token for the platform, refreshing and persisting it
// when the stored one has expired. Shared by every function that posts.
export async function getFreshSocialAccessToken(
  supabaseAdmin: Admin,
  platform: SocialPlatform
): Promise<string> {
  const row = await getSocialToken(supabaseAdmin, platform);
  if (!row?.access_token) {
    throw new Error(`No ${platform} account connected (Settings → Integrations).`);
  }

  const stillValid = row.expires_at ? new Date(row.expires_at).getTime() > Date.now() + 60_000 : true;
  if (stillValid) return row.access_token;

  if (platform === 'tiktok' && row.refresh_token) {
    const data = await refreshTikTokToken(
      Deno.env.get('TIKTOK_CLIENT_KEY'),
      Deno.env.get('TIKTOK_CLIENT_SECRET'),
      row.refresh_token
    );
    await saveSocialToken(supabaseAdmin, {
      platform,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      externalId: row.external_id,
      displayName: row.display_name,
      scope: data.scope,
    });
    return data.access_token;
  }
  if (platform === 'instagram') {
    const data = await refreshInstagramToken(row.access_token);
    await saveSocialToken(supabaseAdmin, {
      platform,
      accessToken: data.access_token,
      externalId: row.external_id,
      displayName: row.display_name,
      expiresIn: data.expires_in,
      scope: row.scope,
    });
    return data.access_token;
  }
  return row.access_token;
}
