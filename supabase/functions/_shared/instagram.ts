// @ts-nocheck
// Instagram Content Publishing helpers (Instagram Business Login / graph.instagram.com).
//
// NOTE: written against the documented two-step container flow but UNTESTED until
// the Meta app credentials are in place. Two constraints: the account must be a
// *professional* (Business/Creator) account, and Instagram only accepts H.264
// MP4/MOV — `publishInstagramReel` refuses a non-mp4 source rather than letting
// the container fail opaquely.
//
// See docs/social-automation-research.md. No Facebook Page or App Review is
// needed when posting only to the owner's own account.
const GRAPH = 'https://graph.instagram.com';
// One place to bump when Meta retires a version — an expired version 400s before
// any of the flow below runs. Bump deliberately, not on a whim.
export const GRAPH_VERSION = 'v25.0';

export interface InstagramPostResult {
  containerId: string;
  mediaId: string | null;
  status: string;
}

// Long-lived tokens (~60 days) can be refreshed once they're at least 24h old.
export async function refreshInstagramToken(
  accessToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(
    `${GRAPH}/refresh_access_token?` +
      new URLSearchParams({ grant_type: 'ig_refresh_token', access_token: accessToken })
  );
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data?.error?.message || `Instagram refresh failed (${res.status})`);
  }
  return data;
}

export async function publishInstagramReel(
  accessToken: string,
  igUserId: string,
  meta: { videoUrl: string; caption?: string; mimeType?: string }
): Promise<InstagramPostResult> {
  if (meta.mimeType && !/mp4|quicktime|mov/i.test(meta.mimeType)) {
    throw new Error(
      `Instagram only accepts MP4/MOV, but this teaser is ${meta.mimeType}. Transcode to MP4 before posting.`
    );
  }

  // 1) Create the media container. Instagram downloads the video asynchronously.
  const createRes = await fetch(`${GRAPH}/${GRAPH_VERSION}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      media_type: 'REELS',
      video_url: meta.videoUrl,
      caption: meta.caption ?? '',
      access_token: accessToken,
    }),
  });
  const createData = await createRes.json();
  const containerId = createData?.id;
  if (!createRes.ok || !containerId) {
    throw new Error(createData?.error?.message || `Instagram container failed (${createRes.status})`);
  }

  // 2) Wait for the container to finish processing.
  const status = await waitForInstagramContainer(accessToken, containerId);
  if (status !== 'FINISHED') {
    return { containerId, mediaId: null, status };
  }

  // 3) Publish the finished container.
  const publishRes = await fetch(`${GRAPH}/${GRAPH_VERSION}/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ creation_id: containerId, access_token: accessToken }),
  });
  const publishData = await publishRes.json();
  if (!publishRes.ok || !publishData?.id) {
    throw new Error(publishData?.error?.message || `Instagram publish failed (${publishRes.status})`);
  }
  return { containerId, mediaId: publishData.id, status: 'PUBLISHED' };
}

async function waitForInstagramContainer(
  accessToken: string,
  containerId: string,
  attempts = 20
): Promise<string> {
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(
      `${GRAPH}/${GRAPH_VERSION}/${containerId}?` +
        new URLSearchParams({ fields: 'status_code', access_token: accessToken })
    );
    const data = await res.json();
    const status = data?.status_code ?? 'UNKNOWN';
    if (status === 'FINISHED' || status === 'ERROR' || status === 'EXPIRED') return status;
    await new Promise((r) => setTimeout(r, 5000));
  }
  return 'IN_PROGRESS';
}
