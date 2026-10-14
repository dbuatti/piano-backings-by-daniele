// @ts-nocheck
// Instagram Content Publishing helpers (Instagram Business Login / graph.instagram.com).
//
// NOTE: written against the documented two-step container flow but UNTESTED until
// the Meta app credentials are in place. Two constraints: the account must be a
// *professional* (Business/Creator) account, and Instagram only accepts H.264
// MP4/MOV — the container create refuses a non-mp4 source rather than letting the
// container fail opaquely.
//
// The flow is deliberately split into create / wait / publish so the caller can
// persist the container id between steps. A container create can outlive a single
// Edge invocation, and without a stored id a killed invocation left the row stuck
// at `publishing` with nothing to resume from.
//
// See docs/social-automation-research.md. No Facebook Page or App Review is
// needed when posting only to the owner's own account.
const GRAPH = 'https://graph.instagram.com';
// One place to bump when Meta retires a version — an expired version 400s before
// any of the flow below runs. Bump deliberately, not on a whim.
export const GRAPH_VERSION = 'v25.0';

export interface InstagramPostResult {
  containerId: string;
  /** Always set: publishInstagramReel throws rather than returning an unpublished container. */
  mediaId: string;
  status: 'PUBLISHED';
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

/**
 * Step 1: ask Instagram to pull the video into a media container. Returns the
 * container id, which the caller should store before waiting — the container can
 * be resumed by id if this invocation dies mid-process.
 */
export async function createInstagramContainer(
  accessToken: string,
  igUserId: string,
  meta: { videoUrl: string; caption?: string; mimeType?: string }
): Promise<string> {
  if (!igUserId) {
    throw new Error(
      'No Instagram account id is stored — reconnect Instagram in Settings → Integrations.'
    );
  }
  if (meta.mimeType && !/mp4|quicktime|mov/i.test(meta.mimeType)) {
    throw new Error(
      `Instagram only accepts MP4/MOV, but this teaser is ${meta.mimeType}. Transcode to MP4 before posting.`
    );
  }

  const res = await fetch(`${GRAPH}/${GRAPH_VERSION}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      media_type: 'REELS',
      video_url: meta.videoUrl,
      caption: meta.caption ?? '',
      access_token: accessToken,
    }),
  });
  const data = await res.json();
  const containerId = data?.id;
  if (!res.ok || !containerId) {
    throw new Error(data?.error?.message || `Instagram container failed (${res.status})`);
  }
  return containerId;
}

/** One status read for a container: FINISHED / IN_PROGRESS / ERROR / EXPIRED. */
export async function instagramContainerStatus(
  accessToken: string,
  containerId: string
): Promise<string> {
  const res = await fetch(
    `${GRAPH}/${GRAPH_VERSION}/${containerId}?` +
      new URLSearchParams({ fields: 'status_code', access_token: accessToken })
  );
  const data = await res.json();
  return data?.status_code ?? 'UNKNOWN';
}

/**
 * Poll a container until it finishes or fails. Bounded by `maxWaitMs` so a batch
 * of posts can't run past the Edge function's wall clock; callers that time out
 * leave the row resumable and let the reconciler finish it.
 */
export async function waitForInstagramContainer(
  accessToken: string,
  containerId: string,
  maxWaitMs = 55_000
): Promise<string> {
  const deadline = Date.now() + maxWaitMs;
  // One immediate read first: a resumed container is often already FINISHED.
  for (;;) {
    const status = await instagramContainerStatus(accessToken, containerId);
    if (status === 'FINISHED' || status === 'ERROR' || status === 'EXPIRED') return status;
    if (Date.now() >= deadline) return 'IN_PROGRESS';
    await new Promise((r) => setTimeout(r, 5000));
  }
}

/** Step 2: publish a container that is FINISHED. Returns the live media id. */
export async function publishInstagramContainer(
  accessToken: string,
  igUserId: string,
  containerId: string
): Promise<string> {
  const res = await fetch(`${GRAPH}/${GRAPH_VERSION}/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ creation_id: containerId, access_token: accessToken }),
  });
  const data = await res.json();
  const mediaId = data?.id;
  if (!res.ok || !mediaId) {
    throw new Error(data?.error?.message || `Instagram publish failed (${res.status})`);
  }
  return mediaId;
}

/**
 * Create → wait → publish in one call. Kept for the synchronous callers; the
 * queue uses the split functions so it can persist the container id in between.
 */
export async function publishInstagramReel(
  accessToken: string,
  igUserId: string,
  meta: { videoUrl: string; caption?: string; mimeType?: string }
): Promise<InstagramPostResult> {
  const containerId = await createInstagramContainer(accessToken, igUserId, meta);
  const status = await waitForInstagramContainer(accessToken, containerId);
  if (status !== 'FINISHED') {
    // Never hand back a container that did not publish: callers used to mark the
    // row `published` regardless, so a Reel that failed to process read as live
    // (with a container id stored as the post id) and was never retried.
    throw new Error(
      `Instagram could not finish processing the video (status: ${status}) — it was not published. Try again shortly.`
    );
  }
  const mediaId = await publishInstagramContainer(accessToken, igUserId, containerId);
  return { containerId, mediaId, status: 'PUBLISHED' };
}
