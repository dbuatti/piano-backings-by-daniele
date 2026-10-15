import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn, getErrorMessage, getFunctionErrorMessage } from '@/lib/utils';
import { PLATFORM_LABELS, STATUS_LABELS, type PublicationWithAsset, type PublishingSettings } from '@/types/publishing';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AlertCircle, Ban, CheckCircle2, Download, ExternalLink, Eye, FileText, Heart, Library, ListPlus, Loader2, Mail, MessageCircle, MoreHorizontal, Music2, PlusCircle, RefreshCw, RotateCcw, Send } from 'lucide-react';
import TrackInfoDialog from '@/components/admin/TrackInfoDialog';
import { useShopProducts, useDeliveredTracks, type DeliveredTrack } from '@/hooks/useDeliveredTracks';
import { SITE, shopProductForTrack, shopSongUrl } from '@/utils/shopLink';
import { KEY_OPTIONS, keyForDisplay } from '@/utils/musicalKeys';
import { CARD_DIMS, type Aspect, defaultCardState, drawCard, firstNameOf, loadCardLogo } from '@/utils/titleCard';
import { type ClipProgress } from '@/utils/canvasRecorder';
import { assetFilename, signedAssetDownloadUrl } from '@/utils/assetDownload';
import { listTrackInShop, queueTrackForRelease, rerecordTeasers, saveRequestKey } from '@/utils/releaseTrack';
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
  | 'missing_key'
  | 'hidden';

const BOARD_STATS: { key: BoardFilter; label: string; short: string; hint: string }[] = [
  { key: 'all', label: 'All delivered', short: 'All', hint: 'Every delivered track that can be posted. Exclusive and not-for-socials tracks live under Hidden.' },
  { key: 'not_on_youtube', label: 'Not queued', short: 'Not queued', hint: 'No video queued yet, allowed on socials and not exclusive.' },
  { key: 'on_youtube', label: 'Live on YouTube', short: 'Live', hint: 'Confirmed public on YouTube.' },
  { key: 'missing_key', label: 'Missing key', short: 'Missing key', hint: 'The request has no key recorded — the title card needs one.' },
  { key: 'in_shop', label: 'In shop', short: 'Live', hint: 'Live shop listings — the public shop page is reachable.' },
  { key: 'shop_draft', label: 'Shop draft', short: 'Draft', hint: 'Saved to the shop but not activated — needs review.' },
  { key: 'no_shop', label: 'No shop listing', short: 'Not listed', hint: 'Not in the shop yet.' },
  { key: 'hidden', label: 'Hidden', short: 'Hidden', hint: 'Exclusive ownership or marked not for socials. These are never posted.' },
];

// Two questions the owner asks at different times — "is it out yet?" and "is it in
// the shop?" — so the filters are shown as two rows instead of one wall of pills.
const STAT_GROUPS: { label: string; keys: BoardFilter[] }[] = [
  { label: 'Posting', keys: ['all', 'not_on_youtube', 'on_youtube', 'missing_key'] },
  { label: 'Shop & visibility', keys: ['in_shop', 'shop_draft', 'no_shop', 'hidden'] },
];

// How close a delivered track is to being postable. It decides the section a song
// lands in, so the board reads top-down: do this, then this, then nothing.
type Readiness = 'ready' | 'needs_key' | 'queued' | 'live' | 'hidden';

// In order — most actionable first, which is also the tie-break used inside a
// section when a song has more than one order.
const READINESS_SECTIONS: { key: Readiness; label: string; hint: string }[] = [
  { key: 'ready', label: 'Ready to queue', hint: 'Everything a post needs is here — open one and Review & queue.' },
  { key: 'needs_key', label: 'Needs a key', hint: 'Record the musical key on the request and it can be queued.' },
  { key: 'queued', label: 'In the queue', hint: 'Booked or waiting on you — the Pipeline tab shows what needs a press.' },
  { key: 'live', label: 'Live', hint: 'Already published.' },
  { key: 'hidden', label: 'Hidden', hint: 'Exclusive or not for socials. Shown only because you opened this filter.' },
];

