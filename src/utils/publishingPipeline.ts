import { PLATFORM_LABELS, type PublicationWithAsset } from '@/types/publishing';

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

// Instagram gets a short cut of the same card: Reels are discovered, not
// watched to the end, and a 30-second cut is the format Instagram rewards.
// TikTok keeps the full song so duets inherit the whole audio.
export const IG_TEASER_SECONDS = 30;

// Instagram draws its UI over the bottom fifth of a Reel; the IG cut lifts the
// brand block clear of it. See drawCard's `brandBottom`.
export const IG_BRAND_BOTTOM = 0.8;

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
// it — or the video is already live and the teasers are still waiting, in which
// case the worker arms them to "now" on its next pass. Only true while the
// automation switch is on.
export function willAutoPost(group: TrackGroup, autoOn: boolean): boolean {
  if (!autoOn) return false;
  const yt = group.yt;
  if (!yt) return false;
  if (yt.status === 'scheduled') {
    return !!yt.scheduled_for && new Date(yt.scheduled_for).getTime() > Date.now();
  }
  // Callers check isPostable() before asking, so a landscape leftover is already
  // ruled out — the worker applies the same guard before it arms a past slot.
  return yt.status === 'published';
}

// Instagram has no “post now” button, so when one of its teasers can't go out on
// its own the reason matters. This returns the honest line for each case instead
// of always blaming the connection.
export function instagramWaitingNote(autoOn: boolean): string {
  return autoOn
    ? 'Instagram posts this automatically on the video’s slot — nothing to do here.'
    : 'Instagram has no “post now” button yet. Turn on Auto-post in Settings → Integrations and it will post on the video’s slot.';
}

// A video row the pipeline can still act on. `failed` is always retryable: the
// row keeps the slot from the attempt that failed, and that stale slot must not
// read as "already booked" — otherwise a failed upload can never be retried.
export function trackBookable(group: TrackGroup): boolean {
  const yt = group.yt;
  if (!yt) return false;
  if (yt.status === 'failed') return true;
  return ['draft', 'pending_approval', 'approved'].includes(yt.status) && !yt.scheduled_for;
}

// Rows with something left for the pipeline to do.
export function hasPendingWork(group: TrackGroup): boolean {
  return group.pubs.some((p) =>
    ['draft', 'pending_approval', 'approved', 'failed'].includes(p.status)
  );
}

// A row the worker claimed as `publishing` but never finished — its invocation
// died mid-post. The reconciler recovers it, but until then it must not sit in
// "Booked" as if all is well. Matches the server's STUCK_PUBLISHING_MS.
export const STUCK_PUBLISHING_MS = 15 * 60_000;
export function isStuckPublishing(
  pub: PublicationWithAsset | undefined,
  now = Date.now()
): boolean {
  if (!pub || pub.status !== 'publishing') return false;
  const t = pub.updated_at ? new Date(pub.updated_at).getTime() : 0;
  return Number.isFinite(t) && now - t > STUCK_PUBLISHING_MS;
}

// True when pressing "Publish this song" would actually do something: book the
// video, or run a pass over a row that is not terminal yet. Shared so the button,
// the bar's helper text, and the song page can never disagree about whether there
// is work waiting.
export function trackActionable(group: TrackGroup): boolean {
  return trackBookable(group) || hasPendingWork(group);
}

