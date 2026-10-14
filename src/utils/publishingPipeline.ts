import type { PublicationWithAsset } from '@/types/publishing';

// ---------------------------------------------------------------------------
// Grouping for the publishing page.
//
// The old page stacked a YouTube-only queue, a separate teaser board and a
// published list, so one song's state was spread across three places. Here a
// song is a single group with its YouTube / TikTok / Instagram rows side by
// side, and the page is three slices: what needs you, what's booked, what's
// live.
// ---------------------------------------------------------------------------

export function when(iso: string | null | undefined, tz: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-AU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: tz,
    });
  } catch {
    return new Date(iso).toLocaleString();
  }
}

export interface TrackGroup {
  key: string;
  requestId: string | null;
  label: string;
  yt?: PublicationWithAsset;
  tt?: PublicationWithAsset;
  ig?: PublicationWithAsset;
  pubs: PublicationWithAsset[];
}

// A song's rows share a request (new recordings) or, for legacy assets, the same
// asset id — either way they collapse into one group.
export function groupPublications(queue: PublicationWithAsset[]): TrackGroup[] {
  const map = new Map<string, PublicationWithAsset[]>();
  for (const pub of queue) {
    if (pub.status === 'skipped') continue;
    const key = pub.content_assets?.request_id || pub.asset_id;
    const bucket = map.get(key);
    if (bucket) bucket.push(pub);
    else map.set(key, [pub]);
  }
  return [...map.entries()].map(([key, pubs]) => {
    const yt = pubs.find((p) => p.platform === 'youtube');
    const tt = pubs.find((p) => p.platform === 'tiktok');
    const ig = pubs.find((p) => p.platform === 'instagram');
    const asset = yt?.content_assets || tt?.content_assets || ig?.content_assets || null;
    const label =
      [asset?.song_title, asset?.show].filter(Boolean).join(' — ') || asset?.title || 'Untitled';
    return { key, requestId: asset?.request_id ?? null, label, yt, tt, ig, pubs };
  });
}

// A teaser can only post if its file is a container TikTok/Instagram can play
// AND it is portrait — the composer blocks/warns on the same rules.
export function isPostable(pub?: PublicationWithAsset): boolean {
  if (!pub?.content_assets) return false;
  const mime = pub.content_assets.mime_type || '';
  return (
    /^(video\/(mp4|quicktime)|video\/x-m4v)$/i.test(mime) &&
    pub.content_assets.aspect === '9:16'
  );
}

// The video's slot is still ahead, so run-social-queue will book the teasers on
// it. Only true while the automation switch is on and the slot is in the future.
export function willAutoPost(group: TrackGroup, autoOn: boolean): boolean {
  if (!autoOn) return false;
  const yt = group.yt;
  return (
    !!yt &&
    yt.status === 'scheduled' &&
    !!yt.scheduled_for &&
    new Date(yt.scheduled_for).getTime() > Date.now()
  );
}

const VIDEO_NEEDS_ACTION = ['draft', 'pending_approval', 'approved', 'failed'];

export function needsAttention(group: TrackGroup, autoOn: boolean): boolean {
  if (group.yt && VIDEO_NEEDS_ACTION.includes(group.yt.status)) return true;
  for (const teaser of [group.tt, group.ig]) {
    if (!teaser) continue;
    if (teaser.status === 'failed') return true;
    if (teaser.status === 'draft' || teaser.status === 'pending_approval') {
      // Either it can't be posted as recorded, or nothing will pick it up.
      if (!isPostable(teaser)) return true;
      if (!willAutoPost(group, autoOn)) return true;
    }
  }
  return false;
}

// What the teaser line should say and do for one platform's row.
export function teaserProblem(
  teaser: PublicationWithAsset,
  group: TrackGroup,
  autoOn: boolean
): { note: string; action: 'record' | 'compose' | 'retry' } | null {
  if (teaser.status === 'failed') {
    return { note: teaser.error || 'It failed to post.', action: 'retry' };
  }
  if (teaser.status === 'draft' || teaser.status === 'pending_approval') {
    if (!isPostable(teaser)) {
      return {
        note: 'Record it as a portrait MP4 — TikTok and Instagram can’t play the current file.',
        action: 'record',
      };
    }
    if (!willAutoPost(group, autoOn)) {
      return { note: 'Ready to post by hand.', action: 'compose' };
    }
  }
  return null;
}
