import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn, getErrorMessage } from '@/lib/utils';
import { PLATFORM_LABELS, STATUS_LABELS, type PublicationWithAsset } from '@/types/publishing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Ban, ExternalLink, ListPlus, Loader2, Music2, PlusCircle, RotateCcw } from 'lucide-react';
import { useShopProducts, useDeliveredTracks, type DeliveredTrack } from '@/hooks/useDeliveredTracks';
import { SITE, shopProductForTrack, shopSongUrl } from '@/utils/shopLink';
import { formatKey } from '../../../../shared/song-catalog.mjs';
import { KEY_OPTIONS, keyForDisplay } from '@/utils/musicalKeys';
import { captureCardSnapshot, defaultCardState, drawCard, firstNameOf, loadCardLogo } from '@/utils/titleCard';
import { recordCanvasClip } from '@/utils/canvasRecorder';

// The board's measurable filters: a clickable count of what's done and what's
// still missing, so gaps (no shop listing, not on YouTube, no key) are obvious.
type BoardFilter =
  | 'all'
  | 'in_shop'
  | 'shop_draft'
  | 'no_shop'
  | 'on_youtube'
  | 'not_on_youtube'
  | 'not_for_socials'
  | 'missing_key';

const BOARD_STATS: { key: BoardFilter; label: string; hint: string }[] = [
  { key: 'all', label: 'All delivered', hint: 'Every delivered track' },
  { key: 'in_shop', label: 'In shop', hint: 'Live shop listings — the public shop page is reachable.' },
  { key: 'shop_draft', label: 'Shop draft', hint: 'Saved to the shop but not activated — needs review.' },
  { key: 'no_shop', label: 'No shop listing', hint: 'Not in the shop yet.' },
  { key: 'on_youtube', label: 'On YouTube', hint: 'Confirmed public on YouTube.' },
  { key: 'not_on_youtube', label: 'Not on YouTube', hint: 'No video queued, allowed on socials and not exclusive.' },
  { key: 'not_for_socials', label: 'Not for socials', hint: 'Manually excluded from socials.' },
  { key: 'missing_key', label: 'Missing key', hint: 'The request has no key recorded.' },
];

