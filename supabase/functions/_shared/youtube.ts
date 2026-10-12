// Shared helpers for minting a YouTube channel access token and uploading a
// video, used by get-youtube-token (silent client publish) and run-publish-queue
// (scheduled server publish).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

type Admin = ReturnType<typeof createClient>;

export const DEFAULT_CHANNEL_EMAIL = 'pianobackingsbydaniele@gmail.com';

export async function findChannelUser(
  supabaseAdmin: Admin,
  accountEmail: string,
  fallbackUserId?: string | null
) {
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
  const users = usersData?.users ?? [];
  return (
    users.find((u) => u.email === accountEmail) ||
    (fallbackUserId ? users.find((u) => u.id === fallbackUserId) : null) ||
    null
  );
}

export interface ChannelToken {
  access_token: string;
  expires_in: number;
  channel: string | null;
  source: 'youtube_tokens' | 'gmail_tokens';
}

// Refresh the stored channel refresh token and verify it can reach YouTube.
// Prefers the dedicated YouTube channel token; falls back to the Gmail token.
export async function mintChannelAccessToken(
  supabaseAdmin: Admin,
  opts: {
    clientId: string;
    clientSecret: string;
    accountEmail?: string;
    fallbackUserId?: string | null;
  }
): Promise<ChannelToken> {
  const accountEmail = opts.accountEmail || DEFAULT_CHANNEL_EMAIL;
  const user = await findChannelUser(supabaseAdmin, accountEmail, opts.fallbackUserId);
  if (!user) throw new Error(`No account found for ${accountEmail}.`);

  const { data: ytToken } = await supabaseAdmin
    .from('youtube_tokens')
    .select('refresh_token')
    .eq('user_id', user.id)
    .maybeSingle();

  let refreshToken: string | null = ytToken?.refresh_token ?? null;
  let source: ChannelToken['source'] = 'youtube_tokens';

  if (!refreshToken) {
    const { data: gmailToken } = await supabaseAdmin
      .from('gmail_tokens')
      .select('refresh_token')
      .eq('user_id', user.id)
      .maybeSingle();
    refreshToken = gmailToken?.refresh_token ?? null;
    source = 'gmail_tokens';
  }

  if (!refreshToken) {
    throw new Error(
      `No stored Google refresh token for ${accountEmail}. Connect the YouTube channel in Admin → Settings.`
    );
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(
      tokenJson.error_description || tokenJson.error || `Token refresh failed (${tokenRes.status})`
    );
  }

  const channelRes = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
    { headers: { Authorization: `Bearer ${tokenJson.access_token}` } }
  );
  if (!channelRes.ok) {
    throw new Error(
      'The stored Google token lacks YouTube upload access — connect the channel in Admin → Settings.'
    );
  }
  const channelJson = await channelRes.json();

  return {
    access_token: tokenJson.access_token,
    expires_in: tokenJson.expires_in ?? 3600,
    channel: channelJson?.items?.[0]?.snippet?.title ?? null,
    source,
  };
}

// Single-shot resumable upload of a video to the authorised channel.
export async function uploadVideoToYouTube(
  accessToken: string,
  bytes: Uint8Array,
  meta: {
    title: string;
    description: string;
    tags?: string[];
    privacy?: 'private' | 'unlisted' | 'public';
    categoryId?: string;
    mimeType?: string;
  }
): Promise<string> {
  const mimeType = meta.mimeType || 'video/webm';

  const initRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': String(bytes.byteLength),
      },
      body: JSON.stringify({
        snippet: {
          title: meta.title,
          description: meta.description,
          tags: meta.tags ?? [],
          categoryId: meta.categoryId ?? '10',
        },
        status: {
          privacyStatus: meta.privacy ?? 'unlisted',
          selfDeclaredMadeForKids: false,
        },
      }),
    }
  );

  if (!initRes.ok) {
    throw new Error(`YouTube upload init failed (${initRes.status}): ${(await initRes.text()).slice(0, 300)}`);
  }
  const uploadUrl = initRes.headers.get('Location');
  if (!uploadUrl) throw new Error('YouTube did not return an upload URL.');

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType, 'Content-Length': String(bytes.byteLength) },
    body: bytes,
  });
  if (!putRes.ok) {
    throw new Error(`YouTube upload failed (${putRes.status}): ${(await putRes.text()).slice(0, 300)}`);
  }

  const video = await putRes.json();
  if (!video?.id) throw new Error('YouTube upload returned no video id.');
  return video.id as string;
}
