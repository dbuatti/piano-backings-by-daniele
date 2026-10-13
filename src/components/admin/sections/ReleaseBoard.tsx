import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn, getErrorMessage, getFunctionErrorMessage } from '@/lib/utils';
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
import { AlertCircle, Ban, CheckCircle2, ExternalLink, Eye, Heart, ListPlus, Loader2, Mail, MessageCircle, Music2, PlusCircle, RotateCcw, Send } from 'lucide-react';
import { useShopProducts, useDeliveredTracks, type DeliveredTrack } from '@/hooks/useDeliveredTracks';
import { SITE, shopProductForTrack, shopSongUrl } from '@/utils/shopLink';
import { formatKey } from '../../../../shared/song-catalog.mjs';
import { KEY_OPTIONS, keyForDisplay } from '@/utils/musicalKeys';
import { type Aspect, captureCardSnapshot, defaultCardState, drawCard, firstNameOf, loadCardLogo } from '@/utils/titleCard';
import { recordCanvasClip, type ClipProgress } from '@/utils/canvasRecorder';
import { Progress } from '@/components/ui/progress';

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
  onBacklog,
}: {
  queue: PublicationWithAsset[];
  tz: string;
  onMutation: () => void;
  // Reports how many delivered tracks still have no YouTube video, so the
  // cadence card above can forecast when the backlog will finish.
  onBacklog?: (count: number) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tracks, isLoading, error } = useDeliveredTracks();
  const { data: products = [] } = useShopProducts();
  const [vetting, setVetting] = useState<string | null>(null);
  const [listing, setListing] = useState<string | null>(null);
  const [filter, setFilter] = useState<BoardFilter>('all');
  const [previewing, setPreviewing] = useState<DeliveredTrack | null>(null);
  const [emailing, setEmailing] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

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

  // The not-on-YouTube backlog, in board order, for the "vett backlog" walkthrough.
  const notOnYoutubeIds = boardRows
    .filter((row) => rowMatches('not_on_youtube', row))
    .map((row) => row.t.requestId);
  const [bulkVet, setBulkVet] = useState<{ ids: string[]; index: number } | null>(null);

  // At-a-glance progress: how much of the catalogue is live, queued and listed.
  const totalDelivered = boardRows.length;
  const queuedYt = boardRows.filter((row) => row.yt && row.yt.status !== 'published').length;
  const nextUpload = queue
    .filter((p) => p.platform === 'youtube' && p.status === 'scheduled' && p.scheduled_for)
    .map((p) => p.scheduled_for as string)
    .sort()[0];

  useEffect(() => {
    onBacklog?.(notOnYoutubeIds.length);
  }, [notOnYoutubeIds.length, onBacklog]);

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

  // Publish a draft shop listing straight from the board, so a one-click "Add to
  // shop" never stalls waiting on a separate review pass.
  const activateProduct = async (id: string | undefined, song: string) => {
    if (!id || activating) return;
    setActivating(id);
    try {
      const { error: e } = await supabase.from('products').update({ is_active: true }).eq('id', id);
      if (e) throw e;
      await queryClient.invalidateQueries({ queryKey: ['shop_products'] });
      toast({ title: 'Shop listing activated', description: `${song} is now live in the shop.` });
    } catch (e) {
      toast({ title: "Couldn't activate the listing", description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setActivating(null);
    }
  };

  // Record a missing musical key without leaving the board — the card and the
  // description pick it up next time the track is queued.
  const saveKey = async (requestId: string, value: string) => {
    if (!value || savingKey) return;
    setSavingKey(requestId);
    try {
      const { error: e } = await supabase.from('backing_requests').update({ song_key: value }).eq('id', requestId);
      if (e) throw e;
      await queryClient.invalidateQueries({ queryKey: ['delivered_tracks'] });
      toast({ title: 'Key saved', description: `${value.replace(/\s*\([^)]*\)\s*$/, '')} recorded on the request.` });
    } catch (e) {
      toast({ title: "Couldn't save the key", description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setSavingKey(null);
    }
  };

  // Runs the server-side audit (same rules, authoritative) and emails the digest.
  const emailAudit = async () => {
    setEmailing(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('audit-social-gaps', { body: {} });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);
      toast({
        title: 'Audit emailed',
        description: `${data?.not_on_youtube?.length ?? 0} not on YouTube · ${data?.no_shop?.length ?? 0} missing from the shop.`,
      });
    } catch (e) {
      toast({ title: "Couldn't run the audit", description: await getFunctionErrorMessage(e), variant: 'destructive' });
    } finally {
      setEmailing(false);
    }
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
            <div className="grid grid-cols-2 gap-2 pb-3 lg:grid-cols-4">
              <StatTile
                label="On YouTube"
                value={`${audit.on_youtube}/${totalDelivered}`}
                hint="Published and public"
                pct={totalDelivered ? (audit.on_youtube / totalDelivered) * 100 : 0}
                tone="green"
              />
              <StatTile
                label="Queued to publish"
                value={queuedYt}
                hint={nextUpload ? `Next: ${whenLabel(nextUpload, tz)}` : 'Nothing scheduled yet'}
                pct={totalDelivered ? (queuedYt / totalDelivered) * 100 : 0}
                tone="pink"
              />
              <StatTile
                label="In the shop"
                value={`${audit.in_shop}/${totalDelivered}`}
                hint={
                  audit.shop_draft > 0
                    ? `${audit.shop_draft} draft listing${audit.shop_draft === 1 ? '' : 's'} to activate`
                    : 'No drafts waiting'
                }
                pct={totalDelivered ? (audit.in_shop / totalDelivered) * 100 : 0}
                tone="amber"
              />
              <StatTile
                label="Not on YouTube"
                value={notOnYoutubeIds.length}
                hint="Allowed on socials, no video yet"
                pct={totalDelivered ? (notOnYoutubeIds.length / totalDelivered) * 100 : 0}
                tone="gray"
                onClick={() => setFilter('not_on_youtube')}
              />
            </div>
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
              {notOnYoutubeIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setBulkVet({ ids: notOnYoutubeIds, index: 0 })}
                  title="Step through every delivered track that isn't on YouTube yet, one at a time."
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#1C0357] px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-[#2D0B8C]"
                >
                  <ListPlus className="h-3 w-3" /> Vett backlog ({notOnYoutubeIds.length})
                </button>
              )}
              <button
                type="button"
                onClick={emailAudit}
                disabled={emailing}
                title="Email yourself a digest of what's missing — not on YouTube, not in the shop."
                className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 disabled:opacity-60"
              >
                <Mail className="h-3 w-3" /> {emailing ? 'Sending…' : 'Email audit'}
              </button>
            </div>
            {visibleRows.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400">Nothing here — try another filter.</p>
            ) : (
              visibleRows.map(({ t, yt, tt, ig, shopProduct, shopUrl, queuedForYoutube }) => {
                return (
              <div key={t.requestId} className="rounded-xl border border-gray-100 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-[#1C0357]">
                      <span className="truncate">{t.song}</span>
                      {t.isExclusive && (
                        <Badge
                          className="bg-purple-100 text-purple-700"
                          variant="secondary"
                          title="Client bought exclusive ownership — this track shouldn't be shared publicly."
                        >
                          Exclusive
                        </Badge>
                      )}
                      {t.noSocials && (
                        <Badge className="bg-gray-100 text-gray-500" variant="secondary">
                          Not for socials
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-gray-500">
                      {t.show ? `from ${t.show}` : 'Backing track'}
                      {t.key ? ` · ${t.key.replace(/ \([^)]*\)$/, '')}` : ''}
                    </p>
                    {!t.key && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-amber-600">No key recorded</span>
                        <Select
                          value=""
                          onValueChange={(value) => saveKey(t.requestId, value)}
                          disabled={savingKey !== null}
                        >
                          <SelectTrigger className="h-7 w-[150px] text-xs">
                            <SelectValue placeholder={savingKey === t.requestId ? 'Saving…' : 'Set key'} />
                          </SelectTrigger>
                          <SelectContent>
                            {KEY_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
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
                        <span className="inline-flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => activateProduct(shopProduct.id, t.song)}
                            disabled={activating !== null}
                            className="h-7 rounded-full border-amber-200 bg-amber-50 px-2.5 font-semibold text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                            title="Publish this draft listing to the shop now — it becomes reachable at its public URL."
                          >
                            <CheckCircle2 className="h-3 w-3" />{' '}
                            {activating === shopProduct.id ? 'Activating…' : 'Shop draft — activate'}
                          </Button>
                          <Link
                            to="/admin?section=shop"
                            className="rounded-full px-1.5 text-amber-700/70 hover:underline"
                            title="Open Shop to review the details first."
                          >
                            review
                          </Link>
                        </span>
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
                      onClick={() => setPreviewing(t)}
                      title="Preview how this will look on YouTube, TikTok and Instagram."
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
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

      {bulkVet && bulkVet.ids[bulkVet.index] && (
        <VettingDialog
          key={bulkVet.ids[bulkVet.index]}
          requestId={bulkVet.ids[bulkVet.index]}
          onClose={() => setBulkVet(null)}
          onQueued={onMutation}
          progress={{ index: bulkVet.index, total: bulkVet.ids.length }}
          onNext={() => {
            setBulkVet((v) => {
              if (!v) return v;
              const next = v.index + 1;
              return next >= v.ids.length ? null : { ...v, index: next };
            });
            onMutation();
          }}
        />
      )}

      {previewing && (
        <PlatformPreview track={previewing} onClose={() => setPreviewing(null)} />
      )}
    </Card>
  );
}

const TILE_BARS = {
  green: 'bg-emerald-500',
  pink: 'bg-[#F538BC]',
  amber: 'bg-amber-400',
  gray: 'bg-gray-300',
} as const;

// One tile in the board's at-a-glance progress strip.
function StatTile({
  label,
  value,
  hint,
  pct,
  tone,
  onClick,
}: {
  label: string;
  value: string | number;
  hint: string;
  pct: number;
  tone: keyof typeof TILE_BARS;
  onClick?: () => void;
}) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className={cn(
        'rounded-xl border border-gray-100 bg-gray-50/60 p-3',
        onClick && 'cursor-pointer transition-colors hover:border-gray-300'
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</span>
        <span className="text-lg font-bold tabular-nums text-[#1C0357]">{value}</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div className={cn('h-full rounded-full', TILE_BARS[tone])} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-gray-400">{hint}</p>
    </div>
  );
}

// mm:ss for the recording progress readout.
function fmtClock(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
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

// Live render of the title card the video will carry, drawn with the same
// painting code as the recording so what's reviewed is what's posted. The aspect
// matches the destination (16:9 YouTube, 9:16 TikTok, 1:1 Instagram).
const CARD_DIMS: Record<Aspect, { w: number; h: number }> = {
  '16:9': { w: 640, h: 360 },
  '9:16': { w: 405, h: 720 },
  '1:1': { w: 640, h: 640 },
};

// The queueing steps shown while a reviewed track records, uploads and drafts.
const QUEUE_STEP_LABELS: Record<'recording' | 'uploading' | 'drafting', string> = {
  recording: 'Record',
  uploading: 'Upload',
  drafting: 'Draft metadata',
};

function CardThumb({
  song,
  show,
  musicalKey: key,
  client,
  aspect = '16:9',
  className,
}: {
  song: string;
  show: string;
  // Named `musicalKey` (not `key`) — `key` is reserved by React and never
  // reaches a component as a prop.
  musicalKey: string;
  client: string | null;
  aspect?: Aspect;
  className?: string;
}) {
  const dims = CARD_DIMS[aspect];
  // Painted onto an offscreen canvas and shown as an image: this sidesteps any
  // ref-attachment timing (a stray `key`-less ref left the card blank) and gives
  // a crisp, DPI-independent preview in both the modals and the platform mocks.
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const canvas = document.createElement('canvas');
    canvas.width = dims.w;
    canvas.height = dims.h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const card = { ...defaultCardState({ song, artist: show, client, key }), aspect };
    const paint = (logo: HTMLImageElement | null) => {
      if (cancelled) return;
      try {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawCard(ctx, canvas.width, canvas.height, card, logo);
        setSrc(canvas.toDataURL('image/png'));
      } catch {
        // If a font/roundRect is unsupported, fall back to the navy placeholder.
      }
    };
    paint(null);
    loadCardLogo().then((logo) => paint(logo)).catch(() => undefined);
    return () => { cancelled = true; };
  }, [song, show, key, client, aspect, dims.w, dims.h]);
  const ratio = aspect === '16:9' ? '16 / 9' : aspect === '9:16' ? '9 / 16' : '1 / 1';
  return src ? (
    <img src={src} alt={`${song} title card`} className={cn('rounded-lg border border-gray-200', className)} />
  ) : (
    <div className={cn('rounded-lg border border-gray-200 bg-[#1B0057]', className)} style={{ aspectRatio: ratio }} />
  );
}

// How the finished post will look on each platform, rendered from the same
// title card and the same description/caption skeletons the pipeline produces.
// This is the "check it before it goes out" view for YouTube, TikTok, Instagram.
const PLATFORM_META = {
  youtube: { label: 'YouTube', aspect: '16:9' as Aspect },
  tiktok: { label: 'TikTok', aspect: '9:16' as Aspect },
  instagram: { label: 'Instagram', aspect: '1:1' as Aspect },
} as const;

function PlatformPreview({ track, onClose }: { track: DeliveredTrack; onClose: () => void }) {
  const { data: products = [] } = useShopProducts();
  const [platform, setPlatform] = useState<'youtube' | 'tiktok' | 'instagram'>('youtube');
  const shopUrl = shopSongUrl(products, { song: track.song, show: track.show });
  const cleanedShow = track.show.replace(/^\s*from\s+/i, '').trim();
  const caption = [
    `${track.song} — piano backing track${cleanedShow ? ` (from ${cleanedShow})` : ''}`,
    shopUrl ? `Download: ${shopUrl}` : `Order yours (any song, your key): ${SITE}/form-page`,
    'Follow @pianobackingsbydaniele',
    '#pianobackingtrack #backingtrack #auditioncut',
  ].join('\n');
  const description = descriptionSkeleton({
    song: track.song,
    show: track.show,
    key: keyForDisplay(track.key ?? ''),
    firstName: firstNameOf(track.client),
    shopUrl,
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#1C0357]">Preview — {track.song}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1.5">
          {(['youtube', 'tiktok', 'instagram'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(p)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                platform === p
                  ? 'border-[#1C0357] bg-[#1C0357] text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              )}
            >
              {PLATFORM_META[p].label}
            </button>
          ))}
        </div>

        <div className="flex justify-center py-1">
          {platform === 'youtube' && <YouTubeMock track={track} description={description} />}
          {platform === 'tiktok' && <TikTokMock track={track} caption={caption} />}
          {platform === 'instagram' && <InstagramMock track={track} caption={caption} />}
        </div>

        <p className="text-[11px] text-gray-400">
          {shopUrl
            ? 'Your live shop link is included. The AI writes the final wording to this structure.'
            : 'No active shop listing — captions point to the custom-order form. Add it to the shop for a one-click buy link.'}
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function YouTubeMock({ track, description }: { track: DeliveredTrack; description: string }) {
  const cleanedShow = track.show.replace(/^\s*from\s+/i, '').trim();
  const title = `${track.song} — Audition Cut${cleanedShow ? ` (from ${cleanedShow})` : ''}`;
  return (
    <div className="w-full max-w-sm overflow-hidden rounded-xl border border-gray-200 bg-white text-left">
      <CardThumb song={track.song} show={track.show} musicalKey={track.key ?? ''} client={track.client} aspect="16:9" className="w-full rounded-none border-0" />
      <div className="space-y-1.5 p-3">
        <p className="text-sm font-semibold leading-snug text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">Piano Backings by Daniele · 0 views · just now</p>
        <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-2.5 text-[11px] leading-relaxed text-gray-700">
          {description}
        </pre>
      </div>
    </div>
  );
}

function TikTokMock({ track, caption }: { track: DeliveredTrack; caption: string }) {
  return (
    <div className="relative w-[260px] overflow-hidden rounded-2xl border-4 border-black bg-black">
      <CardThumb song={track.song} show={track.show} musicalKey={track.key ?? ''} client={track.client} aspect="9:16" className="w-full rounded-none border-0" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
        <p className="text-xs font-semibold text-white">@pianobackingsbydaniele</p>
        <p className="mt-0.5 whitespace-pre-line text-[11px] leading-snug text-white/95">{caption}</p>
        <p className="mt-1.5 flex items-center gap-1 text-[10px] text-white/80">
          <Music2 className="h-3 w-3" /> original sound — Piano Backings by Daniele
        </p>
      </div>
      <div className="pointer-events-none absolute bottom-20 right-2 flex flex-col items-center gap-4 text-white">
        <Heart className="h-5 w-5" />
        <MessageCircle className="h-5 w-5" />
        <Send className="h-5 w-5" />
      </div>
    </div>
  );
}

function InstagramMock({ track, caption }: { track: DeliveredTrack; caption: string }) {
  return (
    <div className="w-full max-w-xs overflow-hidden rounded-xl border border-gray-200 bg-white text-left">
      <div className="flex items-center gap-2 p-2.5">
        <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-[#F538BC] to-[#1C0357]" />
        <p className="text-xs font-semibold text-gray-900">pianobackingsbydaniele</p>
      </div>
      <CardThumb song={track.song} show={track.show} musicalKey={track.key ?? ''} client={track.client} aspect="1:1" className="w-full rounded-none border-0" />
      <div className="flex items-center gap-3 p-2.5">
        <Heart className="h-5 w-5 text-gray-800" />
        <MessageCircle className="h-5 w-5 text-gray-800" />
        <Send className="h-5 w-5 text-gray-800" />
      </div>
      <div className="px-2.5 pb-3">
        <p className="whitespace-pre-line text-xs leading-snug text-gray-700">
          <span className="font-semibold text-gray-900">pianobackingsbydaniele</span> {caption}
        </p>
      </div>
    </div>
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
  progress,
  onNext,
}: {
  requestId: string | null;
  onClose: () => void;
  onQueued: () => void;
  // Set only in "vett backlog" mode: shows the position in the walkthrough and
  // advances to the next track after each queue instead of closing.
  progress?: { index: number; total: number };
  onNext?: () => void;
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
  const [recording, setRecording] = useState<ClipProgress | null>(null);

  if (requestId && !track) return null;

  const shopMatch = shopProductForTrack(shopProducts, { song: title.trim(), show: show.trim() });
  const shopUrl = shopSongUrl(shopProducts, { song: title.trim(), show: show.trim() });
  const description = descriptionSkeleton({
    song: title.trim(),
    show,
    key: keyForDisplay(key),
    firstName: firstNameOf(track?.client ?? ''),
    shopUrl,
  });

  // Nudges for the details that make a post complete — surfaced right where the
  // owner approves, so gaps get fixed instead of shipping.
  const checklist: { label: string; ok: boolean; note: string }[] = [
    { label: 'Song title', ok: !!title.trim(), note: 'Needed for the card and title' },
    { label: 'Show / Artist', ok: !!show.trim(), note: 'Shown as “from …”' },
    { label: 'Key', ok: !!key, note: 'Recorded on the card and description' },
    {
      label: 'Shop listing',
      ok: shopMatch?.is_active === true,
      note: shopMatch
        ? shopMatch.is_active === false
          ? 'Draft — activate it in Shop to link it'
          : 'Linked'
        : 'No listing — the description points to the order form',
    },
  ];

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
      if (onNext) onNext();
      else onClose();
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

      setRecording({ loaded: 0, total: decoded.duration || 6 });
      setPhase('recording');
      const fade = 1.1;
      const blob = await recordCanvasClip({
        canvas: cv,
        duration: decoded.duration || 6,
        audio: { context, source },
        fps: 30,
        onProgress: setRecording,
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

      // Queue YouTube as the primary video and track TikTok/Instagram teasers
      // alongside it so the board shows progress on every platform. The teasers
      // stay as drafts — posting them waits on the platform integrations.
      const platforms = ['youtube', 'tiktok', 'instagram'] as const;
      const { error: pubErr } = await supabase
        .from('publications')
        .insert(platforms.map((platform) => ({ asset_id: asset.id, platform, status: 'draft' })));
      if (pubErr) throw new Error(pubErr.message || "Couldn't create the publications.");

      setPhase('drafting');
      // Draft each platform's caption. Only the YouTube row is required — a
      // missing teaser caption shouldn't block the video being queued.
      for (const platform of ['youtube', 'tiktok', 'instagram'] as const) {
        const { error: draftErr } = await supabase.functions.invoke('draft-publication-metadata', {
          body: { asset_id: asset.id, platform },
        });
        if (draftErr && platform === 'youtube') throw draftErr;
      }

      onQueued();
      if (onNext) onNext();
      else onClose();
      toast({ title: 'Queued for YouTube + TikTok/Instagram teasers — needs approval' });
    } catch (e) {
      setPhase('review');
      toast({ title: 'Could not queue this track', description: await getFunctionErrorMessage(e), variant: 'destructive' });
    }
  };

  return (
    <Dialog open={!!requestId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-[#1C0357]">
            Review & queue for YouTube
            {progress && (
              <span className="ml-2 text-sm font-normal text-gray-400">
                {progress.index + 1} of {progress.total}
              </span>
            )}
          </DialogTitle>
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

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="mb-2 text-xs font-semibold text-gray-500">Before you queue</p>
                <ul className="space-y-1.5">
                  {checklist.map((item) => (
                    <li key={item.label} className="flex items-start gap-2 text-xs">
                      {item.ok ? (
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
                      ) : (
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                      )}
                      <span>
                        <span className={cn('font-medium', item.ok ? 'text-gray-600' : 'text-gray-800')}>{item.label}</span>
                        <span className="text-gray-400"> — {item.note}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Title card</Label>
                <CardThumb
                  song={title}
                  show={show}
                  musicalKey={key}
                  client={track.client}
                  className="w-full rounded-none border-0"
                />
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
        {phase !== 'review' && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              {(['recording', 'uploading', 'drafting'] as const).map((step, i) => {
                const order = ['recording', 'uploading', 'drafting'];
                const current = order.indexOf(phase);
                const state = i < current ? 'done' : i === current ? 'active' : 'todo';
                return (
                  <div key={step} className="flex flex-1 items-center gap-2">
                    <span
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                        state === 'done' && 'bg-[#1C0357] text-white',
                        state === 'active' && 'bg-[#F538BC] text-white',
                        state === 'todo' && 'bg-gray-200 text-gray-500',
                      )}
                    >
                      {state === 'done' ? '✓' : i + 1}
                    </span>
                    <span className={cn('text-xs font-medium', state === 'active' ? 'text-[#1C0357]' : 'text-gray-400')}>
                      {QUEUE_STEP_LABELS[step]}
                    </span>
                    {i < 2 && <span className="h-px min-w-2 flex-1 bg-gray-200" />}
                  </div>
                );
              })}
            </div>

            {phase === 'recording' && (
              <>
                <Progress value={recording && recording.total ? (recording.loaded / recording.total) * 100 : 0} />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>
                    Recording the title card
                    {recording && recording.total
                      ? ` — ${Math.round((recording.loaded / recording.total) * 100)}%`
                      : '…'}
                  </span>
                  {recording && recording.total > 0 && (
                    <span className="tabular-nums">
                      {fmtClock(recording.loaded)} / {fmtClock(recording.total)}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400">
                  The card is recorded over the full track length in real time. Keep this open — it finishes on its own.
                </p>
              </>
            )}
            {phase === 'uploading' && (
              <p className="text-sm text-gray-500">Uploading the recorded video to storage…</p>
            )}
            {phase === 'drafting' && (
              <p className="text-sm text-gray-500">Drafting the AI metadata for YouTube, TikTok and Instagram…</p>
            )}
          </div>
        )}
        <DialogFooter>
          {onNext && (
            <Button variant="ghost" onClick={onNext} disabled={phase !== 'review'}>
              Skip this track
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={phase !== 'review'}>
            {onNext ? 'Stop vetting' : 'Cancel'}
          </Button>
          <Button
            onClick={approve}
            disabled={phase !== 'review' || !title.trim()}
            className="bg-[#1C0357] hover:bg-[#1C0357]/90"
          >
            {allowSocials ? (onNext ? 'Approve & next' : 'Approve & queue') : 'Save as not for socials'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}