const PENDING_STATUSES = ['draft', 'pending_approval', 'approved', 'scheduled', 'publishing'];

function readinessOf(t: DeliveredTrack, pubs: PublicationWithAsset[]): Readiness {
  // Never postable, whatever state the pipeline is in.
  if (t.isExclusive || t.noSocials) return 'hidden';
  // Mid-pipeline comes before live: a song whose video is scheduled but whose
  // teasers already went out is still "in the queue", not finished.
  if (pubs.some((p) => PENDING_STATUSES.includes(p.status))) return 'queued';
  if (pubs.some((p) => p.status === 'published')) return 'live';
  if (!t.key) return 'needs_key';
  return 'ready';
}

const sectionRankOf = (rows: { readiness: Readiness }[]) =>
  Math.min(...rows.map((r) => READINESS_SECTIONS.findIndex((s) => s.key === r.readiness)));

const songKeyOf = (t: DeliveredTrack) => `${t.song.trim().toLowerCase()}|${t.show.trim().toLowerCase()}`;

// Delivered tracks → one row each showing progress across every platform: is it
// in the shop, what's up on YouTube, are teaser drafts queued for TikTok/IG,
// and is it marked "never post". Review & queue opens the vetting dialog that
// records the title card with the verified title/key before queuing.
export default function ReleaseBoard({
  queue,
  tz,
  onMutation,
  onBacklog,
  onOpenTrack,
  onQueueTrack,
}: {
  queue: PublicationWithAsset[];
  tz: string;
  onMutation: () => void;
  // Reports how many delivered tracks still have no YouTube video, so the
  // cadence card above can forecast when the backlog will finish.
  onBacklog?: (count: number) => void;
  // Opens the per-song page for a track already in the queue.
  onOpenTrack?: (pub: PublicationWithAsset) => void;
  // Hands a song to the release wizard instead of opening the dialog inline —
  // the wizard is the friendlier way to do the same job, so the row is the index
  // and the wizard is the work.
  onQueueTrack?: (requestId: string) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tracks, isLoading, error } = useDeliveredTracks();
  const { data: products = [] } = useShopProducts();
  const [vetting, setVetting] = useState<string | null>(null);
  const [reRecording, setReRecording] = useState<string | null>(null);
  const [listing, setListing] = useState<string | null>(null);
  const [filter, setFilter] = useState<BoardFilter>('all');
  const [previewing, setPreviewing] = useState<DeliveredTrack | null>(null);
  const [inspecting, setInspecting] = useState<DeliveredTrack | null>(null);
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
      // Shared with the release wizard, so a listing made there and one made
      // here are identical.
      const { created } = await listTrackInShop(t);
      await queryClient.invalidateQueries({ queryKey: ['shop_products'] });
      toast(
        created
          ? { title: 'Saved as a shop draft', description: `${t.song} is ready for review — open Shop to check it and activate the listing.` }
          : { title: 'Already in the shop', description: `${t.song} already has a listing, so nothing was added.` }
      );
    } catch (e) {
      toast({ title: "Couldn't list the track", description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setListing(null);
    }
  };

  // A published teaser can't be re-recorded in place — the row still points at
  // the post TikTok already holds. Resetting forgets that reference (and any
  // failure note) so the track can be recorded and posted again. Nothing is
  // deleted from TikTok itself; that has to happen in the app.
  const resetTeaser = async (t: DeliveredTrack) => {
    if (
      !window.confirm(
        `Reset the TikTok/Instagram teaser rows for "${t.song}"? You'll need to record and post them again. Anything already posted on TikTok is not deleted — remove it in the TikTok app.`
      )
    ) {
      return;
    }
    try {
      const { data: rows, error } = await supabase
        .from('publications')
        .select('id, content_assets!inner(request_id)')
        .eq('content_assets.request_id', t.requestId)
        .in('platform', ['tiktok', 'instagram']);
      if (error) throw error;
      const ids = (rows ?? []).map((r) => r.id);
      if (!ids.length) throw new Error('No TikTok or Instagram row found for this track.');
      const { error: updErr } = await supabase
        .from('publications')
        .update({
          status: 'pending_approval',
          platform_post_id: null,
          published_at: null,
          // Clear the slot too — the song page's reset does, and leaving a stale
          // one behind made the row look booked until the next arming pass.
          scheduled_for: null,
          error: null,
        })
        .in('id', ids);
      if (updErr) throw updErr;
      await queryClient.invalidateQueries({ queryKey: ['publications_queue'] });
      onMutation();
      toast({
        title: 'Teaser row reset',
        description: `${t.song} can be re-recorded and posted again.`,
      });
    } catch (e) {
      toast({ title: "Couldn't reset the teaser", description: getErrorMessage(e), variant: 'destructive' });
    }
  };

  // Saves the exact teaser file to disk, so its audio can be checked in a real
  // player rather than trusting the in-app preview (which is a re-render).
  const downloadTeaser = async (pub: PublicationWithAsset, song: string) => {
    try {
      const url = await signedAssetDownloadUrl(pub, song);
      const a = document.createElement('a');
      a.href = url;
      a.download = assetFilename(song, pub.content_assets?.mime_type);
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      toast({
        title: "Couldn't prepare the download",
        description: getErrorMessage(e),
        variant: 'destructive',
      });
    }
  };

  const pubsForTrack = (song: string, requestId: string, show: string) => {
    const songLc = song.trim().toLowerCase();
    const showLc = show.trim().toLowerCase();
    return queue.filter((p) => {
      const a = p.content_assets;
      if (!a) return false;
      // The request is the identity, and it wins outright. The song+show match
      // is only a legacy fallback for assets recorded before request_id existed
      // — mixing the two made two orders of the same song ("How it ends" was
      // ordered twice) wear each other's publications, and made the row with no
      // video look queued.
      if (a.request_id) return a.request_id === requestId;
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
      readiness: readinessOf(t, pubs),
    };
  });

  type BoardRow = (typeof boardRows)[number];
  const rowMatches = (key: BoardFilter, row: BoardRow): boolean => {
    // Exclusive / not-for-socials tracks are never postable, so they sit outside
    // every working filter and surface only under Hidden.
    if (key === 'hidden') return row.readiness === 'hidden';
    if (row.readiness === 'hidden') return false;
    switch (key) {
      case 'in_shop': return row.shopProduct?.is_active === true;
      case 'shop_draft': return !!row.shopProduct && row.shopProduct.is_active === false;
      case 'no_shop': return !row.shopProduct;
      case 'on_youtube': return row.yt?.status === 'published';
      case 'not_on_youtube': return !row.yt;
      case 'missing_key': return !row.t.key;
      default: return true;
    }
  };

  const audit = BOARD_STATS.reduce((acc, { key }) => {
    acc[key] = boardRows.filter((row) => rowMatches(key, row)).length;
    return acc;
  }, {} as Record<BoardFilter, number>);

  const visibleRows = boardRows.filter((row) => rowMatches(filter, row));

  // The un-queued backlog for the "Review & queue all" walkthrough. One video per
  // song: a track ordered twice ("How it ends") queues once, and the order that
  // still needs a video is the one offered.
  const notOnYoutubeIds: string[] = [];
  {
    const seen = new Set<string>();
    for (const row of boardRows) {
      if (!rowMatches('not_on_youtube', row)) continue;
      const key = songKeyOf(row.t);
      if (seen.has(key)) continue;
      seen.add(key);
      notOnYoutubeIds.push(row.t.requestId);
    }
  }
  const [bulkVet, setBulkVet] = useState<{ ids: string[]; index: number } | null>(null);

  // Fold the orders of one song under a single heading, then file that song into
  // the most actionable state any of its orders is in. So the board never lists
  // one song twice, and never buries a song that still needs work.
  const songGroups: { key: string; song: string; show: string; rows: BoardRow[] }[] = [];
  for (const row of visibleRows) {
    const key = songKeyOf(row.t);
    const found = songGroups.find((g) => g.key === key);
    if (found) found.rows.push(row);
    else songGroups.push({ key, song: row.t.song, show: row.t.show, rows: [row] });
  }
  const sections = READINESS_SECTIONS.map((section, i) => ({
    ...section,
    groups: songGroups
      .filter((g) => sectionRankOf(g.rows) === i)
      .map((g) => ({
        ...g,
        rows: [...g.rows].sort(
          (a, b) =>
            READINESS_SECTIONS.findIndex((s) => s.key === a.readiness) -
            READINESS_SECTIONS.findIndex((s) => s.key === b.readiness)
        ),
      })),
  })).filter((section) => section.groups.length > 0);

  // At-a-glance progress: how much of the catalogue is queued and listed.
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
    const track = tracks.find((t) => t.requestId === requestId);
    if (!track || !value || savingKey) return;
    setSavingKey(requestId);
    try {
      await saveRequestKey(track, value);
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
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
          <div className="min-w-0 space-y-0.5">
            <CardTitle className="text-lg font-bold text-[#1C0357]">Release board</CardTitle>
            <p className="text-xs text-gray-500">
              Every delivered track, grouped by what it needs next. Start here when you have
              half an hour to queue songs.
            </p>
          </div>
          {!isLoading && tracks && (
            <div className="shrink-0 text-right text-xs text-gray-500">
              <p>
                <span className="text-xl font-bold tabular-nums text-[#1C0357]">
                  {audit.not_on_youtube}
                </span>{' '}
                still to queue
              </p>
              <p className="mt-0.5">
                {audit.on_youtube} live · {queuedYt} scheduled
                {nextUpload ? ` · next ${whenLabel(nextUpload, tz)}` : ''}
              </p>
              <p className="mt-0.5 text-gray-400">
                {audit.in_shop} in the shop
                {audit.shop_draft > 0 ? `, ${audit.shop_draft} draft` : ''}
                {audit.hidden > 0 ? ` · ${audit.hidden} hidden` : ''}
              </p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading || !tracks ? (
          <p className="px-4 py-6 text-sm text-gray-400">Loading tracks…</p>
        ) : tracks.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-400">
            No delivered backing tracks yet — upload a finished recording into the{' '}
            <span className="font-mono text-xs">tracks</span> bucket and it will appear here.
          </p>
        ) : (
          <>
            {/* Two questions the owner asks at different times — is it out yet,
                and is it in the shop — so the filters read as two rows, not one
                wall of pills. */}
            <div className="space-y-2">
              {STAT_GROUPS.map((g) => (
                <div key={g.label} className="flex flex-wrap items-center gap-1.5">
                  <span className="w-28 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    {g.label}
                  </span>
                  {g.keys.map((k) => {
                    const s = BOARD_STATS.find((x) => x.key === k);
                    if (!s) return null;
                    const active = filter === k;
                    const count = audit[k];
                    // An empty filter is just noise — hide it unless it's the
                    // one you're already looking at.
                    if (k !== 'all' && count === 0 && !active) return null;
                    const isGap = !active && count > 0 && ['no_shop', 'not_on_youtube', 'missing_key'].includes(k);
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setFilter(active && k !== 'all' ? 'all' : k)}
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
                        {s.short}
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
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {notOnYoutubeIds.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBulkVet({ ids: notOnYoutubeIds, index: 0 })}
                  title="Opens them one at a time so you and the wizard can vet each song. Nothing posts until you approve it."
                  className="gap-1.5"
                >
                  <ListPlus className="h-3.5 w-3.5" /> Review &amp; queue all ({notOnYoutubeIds.length})
                </Button>
              )}
              {filter !== 'all' && (
                <span className="text-[11px] text-gray-500">
                  Showing {visibleRows.length} · {BOARD_STATS.find((s) => s.key === filter)?.label}
                </span>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={emailAudit}
                disabled={emailing}
                title="Emails you a digest of what's still missing — not on YouTube, not in the shop, or without a key."
                className="ml-auto gap-1.5 text-gray-600"
              >
                <Mail className="h-3.5 w-3.5" /> {emailing ? 'Sending…' : 'Email me the gaps'}
              </Button>
            </div>
            {sections.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400">Nothing here — try another filter.</p>
            ) : (
              sections.map((section) => (
                <div key={section.key} className="border-t border-gray-100 pt-3 pb-3 first:border-t-0 first:pt-0">
                  <div className="mb-2 flex flex-wrap items-baseline gap-x-2 px-1">
                    <h3 className="text-sm font-bold text-[#1C0357]">{section.label}</h3>
                    <span className="rounded-full bg-gray-100 px-1.5 text-[11px] font-semibold tabular-nums text-gray-600">
                      {section.groups.reduce((n, g) => n + g.rows.length, 0)}
                    </span>
                    <span className="text-[11px] text-gray-400">{section.hint}</span>
                  </div>
                  {section.groups.map((group) => (
                    <div
                      key={group.key}
                      className={cn('rounded-xl', group.rows.length > 1 && 'mb-2 bg-gray-50/70 p-2')}
                    >
                      {group.rows.length > 1 && (
                        <p className="mx-1 mb-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-800">
                          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
                          <span>
                            {group.rows.length} orders of this song — one video covers the order that
                            still needs it. The others aren’t queued again.
                          </span>
                        </p>
                      )}
                      {group.rows.map(({ t, yt, tt, ig, shopProduct, shopUrl, queuedForYoutube }) => {
                        const teaserWithFile =
                          (tt?.content_assets?.storage_path ? tt : null) ??
                          (ig?.content_assets?.storage_path ? ig : null);
                        // Any row at all means the song has a page in the pipeline.
                        const anyPub = yt ?? tt ?? ig;
                        return (
                      <div key={t.requestId} className="rounded-xl border border-gray-100 p-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
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
                    {/* Absent is the normal state and the action button says it,
                        so only the two states worth a chip get one. */}
                    {shopProduct?.is_active && (
                      <a
                        href={shopUrl ?? '/shop'}
                        target="_blank"
                        rel="noreferrer"
                        title="Live in the shop"
                        className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 font-medium text-green-700 hover:bg-green-100"
                      >
                        Shop live <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {shopProduct && !shopProduct.is_active && (
                      <span
                        className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700"
                        title="Saved to the shop but not active yet"
                      >
                        Shop draft
                      </span>
                    )}
                  </div>

                  {/* One visible action for the gap that needs closing, then
                      everything optional lives behind the ⋯ menu. */}
                  <div className="ml-auto flex shrink-0 items-center gap-1.5">
                    {!shopProduct && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => listProduct(t)}
                        disabled={listing !== null}
                        title="Create a draft shop listing from this track — review and activate it in Admin → Shop."
                      >
                        {listing === t.requestId
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <PlusCircle className="h-3.5 w-3.5" />}
                        Add to shop
                      </Button>
                    )}
                    {!queuedForYoutube && (
                      <Button
                        size="sm"
                        className="bg-[#1C0357] hover:bg-[#1C0357]/90"
                        disabled={t.noSocials || t.isExclusive}
                        onClick={() => (onQueueTrack ? onQueueTrack(t.requestId) : setVetting(t.requestId))}
                        title={t.isExclusive ? 'Exclusive ownership — not for public sharing' : undefined}
                      >
                        <ListPlus className="h-3.5 w-3.5" /> Review &amp; queue
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="px-2" title="More actions for this track">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-60">
                        {anyPub && onOpenTrack ? (
                          <DropdownMenuItem onSelect={() => onOpenTrack(anyPub)}>
                            <Library className="h-3.5 w-3.5" /> Open song page
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem onSelect={() => setInspecting(t)}>
                          <FileText className="h-3.5 w-3.5" /> Sheet music &amp; details
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setPreviewing(t)}>
                          <Eye className="h-3.5 w-3.5" /> Preview posts
                        </DropdownMenuItem>
                        {(tt || ig) && (
                          <DropdownMenuItem onSelect={() => setReRecording(t.requestId)}>
                            <RefreshCw className="h-3.5 w-3.5" /> Re-record teaser
                          </DropdownMenuItem>
                        )}
                        {teaserWithFile && (
                          <DropdownMenuItem onSelect={() => downloadTeaser(teaserWithFile, t.song)}>
                            <Download className="h-3.5 w-3.5" /> Download teaser
                          </DropdownMenuItem>
                        )}
                        {tt && tt.status === 'published' && (
                          <DropdownMenuItem onSelect={() => resetTeaser(t)}>
                            <RotateCcw className="h-3.5 w-3.5" /> Reset teaser
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => toggleNoSocials(t.requestId, t.noSocials)}>
                          {t.noSocials ? <RotateCcw className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                          {t.noSocials ? 'Allow on socials' : 'Never post to socials'}
                        </DropdownMenuItem>
                        {shopProduct && !shopProduct.is_active && (
                          <DropdownMenuItem onSelect={() => activateProduct(shopProduct.id, t.song)}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Activate shop draft
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem asChild>
                          <Link to={`/admin?section=shop&view=repurpose&request=${encodeURIComponent(t.requestId)}`}>
                            <ExternalLink className="h-3.5 w-3.5" /> Edit shop details
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-400">
                  <Music2 className="h-3.5 w-3.5 shrink-0" />
                  <audio controls preload="none" src={t.url} className="h-9 w-full max-w-[320px]" />
                  {yt?.platform_post_id && (
                    <a
                      href={`https://youtu.be/${yt.platform_post_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 hover:text-[#1C0357] hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> Open on YouTube
                    </a>
                  )}
                  {tt?.status === 'failed' && (
                    <span className="font-medium text-red-500" title={tt.error || undefined}>
                      Teaser failed{tt.error ? `: ${tt.error}` : ''}
                    </span>
                  )}
                </div>
                      </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))
            )}
          </>
        )}
      </CardContent>

      {reRecording && (
        <VettingDialog
          key={`re-${reRecording}`}
          requestId={reRecording}
          onClose={() => setReRecording(null)}
          onQueued={onMutation}
          teaserOnly
        />
      )}

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
      <TrackInfoDialog
        track={inspecting}
        open={inspecting !== null}
        onOpenChange={(o) => !o && setInspecting(null)}
      />
    </Card>
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
  // Most of the catalogue has nothing on a given platform, and a wall of
  // "YouTube: —" chips tells the owner nothing. The row shows only what exists;
  // the section heading carries "not queued yet".
  if (!pub) return null;
  const failed = pub.status === 'failed';
  const stamp = pub.scheduled_for ? shortStamp(pub.scheduled_for, tz) : null;
  return (
    <Badge
      variant={pub.status === 'published' ? 'default' : 'outline'}
      className={cn(
        pub.status === 'published' && 'bg-green-100 text-green-700',
        failed && 'border-red-200 bg-red-50 text-red-600'
      )}
      title={`${label} · ${PLATFORM_LABELS[pub.platform]} · ${STATUS_LABELS[pub.status]}${
        pub.scheduled_for ? ` · ${whenLabel(pub.scheduled_for, tz)}` : ''
      }${pub.error ? ` — ${pub.error}` : ''}`}
    >
      {label}: {STATUS_LABELS[pub.status]}
      {stamp ? ` · ${stamp}` : ''}
    </Badge>
  );
}

// A short "Tue 20 Oct" for the chips; the full time lives in the tooltip so the
// row stays scannable.
function shortStamp(iso: string, tz: string) {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: tz,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(iso));
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
  youtube: { label: 'YouTube' },
  tiktok: { label: 'TikTok' },
  instagram: { label: 'Instagram' },
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
    <div className="relative w-full max-w-xs overflow-hidden rounded-xl border border-gray-200 bg-black">
      <CardThumb song={track.song} show={track.show} musicalKey={track.key ?? ''} client={track.client} aspect="9:16" className="w-full rounded-none border-0" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3 pt-10">
        <div className="mb-1.5 flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-[#F538BC] to-[#1C0357]" />
          <p className="text-xs font-semibold text-white">pianobackingsbydaniele</p>
        </div>
        <p className="max-h-24 overflow-hidden whitespace-pre-line text-[11px] leading-snug text-white/95">
          {caption}
        </p>
        <p className="mt-1.5 flex items-center gap-1 text-[10px] text-white/80">
          <Music2 className="h-3 w-3" /> original sound — Piano Backings by Daniele
        </p>
      </div>
      <div className="pointer-events-none absolute bottom-24 right-2 flex flex-col items-center gap-4 text-white">
        <Heart className="h-5 w-5" />
        <MessageCircle className="h-5 w-5" />
        <Send className="h-5 w-5" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vetting dialog: hear the track, confirm/correct title + key, mark it 'not for
// socials' if needed, then approve → records the title card and queues it for
// the YouTube approval pipeline.
// ---------------------------------------------------------------------------
export function VettingDialog({
  requestId,
  onClose,
  onQueued,
  progress,
  onNext,
  teaserOnly = false,
}: {
  requestId: string | null;
  onClose: () => void;
  onQueued: () => void;
  // Set only in "vett backlog" mode: shows the position in the walkthrough and
  // advances to the next track after each queue instead of closing.
  progress?: { index: number; total: number };
  onNext?: () => void;
  // Re-record only the TikTok/Instagram teaser: the YouTube row is untouched and
  // the existing teaser rows are moved onto the new recording.
  teaserOnly?: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tracks } = useDeliveredTracks();
  const { data: shopProducts = [] } = useShopProducts();
  const track = tracks?.find((t) => t.requestId === requestId) ?? null;

  // The hands-off-booking switch decides what "queued" means for the owner: a
  // video that will book itself, or one that waits for a press. Read from the
  // cache the publishing page already filled, so this needs no extra fetch.
  const bookAutomatically =
    queryClient.getQueryData<PublishingSettings>(['publishing_settings'])?.auto_book === true;

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
    if (existingRow && !teaserOnly) {
      toast({
        title: 'Already in the pipeline',
        description: 'This track already has a video in the queue or on the channel. Remove that row first if you want to re-record it.',
        variant: 'destructive',
      });
      return;
    }
    setPhase('recording');
    try {
      if (teaserOnly) {
        // Only the teaser rows move; the YouTube row is left exactly as it is.
        const { moved, tiktokMime } = await rerecordTeasers({
          track,
          title,
          show,
          key,
          onPhase: setPhase,
          onProgress: setRecording,
        });
        await queryClient.invalidateQueries({ queryKey: ['publications_queue'] });
        onQueued();
        if (onNext) onNext();
        else onClose();
        toast({
          title: moved
            ? `Teaser re-recorded — ${moved} TikTok/Instagram row${moved === 1 ? '' : 's'} reset to pending`
            : 'Teaser re-recorded — no teaser rows to update',
          description:
            tiktokMime === 'video/mp4'
              ? undefined
              : 'This browser could only record WebM, which TikTok cannot play. Use the latest Chrome or Safari to record an MP4.',
        });
        return;
      }

      // Records all three cuts, uploads them, creates the draft rows and drafts
      // their copy. Shared with the release wizard.
      await queueTrackForRelease({
        track,
        title,
        show,
        key,
        onPhase: setPhase,
        onProgress: setRecording,
      });

      onQueued();
      if (onNext) onNext();
      else onClose();
      toast({
        title: bookAutomatically
          ? 'Queued for YouTube + TikTok/Instagram teasers — it will be booked automatically'
          : 'Queued for YouTube + TikTok/Instagram teasers — needs approval',
      });
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
            {teaserOnly ? 'Re-record teaser' : 'Review & queue for YouTube'}
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
            {teaserOnly ? 'Record new teaser' : allowSocials ? (onNext ? 'Approve & next' : 'Approve & queue') : 'Save as not for socials'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}