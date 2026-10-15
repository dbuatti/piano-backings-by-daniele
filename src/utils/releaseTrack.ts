// Turning a delivered request into a posted song, in one call.
//
// The release wizard and the release board's vetting dialog both need the same
// thing: record the title card for each platform, upload it, register it as a
// content asset, then create the draft publication rows and draft their copy.
// It lives here so there is exactly one implementation of that sequence — the
// wizard is a friendlier way to drive it, not a second recording path.

import { supabase } from '@/integrations/supabase/client';
import type { DeliveredTrack, ShopProductRow } from '@/hooks/useDeliveredTracks';
import { shopProductForTrack } from '@/utils/shopLink';
import {
  captureCardSnapshot,
  defaultCardState,
  drawCard,
  loadCardFonts,
  loadCardLogo,
  renderCardToBlob,
} from '@/utils/titleCard';
import { probeVideoBlob, recordCanvasClip, videoFileInfo, type ClipProgress } from '@/utils/canvasRecorder';
import { IG_BRAND_BOTTOM, IG_TEASER_SECONDS } from '@/utils/publishingPipeline';
import { formatKey } from '../../shared/song-catalog.mjs';

export type ReleasePlatform = 'youtube' | 'tiktok' | 'instagram';

/** The three things a queue pass does, in order, for the progress display. */
export type ReleasePhase = 'recording' | 'uploading' | 'drafting';

// Where each platform's cut comes from. YouTube gets the full landscape video;
// TikTok the full vertical teaser (so duets inherit the whole audio); Instagram a
// 30-second Reel cropped out of the same vertical recording.
const CUTS = {
  youtube: { width: 1920, height: 1080, aspect: '16:9', fade: 1.1, fps: 30, bitrate: 8_000_000 },
  tiktok: { width: 1080, height: 1920, aspect: '9:16', fade: 0, fps: 15, bitrate: 3_000_000 },
  instagram: {
    width: 1080,
    height: 1920,
    aspect: '9:16',
    fade: 0,
    fps: 15,
    bitrate: 3_000_000,
    seconds: IG_TEASER_SECONDS,
  },
} as const;

type ClipOptions = {
  width: number;
  height: number;
  aspect: '16:9' | '9:16';
  fade: number;
  fps: number;
  bitrate: number;
  title: string;
  /** Seconds to record. Defaults to the whole track (what TikTok wants). */
  seconds?: number;
  /** Instagram-safe layout: keep the brand block out of IG's caption area. */
  igSafe?: boolean;
};

/**
 * Decodes the track and returns a function that records one cut of its title
 * card, uploads it and registers the content asset. Shared by the queue pass and
 * the teaser re-record so both produce byte-identical assets.
 */
