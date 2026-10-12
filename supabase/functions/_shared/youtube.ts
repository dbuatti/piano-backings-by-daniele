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

  let { data: ytToken } = await supabaseAdmin
    .from('youtube_tokens')
    .select('refresh_token')
    .eq('user_id', user.id)
    .maybeSingle();

  // The connect flow stores the channel token under whichever admin clicked
  // "Connect YouTube Channel", but there is only one channel — any stored
  // youtube_tokens row is the channel token. Fall back to the most recent row
  // so the queue can mint regardless of which admin connected it.
  if (!ytToken?.refresh_token) {
    const { data: anyToken } = await supabaseAdmin
      .from('youtube_tokens')
      .select('refresh_token')
      .not('refresh_token', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    ytToken = anyToken;
  }

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
    // Distinguish "the channel was never connected" (we fell back to the Gmail
    // token, which only has gmail.send) from "a channel token exists but was
    // granted without the upload scope" (reconnect after adding the scope).
    throw new Error(
      source === 'gmail_tokens'
        ? 'No YouTube channel token is stored yet — connect the channel in Admin → Settings → Integrations.'
        : 'The stored channel token lacks YouTube upload access — reconnect the channel in Admin → Settings → Integrations.'
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
    publishAt?: string; // ISO-8601; forces privacy 'private' until this time
    categoryId?: string;
    mimeType?: string;
  }
): Promise<string> {
  const mimeType = meta.mimeType || 'video/webm';

  // Scheduled publishing: YouTube requires the video to start as `private` and
  // promote it to public when publishAt arrives. Past/empty times upload as-is.
  const scheduled = meta.publishAt
    ? new Date(meta.publishAt).getTime() > Date.now()
    : false;

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
          privacyStatus: scheduled ? 'private' : meta.privacy ?? 'unlisted',
          ...(scheduled ? { publishAt: new Date(meta.publishAt!).toISOString() } : {}),
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