// Delivered tracks → one row each showing progress across every platform: is it
// in the shop, what's up on YouTube, are teaser drafts queued for TikTok/IG,
// and is it marked "never post". Review & queue opens the vetting dialog that
// records the title card with the verified title/key before queuing.
export default function ReleaseBoard({
  queue,
  tz,
  onMutation,
}: {
  queue: PublicationWithAsset[];
  tz: string;
  onMutation: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tracks, isLoading, error } = useDeliveredTracks();
  const { data: products = [] } = useShopProducts();
  const [vetting, setVetting] = useState<string | null>(null);
  const [listing, setListing] = useState<string | null>(null);
  const [filter, setFilter] = useState<BoardFilter>('all');

  // One-click shop listing: create a DRAFT product from the delivered track with
  // sensible defaults. It stays inactive until the owner reviews and activates it
  // in Admin → Shop, so nothing goes public without a look.
  const listProduct = async (t: DeliveredTrack) => {
    if (listing) return;
    setListing(t.requestId);
    try {
      const shownKey = formatKey(t.key ?? '');
      const shownShow = t.show.replace(/^\s*from\s+/i, '').trim();
      const description = [
        `${t.song}${shownShow ? ` (from ${shownShow})` : ''} — a piano backing track by Piano Backings by Daniele.${shownKey ? ` Recorded in ${shownKey}.` : ''}`,
        'Custom piano backing tracks for auditions, performances and practice — arranged and recorded in the key you choose, delivered fast.',
      ].join('\n\n');
      const { error: e } = await supabase.from('products').insert([{
        title: t.song,
        artist_name: t.show || 'Various',
        description,
        price: 6.99,
        currency: 'AUD',
        image_url: '',
        track_urls: [{ url: t.url, caption: t.song }],
        is_active: false,
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
      if (e) throw e;
      await queryClient.invalidateQueries({ queryKey: ['shop_products'] });
      toast({ title: 'Saved as a shop draft', description: `${t.song} is ready for review — open Shop to check it and activate the listing.` });
    } catch (e) {
      toast({ title: "Couldn't list the track", description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setListing(null);
    }
  };

  const pubsForTrack = (song: string, requestId: string, show: string) => {
    const songLc = song.trim().toLowerCase();
    const showLc = show.trim().toLowerCase();
    return queue.filter((p) => {
      const a = p.content_assets;
      if (!a) return false;
      if (a.request_id === requestId) return true;
      // Fallback for legacy assets with no request_id: same song title AND show.
      const titleMatch = (a.song_title || '').trim().toLowerCase() === songLc;
      const assetShow = (a.show || '').trim().toLowerCase();
      return titleMatch && (!showLc || !assetShow || assetShow === showLc);
    });
  };

  // Everything a row needs, computed once: its publications per platform, its
  // shop product/url, and whether YouTube already has it. Shared by the audit
  // strip and the rendered rows.
  const boardRows = (tracks ?? []).map((t) => {
    const pubs = pubsForTrack(t.song, t.requestId, t.show);
    const ytPub = pubs.find((p) => p.platform === 'youtube');
    return {
      t,
      yt: ytPub,
      tt: pubs.find((p) => p.platform === 'tiktok'),
      ig: pubs.find((p) => p.platform === 'instagram'),
      shopProduct: shopProductForTrack(products, { song: t.song, show: t.show }),
      shopUrl: shopSongUrl(products, { song: t.song, show: t.show }),
      queuedForYoutube: !!ytPub,
    };
  });

  type BoardRow = (typeof boardRows)[number];
  const rowMatches = (key: BoardFilter, row: BoardRow): boolean => {
    switch (key) {
      case 'in_shop': return row.shopProduct?.is_active === true;
      case 'shop_draft': return !!row.shopProduct && row.shopProduct.is_active === false;
      case 'no_shop': return !row.shopProduct;
      case 'on_youtube': return row.yt?.status === 'published';
      case 'not_on_youtube': return !row.yt && !row.t.noSocials && !row.t.isExclusive;
      case 'not_for_socials': return row.t.noSocials;
      case 'missing_key': return !row.t.key;
      default: return true;
    }
  };

  const audit = BOARD_STATS.reduce((acc, { key }) => {
    acc[key] = boardRows.filter((row) => rowMatches(key, row)).length;
    return acc;
  }, {} as Record<BoardFilter, number>);

  const visibleRows = boardRows.filter((row) => rowMatches(filter, row));

  const toggleNoSocials = async (requestId: string, current: boolean) => {
    const next = !current;
    const { error: e } = await supabase.from('backing_requests').update({ no_socials: next }).eq('id', requestId);
    if (e) {
      toast({ title: 'Could not save the flag', description: getErrorMessage(e), variant: 'destructive' });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['delivered_tracks'] });
    toast({ title: next ? 'Marked as not for socials' : 'Allowed on socials again' });
  };

  if (error) {
    return (
      <Card className="bg-white border-none shadow-sm rounded-2xl">
        <CardContent className="p-6 text-sm text-red-600">{getErrorMessage(error)}</CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-none shadow-sm rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-[#1C0357] flex items-center justify-between">
          <span>Release board — delivered tracks</span>
          <span className="text-xs font-normal text-gray-400">
            {isLoading
              ? 'Loading tracks…'
              : filter === 'all'
                ? `${tracks?.length ?? 0} delivered · newest first`
                : `${visibleRows.length} of ${tracks?.length ?? 0} · ${BOARD_STATS.find((s) => s.key === filter)?.label}`}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0.5">
        {isLoading || !tracks ? (
          <p className="px-4 py-6 text-sm text-gray-400">Loading tracks…</p>
        ) : tracks.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-400">
            No delivered backing tracks yet — upload a finished recording into the{' '}
            <span className="font-mono text-xs">tracks</span> bucket and it will appear here.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5 pb-3">
              {BOARD_STATS.map((s) => {
                const active = filter === s.key;
                const count = audit[s.key];
                const isGap = !active && count > 0 && ['no_shop', 'not_on_youtube', 'missing_key'].includes(s.key);
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setFilter(active && s.key !== 'all' ? 'all' : s.key)}
                    title={s.hint}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                      active
                        ? 'border-[#1C0357] bg-[#1C0357] text-white'
                        : isGap
                          ? 'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    )}
                  >
                    {s.label}
                    <span
                      className={cn(
                        'rounded-full px-1.5 text-[11px] tabular-nums',
                        active ? 'bg-white/20 text-white' : isGap ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            {visibleRows.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400">Nothing here — try another filter.</p>
            ) : (
              visibleRows.map(({ t, yt, tt, ig, shopProduct, shopUrl, queuedForYoutube }) => {
                return (
              <div key={t.requestId} className="rounded-xl border border-gray-100 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#1C0357]">
                      {t.song}
                      {t.isExclusive && (
                        <Badge
                          className="ml-2 bg-purple-100 text-purple-700"
                          variant="secondary"
                          title="Client bought exclusive ownership — this track shouldn't be shared publicly."
                        >
                          Exclusive
                        </Badge>
                      )}
                      {t.noSocials && (
                        <Badge className="ml-2 bg-gray-100 text-gray-500" variant="secondary">
                          Not for socials
                        </Badge>
                      )}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {t.show ? `from ${t.show}` : 'Backing track'}
                      {t.key ? ` · ${t.key.replace(/ \([^)]*\)$/, '')}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <PlatformChip label="YouTube" pub={yt} tz={tz} />
                    <PlatformChip label="TikTok" pub={tt} tz={tz} />
                    <PlatformChip label="Instagram" pub={ig} tz={tz} />
                    {shopProduct ? (
                      shopProduct.is_active ? (
                        <a
                          href={shopUrl ?? '/shop'}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 font-medium text-green-700 hover:bg-green-100"
                        >
                          Shop <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <Link
                          to="/admin?section=shop"
                          className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700 hover:bg-amber-100"
                          title="Saved as a draft — review and activate it in Admin → Shop."
                        >
                          Shop draft — review
                        </Link>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => listProduct(t)}
                          disabled={listing !== null}
                          className="h-7 rounded-full border-amber-200 bg-amber-50 px-2.5 font-semibold text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                          title="Create a draft shop listing from this track — review and activate it in Admin → Shop."
                        >
                          {listing === t.requestId
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <PlusCircle className="h-3 w-3" />}
                          Add to shop
                        </Button>
                        <Link
                          to={`/admin?section=shop&view=repurpose&request=${encodeURIComponent(t.requestId)}`}
                          className="rounded-full px-2 py-1 font-medium text-gray-400 hover:text-[#1C0357]"
                          title="Open the full Repurpose Request form prefilled with this track."
                        >
                          Edit details
                        </Link>
                      </span>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleNoSocials(t.requestId, t.noSocials)}
                      title={t.noSocials ? 'Allow this track on socials again' : 'Never upload this track to socials'}
                    >
                      {t.noSocials ? <RotateCcw className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                    </Button>
                    {!queuedForYoutube && (
                      <Button
                        size="sm"
                        className="bg-[#1C0357] hover:bg-[#1C0357]/90"
                        disabled={t.noSocials || t.isExclusive}
                        onClick={() => setVetting(t.requestId)}
                        title={t.isExclusive ? 'Exclusive ownership — not for public sharing' : undefined}
                      >
                        <ListPlus className="h-3.5 w-3.5" /> Review & queue
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                  <Music2 className="h-3.5 w-3.5 shrink-0" />
                  <audio controls preload="none" src={t.url} className="h-9 w-full max-w-[320px]" />
                  {queuedForYoutube && yt && (
                    <span className="truncate">
                      {STATUS_LABELS[yt.status]}
                      {yt.scheduled_for ? ` · ${whenLabel(yt.scheduled_for, tz)}` : ''}
                      {yt.platform_post_id ? ` · youtu.be/${yt.platform_post_id}` : ''}
                    </span>
                  )}
                </div>
              </div>
                );
              })
            )}
          </>
        )}
      </CardContent>

      {vetting && (
        <VettingDialog
          key={vetting}
          requestId={vetting}
          onClose={() => setVetting(null)}
          onQueued={onMutation}
        />
      )}
    </Card>
  );
}

function whenLabel(iso: string, tz: string) {
  const dtf = new Intl.DateTimeFormat('en-AU', {
    timeZone: tz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return dtf.format(new Date(iso));
}

function PlatformChip({
  label,
  pub,
  tz,
}: {
  label: string;
  pub: PublicationWithAsset | undefined;
  tz: string;
}) {
  if (!pub) {
    return (
      <span
        className="rounded-full bg-gray-50 px-2.5 py-1 text-gray-400"
        title={label === 'YouTube' ? 'No video yet' : `No teaser queued — ${label} posting arrives with the integration.`}
      >
        {label}: —
      </span>
    );
  }
  return (
    <Badge
      variant={pub.status === 'published' ? 'default' : 'outline'}
      className={cn(pub.status === 'published' && 'bg-green-100 text-green-700')}
      title={`${label} · ${PLATFORM_LABELS[pub.platform]} ${STATUS_LABELS[pub.status]} ${pub.scheduled_for ? whenLabel(pub.scheduled_for, tz) : ''}`}
    >
      {label}: {STATUS_LABELS[pub.status]}
    </Badge>
  );
}

// The description the AI drafts follows this fixed skeleton (mirrors the prompt
// in supabase/functions/draft-publication-metadata). Showing it here lets the
// final title/key/shop link be checked before the video is queued.
function descriptionSkeleton({
  song,
  show,
  key,
  firstName,
  shopUrl,
}: {
  song: string;
  show: string;
  key: string;
  firstName: string;
  shopUrl: string | null;
}): string {
  const cleanedShow = show.replace(/^\s*from\s+/i, '').trim();
  const titleLine = `${song || 'Song'} — Audition Cut${cleanedShow ? ` (from ${cleanedShow})` : ''}`;
  const intro = [
    `${titleLine}.`,
    firstName ? `Prepared for ${firstName}.` : '',
    key ? `Key: ${key}.` : '',
  ].filter(Boolean).join(' ');
  const pitch =
    'Custom piano backing tracks for auditions, performances and practice — arranged and recorded in the key you choose, delivered fast.';
  const shop = shopUrl
    ? `Get this track (instant download): ${shopUrl}\nOrder a custom cut in your key: ${SITE}/form-page`
    : `Order yours (any song, your key): ${SITE}/form-page`;
  const follow =
    'Follow: https://www.youtube.com/@pianobackingsbydaniele and https://www.instagram.com/pianobackingsbydaniele/';
  const tags = '#pianobackingtrack #backingtrack #auditioncut #musicaltheatre';
  return [intro, pitch, shop, follow, tags].join('\n\n');
}

// Live 16:9 render of the title card the video will carry, drawn with the same
// painting code as the recording so what's reviewed is what's posted.
function CardThumb({
  song,
  show,
  key,
  client,
}: {
  song: string;
  show: string;
  key: string;
  client: string | null;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const canvas = ref.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      const logo = await loadCardLogo();
      if (cancelled) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawCard(ctx, canvas.width, canvas.height, defaultCardState({ song, artist: show, client, key }), logo);
    })();
    return () => { cancelled = true; };
  }, [song, show, key, client]);
  return (
    <canvas
      ref={ref}
      width={640}
      height={360}
      className="w-full rounded-lg border border-gray-200 bg-[#1B0057]"
    />
  );
}

// ---------------------------------------------------------------------------
// Vetting dialog: hear the track, confirm/correct title + key, mark it 'not for
// socials' if needed, then approve → records the title card and queues it for
// the YouTube approval pipeline.
// ---------------------------------------------------------------------------
function VettingDialog({
  requestId,
  onClose,
  onQueued,
}: {
  requestId: string | null;
  onClose: () => void;
  onQueued: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tracks } = useDeliveredTracks();
  const { data: shopProducts = [] } = useShopProducts();
  const track = tracks?.find((t) => t.requestId === requestId) ?? null;

  const [title, setTitle] = useState(track?.song ?? '');
  const [show, setShow] = useState(track?.show ?? '');
  const [key, setKey] = useState(track?.key ?? 'C Major (0)');
  const [allowSocials, setAllowSocials] = useState(!track?.noSocials);
  const [phase, setPhase] = useState<'review' | 'recording' | 'uploading' | 'drafting'>('review');

  if (requestId && !track) return null;

  const shopUrl = shopSongUrl(shopProducts, { song: title.trim(), show: show.trim() });
  const description = descriptionSkeleton({
    song: title.trim(),
    show,
    key: keyForDisplay(key),
    firstName: firstNameOf(track?.client ?? ''),
    shopUrl,
  });

  const approve = async () => {
    if (!track || !title.trim()) {
      toast({ title: 'Add a song title first', variant: 'destructive' });
      return;
    }
    // "Allow on socials" unticked means: don't queue anything — just record the
    // exclusion so no future pipeline run can post this track.
    if (!allowSocials) {
      const { error } = await supabase
        .from('backing_requests')
        .update({ no_socials: true })
        .eq('id', track.requestId);
      if (error) {
        toast({ title: 'Could not save the flag', description: getErrorMessage(error), variant: 'destructive' });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ['delivered_tracks'] });
      onClose();
      toast({ title: 'Marked as not for socials — nothing was queued' });
      return;
    }
    // Duplicate guard: never queue a second video for a song already in the
    // pipeline (draft → published).
    const { data: existingRow } = await supabase
      .from('publications')
      .select('id, content_assets!inner(request_id)')
      .eq('content_assets.request_id', track.requestId)
      .in('status', ['draft', 'pending_approval', 'approved', 'scheduled', 'publishing', 'published'])
      .limit(1)
      .maybeSingle();
    if (existingRow) {
      toast({
        title: 'Already in the pipeline',
        description: 'This track already has a video in the queue or on the channel. Remove that row first if you want to re-record it.',
        variant: 'destructive',
      });
      return;
    }
    setPhase('recording');
    try {
      // Record a fresh title card with the verified title/show/key.
      const card = defaultCardState({ song: title.trim(), artist: show.trim(), client: track.client, key });
      const logoImg = await loadCardLogo();
      await Promise.allSettled([
        document.fonts.ready,
        ...[
          '400 32px "Arcade Gamer"',
          '400 32px "Press Start 2P"',
          '400 32px "VT323"',
          'italic 400 32px "Baskervville"',
          '400 32px "Inter"',
        ].map((f) => document.fonts.load(f)),
      ]);

      const cv = document.createElement('canvas');
      cv.width = 1920;
      cv.height = 1080;
      const cvCtx = cv.getContext('2d');

      const context = new AudioContext();
      if (context.state === 'suspended') await context.resume();
      const response = await fetch(track.url);
      if (!response.ok) {
        await context.close();
        throw new Error(`Couldn't load the backing track (${response.status}).`);
      }
      const decoded = await context.decodeAudioData(await response.arrayBuffer());
      const source = context.createBufferSource();
      source.buffer = decoded;
      source.connect(context.destination);

      setPhase('recording');
      const fade = 1.1;
      const blob = await recordCanvasClip({
        canvas: cv,
        duration: decoded.duration || 6,
        audio: { context, source },
        fps: 30,
        drawFrame: (elapsed) => {
          if (!cvCtx) return;
          drawCard(cvCtx, 1920, 1080, card, logoImg);
          const p = Math.min(elapsed / fade, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          cvCtx.fillStyle = `rgba(245,56,188,${(1 - ease).toFixed(3)})`;
          cvCtx.fillRect(0, 0, 1920, 1080);
        },
      });
      if (!blob) throw new Error('Recording failed in this browser.');

      setPhase('uploading');
      const { data: user } = await supabase.auth.getUser();
      const id = crypto.randomUUID();
      const path = `content/${id}.webm`;
      const previewPath = `content/${id}.preview.png`;

      const { error: uploadErr } = await supabase.storage
        .from('content')
        .upload(path, blob, { contentType: 'video/webm', upsert: false });
      if (uploadErr) throw uploadErr;

      const previewBlob = await captureCardSnapshot(cv);
      if (previewBlob) {
        const { error: previewErr } = await supabase.storage
          .from('content')
          .upload(previewPath, previewBlob, { contentType: 'image/png', upsert: false });
        if (previewErr) throw previewErr;
      }

      const cleanedShow = show.replace(/^\s*from\s+/i, '').trim();
      const titleCore = `${title.trim()} — Audition Cut${cleanedShow ? ` (from ${cleanedShow})` : ''}`;

      const { data: asset, error: assetErr } = await supabase
        .from('content_assets')
        .insert({
          storage_path: path,
          preview_path: previewBlob ? previewPath : null,
          mime_type: 'video/webm',
          title: titleCore,
          song_title: title.trim(),
          show: cleanedShow || null,
          key: key || null,
          dedication: track.client ? `prepared for ${track.client.trim().split(/\s+/)[0]}` : null,
          request_id: track.requestId,
          duration_seconds: null,
          aspect: '16:9',
          created_by: user.user?.id ?? null,
        })
        .select('id')
        .single();
      if (assetErr || !asset) throw new Error(assetErr?.message || "Couldn't create the asset.");

      const { data: pub, error: pubErr } = await supabase
        .from('publications')
        .insert({ asset_id: asset.id, platform: 'youtube', status: 'draft' })
        .select('id')
        .single();
      if (pubErr || !pub) throw new Error(pubErr?.message || "Couldn't create the publication.");

      setPhase('drafting');
      const { error: draftErr } = await supabase.functions.invoke('draft-publication-metadata', {
        body: { asset_id: asset.id, platform: 'youtube' },
      });
      if (draftErr) throw draftErr;

      onQueued();
      onClose();
      toast({ title: 'Queued for YouTube — needs approval' });
    } catch (e) {
      setPhase('review');
      toast({ title: 'Could not queue this track', description: getErrorMessage(e), variant: 'destructive' });
    }
  };

  return (
    <Dialog open={!!requestId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-[#1C0357]">Review & queue for YouTube</DialogTitle>
        </DialogHeader>
        {phase === 'review' && track && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Listen back</Label>
                <audio controls preload="none" src={track.url} className="h-10 w-full" />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <Label>Song title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Song name" />
                </div>
                <div className="space-y-1.5">
                  <Label>Show / Artist</Label>
                  <Input value={show} onChange={(e) => setShow(e.target.value)} placeholder="from the show" />
                </div>
                <div className="space-y-1.5">
                  <Label>Key</Label>
                  <Select value={key} onValueChange={setKey}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {key && !KEY_OPTIONS.some((o) => o.value === key) && (
                        <SelectItem value={key}>{key} — from the request</SelectItem>
                      )}
                      {KEY_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex h-9 items-center gap-2">
                <Switch checked={allowSocials} onCheckedChange={setAllowSocials} />
                <Label className="font-normal">Allow on socials</Label>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Title card</Label>
                <CardThumb song={title} show={show} key={key} client={track.client} />
              </div>
              <div className="space-y-1.5">
                <Label>YouTube description</Label>
                <pre className="max-h-52 overflow-auto whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs leading-relaxed text-gray-700">
                  {description}
                </pre>
                <p className="text-[11px] text-gray-400">
                  {shopUrl
                    ? 'The AI writes the final wording but follows this structure — your live shop link is included.'
                    : 'No active shop listing yet, so the description points to the custom-order form. Add this track to the shop to include a one-click buy link.'}
                </p>
              </div>
            </div>
          </div>
        )}
        {phase === 'recording' && <p className="py-6 text-sm text-[#F538BC]">Recording the title card…</p>}
        {phase === 'uploading' && <p className="py-6 text-sm text-[#F538BC]">Uploading the video…</p>}
        {phase === 'drafting' && <p className="py-6 text-sm text-[#F538BC]">Drafting AI metadata…</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={phase !== 'review'}>Cancel</Button>
          <Button
            onClick={approve}
            disabled={phase !== 'review' || !title.trim()}
            className="bg-[#1C0357] hover:bg-[#1C0357]/90"
          >
            {allowSocials ? 'Approve & queue' : 'Save as not for socials'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}