async function createRecorder({
  track,
  title,
  show,
  key,
  onPhase,
  onProgress,
}: {
  track: DeliveredTrack;
  title: string;
  show: string;
  key: string;
  onPhase: (phase: ReleasePhase) => void;
  onProgress: (progress: ClipProgress) => void;
}) {
  const card = defaultCardState({ song: title.trim(), artist: show.trim(), client: track.client, key });
  const logoImg = await loadCardLogo();
  await loadCardFonts();

  const reqId = track.requestId;
  const clientName = track.client;
  const songTitle = track.song;

  const decoder = new AudioContext();
  if (decoder.state === 'suspended') await decoder.resume();
  const response = await fetch(track.url);
  if (!response.ok) {
    await decoder.close();
    throw new Error(`Couldn't load the backing track (${response.status}).`);
  }
  // AudioBuffer samples are context-independent, but the decoding context is
  // finished with, and recordCanvasClip closes whatever context it is handed.
  // Reusing this one left the second and third cuts (TikTok, Instagram) on a dead
  // audio graph — the recording came out silent. Each pass below gets a fresh
  // context instead.
  const decoded = await decoder.decodeAudioData(await response.arrayBuffer());
  await decoder.close().catch(() => undefined);
  const durationSecs = decoded.duration || 6;

  const cleanedShow = show.replace(/^\s*from\s+/i, '').trim();
  const titleCore = `${title.trim()} — Audition Cut${cleanedShow ? ` (from ${cleanedShow})` : ''}`;
  const { data: user } = await supabase.auth.getUser();

  const recordAndStore = async (opts: ClipOptions) => {
    const recordSeconds = Math.min(opts.seconds ?? durationSecs, durationSecs);
    const cv = document.createElement('canvas');
    cv.width = opts.width;
    cv.height = opts.height;
    const cvCtx = cv.getContext('2d');
    // Each pass needs its own AudioBufferSourceNode (a source can only start
    // once) *and* its own AudioContext, because recordCanvasClip closes the
    // context it is given when the pass finishes.
    const passContext = new AudioContext();
    if (passContext.state === 'suspended') await passContext.resume();
    const source = passContext.createBufferSource();
    source.buffer = decoded;
    source.connect(passContext.destination);

    onProgress({ loaded: 0, total: recordSeconds });
    onPhase('recording');
    const blob = await recordCanvasClip({
      canvas: cv,
      duration: recordSeconds,
      audio: { context: passContext, source },
      // The card is a still image: a low frame rate looks identical and leaves
      // the main thread free to keep the audio muxer fed.
      fps: opts.fps,
      videoBitsPerSecond: opts.bitrate,
      label: title.trim() || songTitle,
      onProgress,
      drawFrame: (elapsed) => {
        if (!cvCtx) return;
        drawCard(cvCtx, opts.width, opts.height, card, logoImg, {
          brandBottom: opts.igSafe ? IG_BRAND_BOTTOM : undefined,
        });
        if (opts.fade > 0) {
          const p = Math.min(elapsed / opts.fade, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          cvCtx.fillStyle = `rgba(245,56,188,${(1 - ease).toFixed(3)})`;
          cvCtx.fillRect(0, 0, opts.width, opts.height);
        }
      },
    });
    if (!blob) throw new Error('Recording failed in this browser.');

    // Refuse to publish a file the browser itself can't decode.
    const probe = await probeVideoBlob(blob);
    console.info('[release] recorded clip', blob.type, probe);
    if (!probe || !probe.width || !probe.height) {
      throw new Error(
        "The recording couldn't be read back. Close other tabs, then try again — and use an up-to-date Chrome or Safari."
      );
    }

    onPhase('uploading');
    const id = crypto.randomUUID();
    const file = videoFileInfo(blob.type);
    const path = `content/${id}.${file.ext}`;
    const previewPath = `content/${id}.preview.png`;

    const { error: uploadErr } = await supabase.storage
      .from('content')
      .upload(path, blob, { contentType: file.mime, upsert: false });
    if (uploadErr) throw uploadErr;

    const previewBlob = await captureCardSnapshot(cv);
    if (previewBlob) {
      const { error: previewErr } = await supabase.storage
        .from('content')
        .upload(previewPath, previewBlob, { contentType: 'image/png', upsert: false });
      if (previewErr) throw previewErr;
    }

    const { data: asset, error: assetErr } = await supabase
      .from('content_assets')
      .insert({
        storage_path: path,
        preview_path: previewBlob ? previewPath : null,
        mime_type: file.mime,
        title: opts.title,
        song_title: title.trim(),
        show: cleanedShow || null,
        key: key || null,
        dedication: clientName ? `prepared for ${clientName.trim().split(/\s+/)[0]}` : null,
        request_id: reqId,
        duration_seconds: recordSeconds,
        aspect: opts.aspect,
        created_by: user.user?.id ?? null,
      })
      .select('id')
      .single();
    if (assetErr || !asset) throw new Error(assetErr?.message || "Couldn't create the asset.");
    return { assetId: asset.id as string, file };
  };

  return { recordAndStore, titleCore, durationSecs };
}

export type ReleaseResult = {
  /** Asset id per platform, so callers can act on the rows they just created. */
  assetIds: Partial<Record<ReleasePlatform, string>>;
  title: string;
};

export const RELEASE_PLATFORMS: readonly ReleasePlatform[] = ['youtube', 'tiktok', 'instagram'];

/**
 * Records every cut, uploads them, registers the content assets, creates the
 * draft publications, then drafts each row's copy. Resolves once the rows exist
 * with their metadata written — the point at which the owner can approve the
 * captions — which is what makes the wizard's "check the captions" step possible.
 *
 * A row for a song already in the pipeline must be removed first; the caller
 * guards that (the wizard only ever offers songs with no video yet).
 */
export async function queueTrackForRelease({
  track,
  title,
  show,
  key,
  platforms = RELEASE_PLATFORMS,
  onPhase,
  onProgress,
}: {
  track: DeliveredTrack;
  title: string;
  show: string;
  key: string;
  platforms?: readonly ReleasePlatform[];
  onPhase: (phase: ReleasePhase) => void;
  onProgress: (progress: ClipProgress) => void;
}): Promise<ReleaseResult> {
  const { recordAndStore, titleCore } = await createRecorder({ track, title, show, key, onPhase, onProgress });

  const assetIds: Partial<Record<ReleasePlatform, string>> = {};
  // A fixed order keeps the recordings (and therefore the slots) predictable.
  for (const platform of RELEASE_PLATFORMS) {
    if (!platforms.includes(platform)) continue;
    const made = await recordAndStore({ ...CUTS[platform], title: titleCore });
    assetIds[platform] = made.assetId;
  }

  const wanted = RELEASE_PLATFORMS.filter((p) => platforms.includes(p));
  if (!wanted.length) return { assetIds, title: titleCore };

  const { error: pubErr } = await supabase
    .from('publications')
    .insert(wanted.map((platform) => ({ asset_id: assetIds[platform], platform, status: 'draft' })));
  if (pubErr) throw new Error(pubErr.message || "Couldn't create the publications.");

  onPhase('drafting');
  // Draft each platform's caption. Only the YouTube row is required — a missing
  // teaser caption shouldn't block the video being queued.
  for (const platform of wanted) {
    const { error: draftErr } = await supabase.functions.invoke('draft-publication-metadata', {
      body: { asset_id: assetIds[platform], platform },
    });
    if (draftErr && platform === 'youtube') throw draftErr;
  }

  return { assetIds, title: titleCore };
}

/**
 * Re-records only the TikTok/Instagram teasers and moves the existing teaser
 * rows onto the new recording. The YouTube row is untouched. Returns how many
 * rows were moved and the mime type TikTok got, so the caller can warn when the
 * browser could only produce WebM (which TikTok cannot play).
 */
export async function rerecordTeasers({
  track,
  title,
  show,
  key,
  onPhase,
  onProgress,
}: {
  track: DeliveredTrack;
  title: string;
  show: string;
  key: string;
  onPhase: (phase: ReleasePhase) => void;
  onProgress: (progress: ClipProgress) => void;
}): Promise<{ moved: number; tiktokMime: string }> {
  const { recordAndStore, titleCore } = await createRecorder({ track, title, show, key, onPhase, onProgress });

  // Two cuts, because the platforms want different lengths: TikTok gets the whole
  // track (so duets inherit the full audio), Instagram a 30-second Reel.
  const tt = await recordAndStore({ ...CUTS.tiktok, title: titleCore });
  const ig = await recordAndStore({ ...CUTS.instagram, title: titleCore });

  const { data: teaserRows, error: teaserErr } = await supabase
    .from('publications')
    .select('id, platform, status, content_assets!inner(request_id)')
    .eq('content_assets.request_id', track.requestId)
    .in('platform', ['tiktok', 'instagram']);
  if (teaserErr) throw teaserErr;

  const rows = teaserRows ?? [];
  for (const platform of ['tiktok', 'instagram'] as const) {
    const ids = rows.filter((r) => r.platform === platform).map((r) => r.id);
    if (!ids.length) continue;
    const { error: moveErr } = await supabase
      .from('publications')
      .update({
        asset_id: platform === 'tiktok' ? tt.assetId : ig.assetId,
        status: 'pending_approval',
        scheduled_for: null,
        platform_post_id: null,
        published_at: null,
        error: null,
      })
      .in('id', ids);
    if (moveErr) throw moveErr;
  }

  return { moved: rows.length, tiktokMime: tt.file.mime };
}

/**
 * Records a musical key on the request, in the column that request actually
 * reads (see DeliveredTrack.keyField). Used by the board's inline key picker and
 * the wizard's "needs a key" fixer.
 */
export async function saveRequestKey(track: DeliveredTrack, value: string): Promise<void> {
  if (!value) throw new Error('Pick a key first.');
  const { error } = await supabase
    .from('backing_requests')
    .update({ [track.keyField]: value })
    .eq('id', track.requestId);
  if (error) throw error;
}

/**
 * Creates the shop listing for a delivered track: a $6.99 listing with a
 * rendered title card as its image and the track's audio attached.
 *
 * `active` decides whether the listing is live immediately or saved as a draft
 * for review — the board's one-click uses the draft, the wizard defaults to
 * live so "push it to the shop" means what it says.
 *
 * Returns whether a listing was actually created. A song already in the shop is
 * left alone rather than being listed twice: the same song can be delivered more
 * than once, and nothing should end up with two shop entries.
 */
export async function listTrackInShop(
  track: DeliveredTrack,
  { active = false } = {}
): Promise<{ created: boolean }> {
  const { data: existing, error: lookupErr } = await supabase
    .from('products')
    .select('id, title, artist_name, product_type, is_active');
  if (lookupErr) throw lookupErr;
  if (shopProductForTrack((existing ?? []) as ShopProductRow[], track)) {
    return { created: false };
  }

  const shownKey = formatKey(track.key ?? '');
  const shownShow = track.show.replace(/^\s*from\s+/i, '').trim();
  const description = [
    `${track.song}${shownShow ? ` (from ${shownShow})` : ''} — a piano backing track by Piano Backings by Daniele.${shownKey ? ` Recorded in ${shownKey}.` : ''}`,
    'Custom piano backing tracks for auditions, performances and practice — arranged and recorded in the key you choose, delivered fast.',
  ].join('\n\n');

  // Render the same title card as the product image so the listing isn't blank;
  // a render/upload failure just leaves it empty for a manual add.
  let imageUrl = '';
  try {
    const cardBlob = await renderCardToBlob(
      { song: track.song, artist: track.show, client: track.client, key: track.key },
      '1:1'
    );
    if (cardBlob) {
      const path = `product-images/card-${track.requestId}-${Date.now()}.png`;
      const { error: upErr } = await supabase.storage
        .from('product-images')
        .upload(path, cardBlob, { contentType: 'image/png', upsert: false });
      if (!upErr) {
        imageUrl = supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
      }
    }
  } catch {
    // Non-fatal: the draft is still created without an image.
  }

  const { error } = await supabase.from('products').insert([{
    title: track.song,
    artist_name: track.show || 'Various',
    description,
    price: 6.99,
    currency: 'AUD',
    image_url: imageUrl,
    track_urls: [{ url: track.url, caption: track.song }],
    is_active: active,
    category: 'audition-cut',
    track_type: 'polished',
    key_signature: shownKey,
    product_type: 'track',
    vocal_ranges: [],
    sheet_music_url: '',
    show_sheet_music_url: true,
    show_key_signature: true,
    cut_description: '',
    official_score_url: '',
    master_download_link: '',
  }]);
  if (error) throw error;
  return { created: true };
}
