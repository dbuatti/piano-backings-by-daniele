// @ts-nocheck
// Shared helpers for the social (TikTok / Instagram) posting pipeline. Tokens
// live in `social_tokens`, one row per platform, written by social-oauth-callback
// and read by whatever posts the teasers. Every function here is service-role
// only — the table has RLS on with no policies.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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
