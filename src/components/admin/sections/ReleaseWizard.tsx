import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle, ArrowLeft, ArrowRight, CalendarClock, Check, CheckCircle2, Loader2, Store, X, Zap,
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn, getFunctionErrorMessage } from '@/lib/utils';
import { PLATFORM_LABELS, type PublicationPlatform, type PublicationWithAsset } from '@/types/publishing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useDeliveredTracks, useShopProducts, type DeliveredTrack } from '@/hooks/useDeliveredTracks';
import { KEY_OPTIONS, keyForDisplay } from '@/utils/musicalKeys';
import { renderCardToBlob } from '@/utils/titleCard';
import { shopProductForTrack, shopSongUrl } from '@/utils/shopLink';
import type { ClipProgress } from '@/utils/canvasRecorder';
import {
  listTrackInShop, queueTrackForRelease, saveRequestKey, type ReleasePhase,
} from '@/utils/releaseTrack';
import {
  groupPublications, when, type PushMode, type PushOutcome, type TrackGroup,
} from '@/utils/publishingPipeline';
import SheetMusicDrop from '@/components/admin/SheetMusicDrop';
import { ShopListingDialog } from '@/components/admin/ShopListingDialog';
import { invalidateShopProducts } from '@/lib/shop-queries';

// ---------------------------------------------------------------------------
// The song flow.
//
// Opened from a song on the Songs list, it picks up wherever that song has got
// to and walks it the rest of the way. Four stops:
//
//   1. Check details — what goes on the card. Skipped once the videos exist.
//   2. Make videos   — three videos recorded and uploaded, hands off.
//   3. Captions      — the copy, read and edited in one place.
//   4. Send          — into the shop first, then socials: now, or the next slot.
//
// Nothing is posted before the last step, and the last step refuses to post a
// song that isn't in the shop. Everything it does is the same machinery the rest
// of the page uses, via utils/releaseTrack — not a second path.
// ---------------------------------------------------------------------------

const STEPS = ['Check details', 'Make videos', 'Captions', 'Send'] as const;

type WizardStep = 'loading' | 'details' | 'making' | 'captions' | 'send' | 'done';

// The limits YouTube and the platforms apply. The drafting function already
// slices to these, so a counter here stops the owner trimming into a rejection.
const LIMITS = {
  ytTitle: 100,
  ytDescription: 5000,
  caption: 2200,
} as const;

const PLATFORMS: PublicationPlatform[] = ['youtube', 'tiktok', 'instagram'];

const PHASE_LABELS: { id: ReleasePhase; label: string }[] = [
  { id: 'recording', label: 'Recording the videos' },
  { id: 'uploading', label: 'Uploading them' },
  { id: 'drafting', label: 'Writing the captions' },
];

// A value that settles before it is used — the title card is a canvas render, so
// running it on every keystroke makes typing feel sluggish.
function useDebounced<T>(value: T, delay = 250): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return settled;
}

