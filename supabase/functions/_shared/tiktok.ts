// @ts-nocheck
// TikTok Content Posting API (Direct Post) helpers.
//
// NOTE: written against the documented endpoints but UNTESTED until the TikTok
// app credentials are in place. Two constraints the owner must clear first:
//   * Unaided apps can only direct-post to a *Private* account, so
//     privacy_level is forced to SELF_ONLY until the Content Posting audit
//     passes.
//   * We upload the bytes (FILE_UPLOAD) rather than PULL_FROM_URL, because the
//     pull path requires the media host domain to be verified with TikTok —
//     which we can't do for the supabase.co storage domain.
const API = 'https://open.tiktokapis.com/v2';
const MIN_CHUNK = 5 * 1024 * 1024;
const MAX_CHUNK = 64 * 1024 * 1024;

export interface TikTokPostResult {
  publishId: string;
  status: string;
}

export async function refreshTikTokToken(
  clientKey: string,
  clientSecret: string,
  refreshToken: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number; scope?: string }> {
  const res = await fetch(`${API}/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || `TikTok refresh failed (${res.status})`);
  }
  return data;
}

export interface TikTokCreatorInfo {
  creator_username?: string;
  privacy_level_options?: string[];
  max_video_post_duration_sec?: number;
  comment_disabled?: boolean;
  duet_disabled?: boolean;
  stitch_disabled?: boolean;
}

// Direct Post requires querying the creator's current settings first (their
// required UX): it returns the allowed privacy levels and the max video length.
// TikTok rejects an init that skips this with "Please review our integration
// guidelines", so it is not optional.
export async function queryTikTokCreatorInfo(accessToken: string): Promise<TikTokCreatorInfo> {
  const res = await fetch(`${API}/post/publish/creator_info/query/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
  });
  const data = await res.json();
  const code = data?.error?.code;
  if (!res.ok || (code && code !== 'ok')) {
    throw new Error(data?.error?.message || `TikTok creator info failed (${res.status})`);
  }
  return (data?.data ?? {}) as TikTokCreatorInfo;
}

// Initialise a direct post, upload the single/first chunk, then wait for TikTok
// to finish processing. Returns the publish id and final status.
export async function publishTikTokVideo(
  accessToken: string,
  bytes: Uint8Array,
  meta: { caption?: string; privacyLevel?: string; mimeType?: string }
): Promise<TikTokPostResult> {
  // Required first step: read the creator's allowed privacy levels.
  const creator = await queryTikTokCreatorInfo(accessToken);
  const allowed = creator.privacy_level_options ?? [];
  console.log(
    `[tiktok] creator=${creator.creator_username ?? '?'} privacyOptions=${JSON.stringify(allowed)} maxDuration=${creator.max_video_post_duration_sec ?? '?'}`
  );
  const requested = meta.privacyLevel ?? 'SELF_ONLY';
  const privacyLevel = allowed.includes(requested)
    ? requested
    : allowed.includes('SELF_ONLY')
      ? 'SELF_ONLY'
      : allowed[0] ?? 'SELF_ONLY';

  const size = bytes.byteLength;
  // TikTok chunk rules: total_chunk_count = floor(video_size / chunk_size);
  // chunks are 5–64MB except the final one (up to 128MB); videos under 5MB go as
  // a single chunk whose chunk_size equals the whole file.
  const chunkSize = size < MIN_CHUNK ? size : Math.min(MAX_CHUNK, size);
  const totalChunkCount = Math.max(1, Math.floor(size / chunkSize));
  console.log(
    `[tiktok] upload size=${size} chunkSize=${chunkSize} chunks=${totalChunkCount}`
  );

  const initRes = await fetch(`${API}/post/publish/video/init/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      post_info: {
        title: meta.caption ?? '',
        // Unaudited apps are restricted to private regardless of this value.
        privacy_level: privacyLevel,
        disable_duet: false,
        disable_stitch: false,
        disable_comment: false,
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: size,
        chunk_size: chunkSize,
        total_chunk_count: totalChunkCount,
      },
    }),
  });
  const initData = await initRes.json();
  const publishId = initData?.data?.publish_id;
  const uploadUrl = initData?.data?.upload_url;
  if (!initRes.ok || !publishId || !uploadUrl) {
    const code = initData?.error?.code;
    const detail = initData?.error?.message;
    throw new Error(
      `TikTok init failed (${initRes.status})${code ? ` [${code}]` : ''}: ${detail || 'no detail'}`
    );
  }

  const contentType = meta.mimeType || 'video/webm';
  for (let i = 0; i < totalChunkCount; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, size);
    const chunk = bytes.slice(start, end);
    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(chunk.byteLength),
        'Content-Range': `bytes ${start}-${end - 1}/${size}`,
      },
      body: chunk,
    });
    if (!putRes.ok) {
      throw new Error(`TikTok chunk upload failed (${putRes.status}): ${(await putRes.text()).slice(0, 200)}`);
    }
  }

  const status = await waitForTikTokPublish(accessToken, publishId);
  return { publishId, status };
}

async function fetchTikTokStatus(accessToken: string, publishId: string): Promise<string> {
  const res = await fetch(`${API}/post/publish/status/fetch/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({ publish_id: publishId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `TikTok status failed (${res.status})`);
  return data?.data?.status ?? 'UNKNOWN';
}

async function waitForTikTokPublish(
  accessToken: string,
  publishId: string,
  attempts = 20
): Promise<string> {
  for (let i = 0; i < attempts; i++) {
    const status = await fetchTikTokStatus(accessToken, publishId);
    if (status === 'PUBLISH_COMPLETE' || status === 'FAILED' || status === 'SEND_TO_USER_INBOX') {
      return status;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  return 'PROCESSING';
}