export function needsAttention(group: TrackGroup, autoOn: boolean): boolean {
  const yt = group.yt;
  if (yt) {
    if (yt.status === 'failed') return true;
    if (yt.status === 'draft' || yt.status === 'pending_approval') return true;
    // An approved row that already holds a slot is the upload pass's job, not the
    // owner's — showing it under "Needs you" invited a re-approve that silently
    // moved the slot.
    if (yt.status === 'approved' && !yt.scheduled_for) return true;
  }
  // A post the worker claimed but never finished must not read as "booked".
  if (isStuckPublishing(group.tt) || isStuckPublishing(group.ig)) return true;
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
  if (isStuckPublishing(teaser)) {
    return { note: 'The worker stopped mid-post. Retry to run it again.', action: 'retry' };
  }
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

// ---------------------------------------------------------------------------
// The song page.
//
// One song, everything about it, and the checklist it has to pass before the
// pipeline can carry it on its own. The checklist lives here, not in the page,
// so the board, the "Publish this song" bar and the song page can't disagree
// about what is missing.
// ---------------------------------------------------------------------------

export function formatSeconds(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return 'an unknown length';
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
}

// The caption that will actually go out: the platform-specific one the AI (or
// the owner, via the composer) wrote, falling back to the description.
export function captionOf(pub?: PublicationWithAsset): string {
  if (!pub) return '';
  const meta = pub.metadata ?? {};
  return String((meta.caption as string | undefined) ?? meta.description ?? '').trim();
}

export interface ReadinessItem {
  label: string;
  ok: boolean;
  note: string;
  // Advisory items are worth fixing but never block a publish (a song without a
  // shop listing is still a perfectly good post).
  advisory?: boolean;
}

export interface ReadinessContext {
  /** The YouTube description, drafted by the AI or written by hand. */
  hasCopy: boolean;
  /** True when the video still needs booking — the only time copy is a blocker. */
  copyBlocking: boolean;
  shop: 'live' | 'draft' | 'none';
}

function teaserReadiness(
  pub: PublicationWithAsset | undefined,
  name: string
): { ok: boolean; note: string; advisory?: boolean } {
  // Advisory: the pipeline can publish and book the video whether or not a
  // teaser exists. A missing or unplayable cut is worth flagging on the song
  // page, but the "Publish this song" bar and publishTrack do not stop for it,
  // so treating it as a blocker here made the page disagree with the button.
  if (!pub) return { ok: false, advisory: true, note: `No ${name} row yet — record one.` };
  const asset = pub.content_assets;
  if (!asset?.storage_path) {
    return { ok: false, advisory: true, note: 'The row has no recorded file.' };
  }
  if (!isPostable(pub)) {
    return {
      ok: false,
      advisory: true,
      note: `${asset.aspect ?? 'Not portrait'} ${asset.mime_type || 'file'} — ${name} needs a portrait MP4.`,
    };
  }
  return { ok: true, note: `Portrait MP4, ${formatSeconds(asset.duration_seconds)}.` };
}

export function trackReadiness(group: TrackGroup, ctx: ReadinessContext): ReadinessItem[] {
  const yt = group.yt;
  const asset = yt?.content_assets;
  const tt = teaserReadiness(group.tt, PLATFORM_LABELS.tiktok);
  const ig = teaserReadiness(group.ig, PLATFORM_LABELS.instagram);

  const missingCaptions = ([
    ['TikTok', group.tt],
    ['Instagram', group.ig],
  ] as const)
    .filter(([, pub]) => pub && !captionOf(pub))
    .map(([name]) => name);

  return [
    {
      label: 'Song details',
      ok: !!group.label && group.label !== 'Untitled',
      note:
        group.label === 'Untitled'
          ? 'The request has no song title yet.'
          : 'Title and show are on the card.',
    },
    {
      label: 'YouTube cut',
      ok: !!asset?.storage_path && asset.aspect === '16:9',
      note: !yt
        ? 'Nothing queued for YouTube yet.'
        : !asset?.storage_path
          ? 'The row has no recorded file.'
          : asset.aspect === '16:9'
            ? `16:9, ${formatSeconds(asset.duration_seconds)}.`
            : `Recorded ${asset.aspect ?? 'at an unknown size'} — YouTube wants 16:9.`,
    },
    {
      label: 'YouTube copy',
      ok: ctx.hasCopy,
      advisory: !ctx.copyBlocking,
      note: ctx.hasCopy
        ? 'Title, description and tags drafted.'
        : ctx.copyBlocking
          ? 'No description yet — nothing gets booked without one.'
          : 'No description yet.',
    },
    { label: 'TikTok teaser', ...tt },
    { label: 'Instagram teaser', ...ig },
    {
      // Advisory, not a blocker. `run-social-queue`'s captionFor() rebuilds a
      // caption from the title and hashtags when none is drafted, so a missing
      // caption never stops a post. Blocking here would refuse a publish the
      // 15-minute cron performs happily — instead, nudge for a better hook.
      label: 'Captions',
      ok: missingCaptions.length === 0,
      advisory: true,
      note:
        missingCaptions.length === 0
          ? 'Every teaser has a caption.'
          : `Nothing drafted for ${missingCaptions.join(' or ')} — it would post the title and hashtags instead.`,
    },
    {
      label: 'Shop listing',
      advisory: true,
      ok: ctx.shop === 'live',
      note:
        ctx.shop === 'live'
          ? 'Linked from the description.'
          : ctx.shop === 'draft'
            ? 'Draft listing — activate it in Shop to link it.'
            : 'No listing — the description points to the order form.',
    },
  ];
}