// Where the owner is in the flow, spelled out. Numbered dots alone didn't say
// what "step 2" was.
function StepCrumbs({ index }: { index: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-semibold">
      {STEPS.map((label, i) => {
        const state = i < index ? 'done' : i === index ? 'active' : 'todo';
        return (
          <li key={label} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden className="text-gray-300">›</span>}
            <span
              className={cn(
                'flex items-center gap-2',
                state === 'active' && 'text-[#F538BC]',
                state === 'done' && 'text-[#1C0357]',
                state === 'todo' && 'text-gray-400'
              )}
              aria-current={state === 'active' ? 'step' : undefined}
            >
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-[11px]',
                  state === 'active' && 'bg-[#F538BC] text-white',
                  state === 'done' && 'bg-[#1C0357] text-white',
                  state === 'todo' && 'bg-gray-100 text-gray-400'
                )}
              >
                {state === 'done' ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// One header for every step, so the nav, the heading and the way out never drift
// apart between screens. The heading takes focus on arrival, which is what moves
// a keyboard or screen-reader user with the screen.
function StepShell({
  index,
  title,
  blurb,
  headingRef,
  onExit,
  exitLabel,
  exitDisabled,
  children,
}: {
  index: number;
  title: string;
  blurb: string;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  /** Omitted when there is nothing safe to leave behind. */
  onExit?: () => void;
  exitLabel?: string;
  exitDisabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl border-none bg-white shadow-sm">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <StepCrumbs index={index} />
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              disabled={exitDisabled}
              className="-mr-1 flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <X className="h-3.5 w-3.5" /> {exitLabel ?? 'Exit'}
            </button>
          )}
        </div>
        <div className="space-y-1.5">
          <CardTitle
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-bold text-[#1C0357] outline-none sm:text-3xl"
          >
            {title}
          </CardTitle>
          <p className="max-w-3xl text-base leading-relaxed text-gray-500">{blurb}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">{children}</CardContent>
    </Card>
  );
}

type CaptionDraft = { title: string; description: string; caption: string };
const emptyDraft = (): CaptionDraft => ({ title: '', description: '', caption: '' });

// Statuses that mean the video already holds a slot (or is going out now).
const BOOKED = ['scheduled', 'publishing'];

export function ReleaseWizard({
  requestId,
  queue,
  groups,
  nextSlotLabel,
  autoOn,
  tz,
  onPush,
  onRefresh,
  onSaveCaption,
  onSaveCopy,
  onClose,
}: {
  /** The song to work on. The wizard picks up wherever that song has got to. */
  requestId: string;
  queue: PublicationWithAsset[];
  groups: TrackGroup[];
  nextSlotLabel: string;
  /** Settings → Auto-post. Off means a booked teaser won't post on its own. */
  autoOn: boolean;
  tz: string;
  onPush: (group: TrackGroup, mode: PushMode) => Promise<PushOutcome>;
  /** Refreshes the publications query and hands back the fresh rows. */
  onRefresh: () => Promise<PublicationWithAsset[]>;
  onSaveCaption: (pub: PublicationWithAsset, caption: string) => Promise<void>;
  onSaveCopy: (pub: PublicationWithAsset, next: { title: string; description: string }) => Promise<void>;
  /** Back to the Songs list. */
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tracks, isLoading: tracksLoading } = useDeliveredTracks();
  const { data: products } = useShopProducts();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const [step, setStep] = useState<WizardStep>('loading');
  const [phase, setPhase] = useState<ReleasePhase>('recording');
  const [progress, setProgress] = useState<ClipProgress | null>(null);
  // Which button is running, so the other one can say it's waiting.
  const [busy, setBusy] = useState<false | 'work' | PushMode>(false);
  const [error, setError] = useState<string | null>(null);

  // Details, seeded from the chosen song.
  const [title, setTitle] = useState('');
  const [show, setShow] = useState('');
  const [key, setKey] = useState('');

  // Banner label (card top strip). Defaults from track type.
  const [bannerLabel, setBannerLabel] = useState('Audition Cut');
  const [detailSave, setDetailSave] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const lastSavedRef = useRef('');

  // Captions, held here so one button can approve all three.
  const [drafts, setDrafts] = useState<Record<PublicationPlatform, CaptionDraft>>({
    youtube: emptyDraft(),
    tiktok: emptyDraft(),
    instagram: emptyDraft(),
  });

  // Whether the card/teasers should include the client's name.
  const [showClientName, setShowClientName] = useState(true);
  const [reviewingShop, setReviewingShop] = useState(false);

  const [sent, setSent] = useState<{ song: string; slot: string; mode: PushMode; summary: string } | null>(
    null
  );

  // The song is held in state, not re-derived on every render: once it is
  // recorded its rows exist and the delivered-tracks query refetches, and the
  // flow must not lose its place in between.
  const [current, setCurrent] = useState<DeliveredTrack | null>(null);

  const rowsFor = (id: string) => queue.filter((p) => p.content_assets?.request_id === id);
  const group = groups.find((g) => g.requestId === requestId) ?? null;

  // The shop listing for the song as it is titled on screen, so a rename in the
  // first step doesn't create a second listing.
  const shopTrack = current
    ? { ...current, song: title.trim() || current.song, show: show.trim() }
    : null;
  const listed = shopTrack ? shopProductForTrack(products ?? [], shopTrack) : null;

  useEffect(() => {
    if (step !== 'loading') headingRef.current?.focus();
  }, [step]);

  // Open on the song once it is in hand. The first render can land before the
  // tracks query resolves, so this waits for it rather than giving up.
  const startedRef = useRef<string | null>(null);
  useEffect(() => {
    if (startedRef.current === requestId) return;
    const track = (tracks ?? []).find((t) => t.requestId === requestId);
    if (!track) return;
    startedRef.current = requestId;
    setCurrent(track);
    setTitle(track.song);
    setShow(track.show);
    setKey(track.key ?? '');
    lastSavedRef.current = `${track.song}\u0001${track.show}\u0001${track.key ?? ''}`;
    setDetailSave('idle');
    setError(null);
    setShowClientName(true);
    // Already recorded? Then there is nothing to make — go straight to the
    // captions, which is where a recorded song is vetted.
    const rows = rowsFor(track.requestId);
    if (rows.length) {
      seedDrafts(rows, track.requestId);
      setStep('captions');
    } else {
      setDrafts({ youtube: emptyDraft(), tiktok: emptyDraft(), instagram: emptyDraft() });
      setStep('details');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, tracks]);

  // Writes the Check step's three fields back to the request. Shared by the
  // autosave and Save & exit, so leaving always stores what is on screen.
  const persistDetails = async (t: string, s: string, k: string) => {
    if (!current) return;
    const cleanTitle = t.trim();
    const cleanShow = s.trim();
    const updates: { song_title?: string; musical_or_artist?: string } = {};
    if (cleanTitle && cleanTitle !== current.song) updates.song_title = cleanTitle;
    if (cleanShow !== current.show) updates.musical_or_artist = cleanShow;
    if (Object.keys(updates).length) {
      const { error: upErr } = await supabase
        .from('backing_requests')
        .update(updates)
        .eq('id', current.requestId);
      if (upErr) throw upErr;
    }
    // A key chosen here is a fix, not a preference — record it on the request so
    // the board, the card and the copy all agree.
    if (k && k !== (current.key ?? '')) await saveRequestKey(current, k);
    lastSavedRef.current = `${cleanTitle}\u0001${cleanShow}\u0001${k}`;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['delivered_tracks'] }),
      queryClient.invalidateQueries({ queryKey: ['request_info', current.requestId] }),
    ]);
  };

  const detailsSnapshot = useDebounced(`${title}\u0001${show}\u0001${key}`, 700);

  useEffect(() => {
    if (step !== 'details' || !current) return;
    // Only the settled edit is saved, so typing a title costs one write.
    if (detailsSnapshot === lastSavedRef.current) return;
    const [t, s, k] = detailsSnapshot.split('\u0001');
    let cancelled = false;
    setDetailSave('saving');
    persistDetails(t, s, k)
      .then(() => {
        if (!cancelled) setDetailSave('saved');
      })
      .catch(() => {
        if (!cancelled) setDetailSave('error');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailsSnapshot, step, current]);

  // Step 1 → step 2: record everything.
  const makeIt = async () => {
    if (!current) return;
    setStep('making');
    setBusy('work');
    setError(null);
    setPhase('recording');
    try {
      // Belt and braces: a second tab could have recorded this one meanwhile.
      const { data: existing } = await supabase
        .from('publications')
        .select('id, content_assets!inner(request_id)')
        .eq('content_assets.request_id', current.requestId)
        .in('status', ['draft', 'pending_approval', 'approved', 'scheduled', 'publishing', 'published'])
        .limit(1)
        .maybeSingle();
      if (existing) {
        throw new Error('This song already has videos — go back to the list and open it again.');
      }
      if (!current.key && key) {
        await saveRequestKey(current, key);
        await queryClient.invalidateQueries({ queryKey: ['delivered_tracks'] });
      }
      await queueTrackForRelease({
        track: current,
        title,
        show,
        key,
        includeClientName: showClientName,
        banner: bannerLabel,
        onPhase: setPhase,
        onProgress: setProgress,
      });
      const fresh = await onRefresh();
      seedDrafts(fresh, current.requestId);
      setStep('captions');
    } catch (e) {
      setError(await getFunctionErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const seedDrafts = (rows: PublicationWithAsset[], id: string) => {
    const mine = rows.filter((p) => p.content_assets?.request_id === id);
    const next: Record<PublicationPlatform, CaptionDraft> = {
      youtube: emptyDraft(),
      tiktok: emptyDraft(),
      instagram: emptyDraft(),
    };
    for (const row of mine) {
      next[row.platform] = {
        title: String(row.metadata?.title ?? ''),
        description: String(row.metadata?.description ?? ''),
        caption: String(row.metadata?.caption ?? ''),
      };
    }
    setDrafts(next);
  };

  // Writes back only what actually changed, so approving an untouched caption
  // costs nothing.
  const flushDrafts = async (rows: PublicationWithAsset[]) => {
    for (const platform of PLATFORMS) {
      const row = rows.find((r) => r.platform === platform);
      if (!row) continue;
      const draft = drafts[platform];
      if (platform === 'youtube') {
        const currentTitle = String(row.metadata?.title ?? '');
        const currentDescription = String(row.metadata?.description ?? '');
        if (draft.title !== currentTitle || draft.description !== currentDescription) {
          await onSaveCopy(row, { title: draft.title, description: draft.description });
        }
      } else if (draft.caption !== String(row.metadata?.caption ?? '')) {
        await onSaveCaption(row, draft.caption);
      }
    }
  };

  // Step 3 → step 4: keep any edits, then move on.
  const approveCaptions = async () => {
    if (!current) return;
    if (rowsFor(current.requestId).some((r) => r.platform === 'youtube') && !drafts.youtube.description.trim()) {
      setError('The YouTube description is empty — write a line or two (it carries the shop link).');
      return;
    }
    setBusy('work');
    setError(null);
    try {
      await flushDrafts(rowsFor(current.requestId));
      await onRefresh();
      setStep('send');
    } catch (e) {
      setError(await getFunctionErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  // Leaving mid-flow shouldn't lose captions that were typed and not approved.
  const saveAndExit = async () => {
    if (current && step === 'captions') {
      try {
        await flushDrafts(rowsFor(current.requestId));
        await onRefresh();
        toast({ title: 'Saved', description: `${title || current.song} is waiting under “Review & send”.` });
      } catch {
        // Best effort — the rows are already recorded either way.
      }
    }
    onClose();
  };

  // Check step: keep what was typed on the request, then leave.
  const saveDetailsAndExit = async () => {
    if (!current) return onClose();
    setBusy('work');
    setError(null);
    try {
      await persistDetails(title, show, key);
      toast({ title: 'Saved', description: `${title || current.song} keeps these details.` });
      onClose();
    } catch (e) {
      setError(await getFunctionErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  // The shop comes first. A draft listing is switched on; a missing one is
  // created live. Socials are only touched once this has succeeded.
  const ensureInShop = async (): Promise<boolean> => {
    if (!shopTrack) return false;
    if (listed?.is_active) return false;
    if (listed) {
      const { error: actErr } = await supabase.from('products').update({ is_active: true }).eq('id', listed.id);
      if (actErr) throw actErr;
    } else {
      await listTrackInShop(shopTrack, { active: true, includeClientName: showClientName });
    }
    await invalidateShopProducts(queryClient);
    return true;
  };

  // Step 4: shop first, then socials — now, or the next slot.
  const send = async (mode: PushMode) => {
    if (!current) return;
    setBusy(mode);
    setError(null);
    try {
      const fresh = await onRefresh();
      const g =
        groupPublications(fresh).find((x) => x.requestId === current.requestId) ?? group;
      if (!g) throw new Error('This song has no videos yet — go back and make them.');
      const addedToShop = await ensureInShop();
      const outcome = await onPush(g, mode);
      // A failed send must not read as "out the door". Hold here with the reason.
      if (!outcome.ok) {
        setError(
          addedToShop
            ? `It’s in the shop now, but sending failed: ${outcome.summary}`
            : outcome.summary
        );
        return;
      }
      setSent({
        song: title || current.song,
        slot: outcome.slot ?? '',
        mode: outcome.mode,
        summary: outcome.summary,
      });
      setStep('done');
    } catch (e) {
      setError(await getFunctionErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  // --------------------------------------------------------------- loading
  if (step === 'loading' || !current) {
    const missing = !tracksLoading && !(tracks ?? []).some((t) => t.requestId === requestId);
    return (
      <Card className="rounded-2xl border-none bg-white shadow-sm">
        <CardContent className="space-y-4 p-6">
          <p className="text-sm text-gray-500">
            {missing ? 'That song isn’t in the delivered list any more.' : 'Opening the song…'}
          </p>
          <Button onClick={onClose} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> All songs
          </Button>
        </CardContent>
      </Card>
    );
  }

  // -------------------------------------------------------------- details
  if (step === 'details') {
    return (
      <StepShell
        index={0}
        title="Check the details"
        blurb="This is what goes on the title card and in the captions. Edits save as you go. Nothing is posted from here."
        headingRef={headingRef}
        onExit={onClose}
        exitLabel="All songs"
      >
        <div className="grid gap-5 md:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <div className="flex items-center gap-2 rounded-xl border border-gray-100 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-500">
                  {showClientName && current.client ? `Ordered by ${current.client}` : 'Delivered request'}
                </p>
                <p className="mt-0.5 text-[11px] text-gray-400">
                  The name goes on the card, teasers and captions — leave it on unless you want it
                  omitted.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={showClientName} onCheckedChange={(v) => setShowClientName(v)} />
                <span className="text-xs text-gray-500">Show name</span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="wiz-song">Song title</Label>
                <Input
                  id="wiz-song"
                  className="h-11 text-base"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && title.trim() && key) makeIt();
                  }}
                  placeholder="Song name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wiz-show">Show or artist</Label>
                <Input id="wiz-show" className="h-11 text-base" value={show} onChange={(e) => setShow(e.target.value)} placeholder="from the show" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Key</Label>
              <div
                className={cn(
                  'rounded-xl p-1 transition-colors',
                  !key && 'bg-amber-50 ring-1 ring-amber-200',
                )}
              >
                <KeySelect value={key} onChange={setKey} />
              </div>
              <p className={cn('text-xs', key ? 'text-gray-400' : 'font-medium text-amber-700')}>
                {key
                  ? 'Read it off the sheet and it should match. The key goes on the card.'
                  : 'Read the key off the sheet music, then pick it here. The card needs it.'}
              </p>
            </div>

            <div className="space-y-2 border-t border-gray-100 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="wiz-banner2">Card banner</Label>
                <Input
                  id="wiz-banner2"
                  className="h-11 text-base"
                  value={bannerLabel}
                  onChange={(e) => setBannerLabel(e.target.value)}
                  placeholder="e.g. Audition Cut, Note Bash, Melody Bash"
                />
                <p className="text-[11px] text-gray-400">Appears at the top of the title card. Defaults from track type.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={makeIt}
                  disabled={!title.trim() || !key}
                  title={!key ? 'Pick the key first — it goes on the card.' : undefined}
                  className="bg-[#1C0357] hover:bg-[#1C0357]/90"
                >
                  Looks right — make the videos <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={saveDetailsAndExit} disabled={busy !== false}>
                  Save &amp; exit
                </Button>
              </div>
              <span className="flex items-center gap-1.5 text-[11px]">
                {detailSave === 'saving' ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                    <span className="text-gray-500">Saving…</span>
                  </>
                ) : detailSave === 'saved' ? (
                  <>
                    <Check className="h-3 w-3 text-green-600" />
                    <span className="text-gray-500">Saved — you can leave any time</span>
                  </>
                ) : detailSave === 'error' ? (
                  <span className="text-amber-700">Not saved — use Save &amp; exit</span>
                ) : !key ? (
                  <span className="font-medium text-amber-700">Pick a key to continue</span>
                ) : null}
              </span>
            </div>
          </div>

          <aside className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sheet music</p>
              <SheetMusicDrop requestId={current.requestId} compact />
              <p className="text-[11px] text-gray-400">Optional. Attach it here to read the key from.</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">The card</p>
              <div className="flex flex-col items-center gap-2 rounded-xl bg-gray-50 p-3">
                <TitleCardThumb title={title} show={show} client={showClientName ? current.client : ''} musicalKey={key} banner={bannerLabel} />
                <p className="text-center text-[11px] text-gray-400">
                  {bannerLabel}
                  {key ? ` · ${keyForDisplay(key)}` : ''}
                  {title ? ` · ${title}` : ''}
                  {show ? ` · from ${show}` : ''}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </StepShell>
    );
  }

  // --------------------------------------------------------------- making
  if (step === 'making') {
    const pct = progress && progress.total ? (progress.loaded / progress.total) * 100 : 0;
    const at = PHASE_LABELS.findIndex((p) => p.id === phase);
    return (
      <StepShell
        index={1}
        title={`Making the videos for “${title}”`}
        blurb="Three files: a wide one for YouTube, and two vertical ones for TikTok and Instagram. It runs in real time — leave this tab open and it finishes on its own. Nothing is posted yet."
        headingRef={headingRef}
      >
        <ul className="space-y-2.5" aria-live="polite">
          {PHASE_LABELS.map((p, i) => {
            const state = i < at ? 'done' : i === at ? 'active' : 'todo';
            return (
              <li key={p.id} className="flex items-center gap-2.5 text-sm">
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    state === 'done' && 'bg-[#1C0357] text-white',
                    state === 'active' && 'bg-[#F538BC] text-white',
                    state === 'todo' && 'bg-gray-100 text-gray-400'
                  )}
                >
                  {state === 'done' ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className={cn(state === 'todo' ? 'text-gray-400' : 'font-medium text-[#1C0357]')}>
                  {p.label}
                </span>
                {state === 'active' && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#F538BC]" />}
              </li>
            );
          })}
        </ul>

        {phase === 'recording' && (
          <>
            <Progress value={pct} />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{pct ? `${Math.round(pct)}%` : 'Starting…'}</span>
              <span className="tabular-nums">
                {progress ? `${Math.round(progress.loaded)}s / ${Math.round(progress.total)}s` : ''}
              </span>
            </div>
          </>
        )}

        {error && (
          <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={makeIt} disabled={busy !== false}>Try again</Button>
              <Button size="sm" variant="ghost" onClick={() => setStep('details')} disabled={busy !== false}>
                Back
              </Button>
            </div>
          </div>
        )}
      </StepShell>
    );
  }

  // ------------------------------------------------------------- captions
  if (step === 'captions') {
    const rows = rowsFor(current.requestId);
    const editor = (platform: PublicationPlatform, props: { hint: string }) => {
      const row = rows.find((r) => r.platform === platform);
      if (!row) return null;
      const draft = drafts[platform];
      const set = (patch: Partial<CaptionDraft>) =>
        setDrafts((all) => ({ ...all, [platform]: { ...all[platform], ...patch } }));
      return (
        <CopyEditor
          key={platform}
          platform={platform}
          published={['published', 'publishing'].includes(row.status)}
          draft={draft}
          hint={props.hint}
          onChange={set}
        />
      );
    };

    return (
      <StepShell
        index={2}
        title={`Read the captions for “${title}”`}
        blurb="The videos are made. Read and edit the words that go out with them. Nothing is posted until the next step."
        headingRef={headingRef}
        onExit={saveAndExit}
        exitLabel="Save & exit"
      >
        {!rows.length && (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            The rows haven’t appeared yet — they will once the queue refreshes.
          </p>
        )}
        {editor('youtube', { hint: 'The full video' })}
        {editor('tiktok', { hint: 'The full-length vertical cut' })}
        {editor('instagram', { hint: 'The 30-second Reel' })}

        {error && (
          <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={approveCaptions} disabled={busy !== false} className="bg-[#1C0357] hover:bg-[#1C0357]/90">
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Captions look good <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <span className="text-[11px] text-gray-400">Your edits are saved when you carry on.</span>
        </div>
      </StepShell>
    );
  }

  // ----------------------------------------------------------------- send
  if (step === 'send') {
    const shopListingUrl = shopTrack ? shopSongUrl(products ?? [], shopTrack) : null;
    const yt = group?.yt;
    const bookedFor =
      yt && (BOOKED.includes(yt.status) || (yt.status === 'approved' && yt.scheduled_for))
        ? yt.scheduled_for
        : null;
    const ytLive = yt?.status === 'published';
    const shopState: 'live' | 'draft' | 'none' = listed?.is_active ? 'live' : listed ? 'draft' : 'none';
    return (
      <StepShell
        index={3}
        title={`Send “${title}”`}
        blurb="It goes into the shop first, then out to YouTube, TikTok and Instagram. Choose now or the next slot."
        headingRef={headingRef}
        onExit={onClose}
        exitLabel="All songs"
        exitDisabled={busy !== false}
      >
        {/* 1 — the shop. Required: nothing goes to socials until it can be bought. */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">1 · The shop</p>
          <div
            className={cn(
              'flex flex-wrap items-center justify-between gap-3 rounded-xl p-3',
              shopState === 'live' ? 'bg-green-50' : 'bg-gray-50'
            )}
          >
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-medium text-[#1C0357]">
                {shopState === 'live' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Store className="h-4 w-4 text-[#F538BC]" />
                )}
                {shopState === 'live'
                  ? 'In the shop'
                  : shopState === 'draft'
                    ? 'Shop listing is a hidden draft'
                    : 'Not in the shop yet'}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                {shopState === 'live'
                  ? 'Done. The YouTube description links to it.'
                  : shopState === 'draft'
                    ? 'It will be switched live before anything is posted.'
                    : 'It will be listed live at $6.99, with the title card as the cover, before anything is posted.'}
              </p>
            </div>
            {shopState === 'live' && shopListingUrl ? (
              <a
                href={shopListingUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-xs font-medium text-[#1C0357] underline"
              >
                View listing
              </a>
            ) : shopState === 'none' ? (
              <Button size="sm" variant="outline" onClick={() => setReviewingShop(true)} disabled={busy !== false}>
                Change price or copy first
              </Button>
            ) : null}
          </div>
        </div>

        {/* 2 — socials. Two plain buttons, each saying exactly what it does. */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">2 · Socials</p>
          {ytLive || bookedFor ? (
            <p className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800">
              {ytLive
                ? 'The YouTube video is already live. Sending posts whatever hasn’t gone out yet.'
                : `Already scheduled for ${when(bookedFor, tz)}. Your caption edits are saved — or send it now instead.`}
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2 rounded-xl border border-gray-200 p-3">
              <Button
                size="lg"
                onClick={() => send('now')}
                disabled={busy !== false}
                className="w-full bg-[#F538BC] hover:bg-[#F538BC]/90"
              >
                {busy === 'now' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                {busy === 'now' ? 'Sending…' : 'Send now'}
              </Button>
              <p className="text-xs text-gray-500">
                YouTube goes public straight away. Instagram posts now; TikTok posts now (or on the
                browser poster’s next pass, within a few minutes).
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-gray-200 p-3">
              <Button
                size="lg"
                variant="outline"
                onClick={() => (bookedFor ? onClose() : send('schedule'))}
                disabled={busy !== false || ytLive}
                className="w-full border-[#1C0357] text-[#1C0357]"
              >
                {busy === 'schedule' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CalendarClock className="mr-2 h-4 w-4" />
                )}
                {busy === 'schedule'
                  ? 'Scheduling…'
                  : bookedFor
                    ? 'Keep the booked slot'
                    : 'Schedule for the next slot'}
              </Button>
              <p className="text-xs text-gray-500">
                {bookedFor ? (
                  <>Leaves it on <strong>{when(bookedFor, tz)}</strong>.</>
                ) : (
                  <>
                    Goes out on <strong>{nextSlotLabel || 'your next free slot'}</strong>, video and
                    teasers together.
                  </>
                )}
              </p>
              {!autoOn && !ytLive && (
                <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 p-2 text-[11px] text-amber-800">
                  <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                  Auto-post is off, so on the slot only YouTube goes out — TikTok and Instagram
                  wait. Turn on Auto-post in Publishing → Settings, or use Send now.
                </p>
              )}
            </div>
          </div>
        </div>

        {error && (
          <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={() => setStep('captions')} disabled={busy !== false}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to captions
          </Button>
        </div>

        <ShopListingDialog
          track={reviewingShop ? shopTrack : null}
          open={reviewingShop}
          onOpenChange={(o) => !o && setReviewingShop(false)}
        />
      </StepShell>
    );
  }

  // ----------------------------------------------------------------- done
  return (
    <Card className="rounded-2xl border-none bg-white shadow-sm">
      <CardContent className="space-y-5 p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
            <Check className="h-5 w-5 text-green-700" />
          </span>
          <div>
            <p className="text-lg font-bold text-[#1C0357]">
              {sent?.song ?? 'Song'} is in the shop and{' '}
              {sent?.mode === 'now' ? 'going out now' : 'scheduled'}
            </p>
            <p className="text-xs text-gray-500">
              {sent?.mode === 'now'
                ? 'Give it a few minutes to appear on each platform.'
                : `Goes out ${sent?.slot || nextSlotLabel || 'on the next free slot'}.`}
            </p>
          </div>
        </div>
        {sent?.summary ? (
          <p className="rounded-xl bg-gray-50 p-3 text-xs text-gray-600">{sent.summary}</p>
        ) : null}
        <Button size="lg" onClick={onClose} className="bg-[#1C0357] hover:bg-[#1C0357]/90">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to all songs
        </Button>
      </CardContent>
    </Card>
  );
}

// --------------------------------------------------------------- helpers

// A key picker that keeps whatever the request already had, so a value that isn't
// in the standard list is still selectable and doesn't get silently rewritten.
function KeySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Choose a key" />
      </SelectTrigger>
      <SelectContent>
        {value && !KEY_OPTIONS.some((o) => o.value === value) && (
          <SelectItem value={value}>{value} — from the request</SelectItem>
        )}
        {KEY_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// A 1:1 render of the card, so the details step shows what the video will look
// like without a separate preview route.
function TitleCardThumb({
  title,
  show,
  client,
  musicalKey,
  banner,
}: {
  title: string;
  show: string;
  client: string;
  musicalKey: string;
  banner?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);

  // Re-render once the typing settles rather than on every keystroke.
  const settled = useDebounced(`${title}|${show}|${client}|${musicalKey}|${banner ?? ''}`, 250);
  const [song, artist, who, key, b] = settled.split('|');

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    renderCardToBlob({ song, artist, client: who, key, banner: b || undefined }, '1:1')
      .then((blob) => {
        if (cancelled || !blob) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [song, artist, who, key, b]);

  return (
    <div className="h-20 w-20 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-300" />
        </div>
      )}
    </div>
  );
}

// One platform's copy, with a counter at the platform's limit. Everything is
// controlled by the wizard so a single button can save and approve all three.
function CopyEditor({
  platform,
  draft,
  hint,
  published,
  onChange,
}: {
  platform: PublicationPlatform;
  draft: CaptionDraft;
  hint: string;
  published: boolean;
  onChange: (patch: Partial<CaptionDraft>) => void;
}) {
  const isYouTube = platform === 'youtube';
  const badge =
    platform === 'youtube'
      ? 'border-red-200 bg-red-50 text-red-700'
      : platform === 'instagram'
        ? 'border-pink-200 bg-pink-50 text-pink-700'
        : 'border-gray-200 bg-gray-50 text-gray-600';

  return (
    <div className="space-y-3 rounded-xl border border-gray-100 p-3">
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className={cn('font-semibold', badge)}>
          {PLATFORM_LABELS[platform]}
        </Badge>
        <span className="text-[11px] text-gray-400">
          {published ? 'Already out — editing updates it' : hint}
        </span>
      </div>

      {isYouTube ? (
        <>
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor={`wiz-yt-title`}>Video title</Label>
              <Counter value={draft.title.length} max={LIMITS.ytTitle} />
            </div>
            <Input
              id={`wiz-yt-title`}
              value={draft.title}
              maxLength={LIMITS.ytTitle}
              onChange={(e) => onChange({ title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor={`wiz-yt-desc`}>Description</Label>
              <Counter value={draft.description.length} max={LIMITS.ytDescription} />
            </div>
            <textarea
              id={`wiz-yt-desc`}
              value={draft.description}
              maxLength={LIMITS.ytDescription}
              onChange={(e) => onChange({ description: e.target.value })}
              rows={6}
              className="w-full rounded-lg border border-gray-200 p-3 text-sm leading-relaxed text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#F538BC]/40"
            />
          </div>
        </>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <Label htmlFor={`wiz-${platform}-caption`}>Caption</Label>
            <Counter value={draft.caption.length} max={LIMITS.caption} />
          </div>
          <textarea
            id={`wiz-${platform}-caption`}
            value={draft.caption}
            maxLength={LIMITS.caption}
            onChange={(e) => onChange({ caption: e.target.value })}
            rows={5}
            placeholder="Write the caption that goes with the post…"
            className="w-full rounded-lg border border-gray-200 p-3 text-sm leading-relaxed text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#F538BC]/40"
          />
        </div>
      )}
    </div>
  );
}

function Counter({ value, max }: { value: number; max: number }) {
  const over = value > max;
  const near = !over && value > max * 0.9;
  return (
    <span
      className={cn(
        'text-[10px] tabular-nums',
        over ? 'font-semibold text-red-600' : near ? 'text-amber-600' : 'text-gray-400'
      )}
    >
      {value}/{max}
    </span>
  );
}
