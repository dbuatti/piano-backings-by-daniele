import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle, ArrowRight, Check, CheckCircle2, KeyRound, Lightbulb, Loader2, Music2, Play,
  Sparkles, Store, X,
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn, getErrorMessage, getFunctionErrorMessage } from '@/lib/utils';
import { PLATFORM_LABELS, type PublicationPlatform, type PublicationWithAsset } from '@/types/publishing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useDeliveredTracks, useShopProducts, type DeliveredTrack } from '@/hooks/useDeliveredTracks';
import { KEY_OPTIONS, keyForDisplay } from '@/utils/musicalKeys';
import { renderCardToBlob } from '@/utils/titleCard';
import { shopProductForTrack, shopSongUrl } from '@/utils/shopLink';
import type { ClipProgress } from '@/utils/canvasRecorder';
import {
  listTrackInShop, queueTrackForRelease, saveRequestKey, type ReleasePhase,
} from '@/utils/releaseTrack';
import type { TrackGroup } from '@/utils/publishingPipeline';

// ---------------------------------------------------------------------------
// The release wizard.
//
// The board answers "what's the state of everything?" — this answers "what do I
// do next?", one song at a time, in plain language. Four stops per song:
//
//   1. Check    — the details that go on the card. One button.
//   2. Make     — three videos recorded and uploaded, hands off.
//   3. Captions — the copy, read once and approved in one place.
//   4. Push     — book the slot, arm the teasers, list it in the shop.
//
// Everything it does is the same machinery the board and the pipeline use, via
// utils/releaseTrack — it is a friendlier way to drive them, not a second path.
// ---------------------------------------------------------------------------

const STEPS = ['Check', 'Make', 'Captions', 'Push'] as const;

type WizardStep = 'intro' | 'details' | 'making' | 'captions' | 'push' | 'done';

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
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold">
      {STEPS.map((label, i) => {
        const state = i < index ? 'done' : i === index ? 'active' : 'todo';
        return (
          <li key={label} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden className="text-gray-300">›</span>}
            <span
              className={cn(
                'flex items-center gap-1.5',
                state === 'active' && 'text-[#F538BC]',
                state === 'done' && 'text-[#1C0357]',
                state === 'todo' && 'text-gray-400'
              )}
              aria-current={state === 'active' ? 'step' : undefined}
            >
              <span
                className={cn(
                  'flex h-4 w-4 items-center justify-center rounded-full text-[9px]',
                  state === 'active' && 'bg-[#F538BC] text-white',
                  state === 'done' && 'bg-[#1C0357] text-white',
                  state === 'todo' && 'bg-gray-100 text-gray-400'
                )}
              >
                {state === 'done' ? <Check className="h-2.5 w-2.5" /> : i + 1}
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
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <StepCrumbs index={index} />
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              disabled={exitDisabled}
              className="-mr-1 flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <X className="h-3 w-3" /> {exitLabel ?? 'Exit'}
            </button>
          )}
        </div>
        <CardTitle
          ref={headingRef}
          tabIndex={-1}
          className="text-lg font-bold text-[#1C0357] outline-none"
        >
          {title}
        </CardTitle>
        <p className="text-sm leading-relaxed text-gray-500">{blurb}</p>
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}

type CaptionDraft = { title: string; description: string; caption: string };
const emptyDraft = (): CaptionDraft => ({ title: '', description: '', caption: '' });

export function ReleaseWizard({
  queue,
  groups,
  nextSlotLabel,
  onPush,
  onRefresh,
  onSaveCaption,
  onSaveCopy,
  onOpenBoard,
  onOpenPipeline,
  startRequestId,
  onStartConsumed,
}: {
  queue: PublicationWithAsset[];
  groups: TrackGroup[];
  nextSlotLabel: string;
  onPush: (group: TrackGroup) => Promise<void>;
  /** Refreshes the publications query and hands back the fresh rows. */
  onRefresh: () => Promise<PublicationWithAsset[]>;
  onSaveCaption: (pub: PublicationWithAsset, caption: string) => Promise<void>;
  onSaveCopy: (pub: PublicationWithAsset, next: { title: string; description: string }) => Promise<void>;
  onOpenBoard: () => void;
  onOpenPipeline: () => void;
  /** A song to begin on, when the wizard is opened from a board row. */
  startRequestId?: string | null;
  onStartConsumed?: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tracks } = useDeliveredTracks();
  const { data: products } = useShopProducts();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const [step, setStep] = useState<WizardStep>('intro');
  const [doneIds, setDoneIds] = useState<string[]>([]);
  const [phase, setPhase] = useState<ReleasePhase>('recording');
  const [progress, setProgress] = useState<ClipProgress | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Details, seeded from the chosen song.
  const [title, setTitle] = useState('');
  const [show, setShow] = useState('');
  const [key, setKey] = useState('');

  // Captions, held here so one button can approve all three.
  const [drafts, setDrafts] = useState<Record<PublicationPlatform, CaptionDraft>>({
    youtube: emptyDraft(),
    tiktok: emptyDraft(),
    instagram: emptyDraft(),
  });

  // Push choices.
  const [toShop, setToShop] = useState(true);
  const [shopLive, setShopLive] = useState(true);

  const [pushed, setPushed] = useState<{ song: string; slot: string; shop: boolean } | null>(null);

  // The song being worked on is held in state, not derived from the queue: once a
  // song is recorded its rows exist, so it drops out of `ready` mid-flow and a
  // derived "current" would vanish between the captions and push steps.
  const [current, setCurrent] = useState<DeliveredTrack | null>(null);

  const queuedRequestIds = useMemo(() => {
    const set = new Set<string>();
    for (const pub of queue) {
      if (pub.content_assets?.request_id) set.add(pub.content_assets.request_id);
    }
    return set;
  }, [queue]);

  // Songs this wizard can finish: not exclusive, allowed on socials, and with no
  // video yet. A song with no key can't be recorded, so it is counted separately
  // and offered a fix rather than being a dead end.
  const { ready, needsKey } = useMemo(() => {
    const open = (tracks ?? []).filter(
      (t) => !t.isExclusive && !t.noSocials && !queuedRequestIds.has(t.requestId)
    );
    const withKey: DeliveredTrack[] = [];
    const without: DeliveredTrack[] = [];
    for (const t of open) (t.key ? withKey : without).push(t);
    return { ready: withKey, needsKey: without };
  }, [tracks, queuedRequestIds]);

  // Recorded but not on their way yet: the pipeline is holding these, and they
  // would otherwise be invisible from here (they are not "ready", and not live).
  const waiting = useMemo(() => {
    const byRequest = new Map<string, PublicationWithAsset[]>();
    for (const pub of queue) {
      const id = pub.content_assets?.request_id;
      if (!id) continue;
      const bucket = byRequest.get(id);
      if (bucket) bucket.push(pub);
      else byRequest.set(id, [pub]);
    }
    let count = 0;
    for (const rows of byRequest.values()) {
      const onTheWay = rows.some((r) => ['scheduled', 'publishing', 'published'].includes(r.status));
      if (!onTheWay) count += 1;
    }
    return count;
  }, [queue]);

  // `ready` minus everything already handled in this sitting. Recomputed from the
  // freshest handled list so "next" is right immediately, before React re-renders.
  const upNext = ready.filter((t) => !doneIds.includes(t.requestId));
  const nextUp = upNext[0] ?? null;

  // Everything the wizard will accept: a keyless song is still workable (the key
  // is picked on the first screen and saved back to the request), so it is
  // openable too — it just isn't in the "ready" count yet.
  const openable = useMemo(() => [...ready, ...needsKey], [ready, needsKey]);

  // A song can be delivered twice; it must not be listed in the shop twice.
  const listed = current ? shopProductForTrack(products ?? [], current) : null;

  const rowsFor = (requestId: string) =>
    queue.filter((p) => p.content_assets?.request_id === requestId);

  useEffect(() => {
    if (step !== 'intro') headingRef.current?.focus();
  }, [step]);

  const begin = (track: DeliveredTrack) => {
    setCurrent(track);
    setTitle(track.song);
    setShow(track.show);
    setKey(track.key ?? '');
    setDrafts({ youtube: emptyDraft(), tiktok: emptyDraft(), instagram: emptyDraft() });
    setError(null);
    setToShop(true);
    setShopLive(true);
    setStep('details');
  };

  // Opened from a board row: begin on that song. Only consumed once the song is
  // actually in hand — the first render happens before the tracks query resolves,
  // and consuming an empty list would drop the request.
  const consumedStartRef = useRef<string | null>(null);
  useEffect(() => {
    if (!startRequestId || consumedStartRef.current === startRequestId) return;
    const track = openable.find((t) => t.requestId === startRequestId);
    if (!track) return;
    consumedStartRef.current = startRequestId;
    onStartConsumed?.();
    begin(track);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startRequestId, openable]);

  // Move to the next song, treating `id` as handled (pushed or skipped).
  const advancePast = (handledIds: string[]) => {
    setPushed(null);
    setError(null);
    const next = ready.filter((t) => !handledIds.includes(t.requestId))[0] ?? null;
    if (next) begin(next);
    else {
      setCurrent(null);
      setStep('intro');
    }
  };

  const goHome = () => {
    setCurrent(null);
    setPushed(null);
    setError(null);
    setStep('intro');
  };

  const markHandled = (id: string) => {
    const handled = doneIds.includes(id) ? doneIds : [...doneIds, id];
    setDoneIds(handled);
    return handled;
  };

  const startFromIntro = () => {
    if (nextUp) begin(nextUp);
  };

  // Step 1 → step 2: record everything.
  const makeIt = async () => {
    if (!current) return;
    setStep('making');
    setBusy(true);
    setError(null);
    setPhase('recording');
    try {
      // Belt and braces: the candidate list already excludes songs with rows, but
      // a second tab could have queued this one in the meantime.
      const { data: existing } = await supabase
        .from('publications')
        .select('id, content_assets!inner(request_id)')
        .eq('content_assets.request_id', current.requestId)
        .in('status', ['draft', 'pending_approval', 'approved', 'scheduled', 'publishing', 'published'])
        .limit(1)
        .maybeSingle();
      if (existing) {
        throw new Error('This song already has a video in the pipeline — check the full list.');
      }
      // A key chosen for a song that had none is a fix, not a preference — record
      // it on the request so the board, the card and the next queue all agree.
      if (!current.key && key) {
        await saveRequestKey(current, key);
        await queryClient.invalidateQueries({ queryKey: ['delivered_tracks'] });
      }
      await queueTrackForRelease({
        track: current,
        title,
        show,
        key,
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

  const seedDrafts = (rows: PublicationWithAsset[], requestId: string) => {
    const mine = rows.filter((p) => p.content_assets?.request_id === requestId);
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
    setBusy(true);
    setError(null);
    try {
      await flushDrafts(rowsFor(current.requestId));
      await onRefresh();
      setStep('push');
    } catch (e) {
      setError(await getFunctionErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  // Leaving mid-flow shouldn't lose captions that were typed and not approved.
  const saveAndExit = async () => {
    if (current && step !== 'details') {
      try {
        await flushDrafts(rowsFor(current.requestId));
        await onRefresh();
        toast({ title: 'Saved', description: `${title || current.song} is waiting on the full list.` });
      } catch {
        // Best effort — the rows are already recorded either way.
      }
    }
    goHome();
  };

  // Step 4: book the slot, arm the teasers, optionally list it in the shop.
  const push = async () => {
    if (!current) return;
    setBusy(true);
    setError(null);
    try {
      const group = groups.find((g) => g.requestId === current.requestId);
      if (!group) throw new Error('That song has no queued rows yet — go back and make it again.');
      await onPush(group);

      let shopped = false;
      if (toShop && !listed) {
        const res = await listTrackInShop(current, { active: shopLive });
        await queryClient.invalidateQueries({ queryKey: ['shop_products'] });
        shopped = res.created;
      }

      setPushed({ song: title || current.song, slot: nextSlotLabel, shop: shopped });
      setDoneIds((ids) => [...ids, current.requestId]);
      setStep('done');
      toast({
        title: 'Pushed',
        description: `${title || current.song} is queued${shopped ? ' and in the shop' : ''}.`,
      });
    } catch (e) {
      setError(await getFunctionErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  // ---------------------------------------------------------------- intro
  if (step === 'intro') {
    const total = upNext.length;
    const nothingToDo = total === 0;
    return (
      <div className="space-y-4">
        <Card className="rounded-2xl border-none bg-white shadow-sm">
          <CardHeader className="space-y-3">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-[#1C0357]">
              <Sparkles className="h-5 w-5 text-[#F538BC]" /> Get your songs out
            </CardTitle>
            <p className="text-sm leading-relaxed text-gray-500">
              {nothingToDo
                ? waiting > 0
                  ? 'Nothing new to record. The songs below are already made and just need approving.'
                  : 'Nothing is waiting to be pushed. Everything delivered is either on the way or already out.'
                : 'One song at a time. We check the details, make the videos, show you the captions, then push the song to YouTube, TikTok and Instagram — and into the shop. About a minute a song.'}
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-[#1C0357] p-4 text-white">
                <p className="text-3xl font-bold tabular-nums">{total}</p>
                <p className="text-xs text-white/70">ready to push</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-base font-bold leading-tight text-[#1C0357]">{nextSlotLabel || '—'}</p>
                <p className="text-xs text-gray-500">the next one goes out</p>
              </div>
              <div className={cn('rounded-xl p-4', needsKey.length ? 'bg-amber-50' : 'bg-gray-50')}>
                <p className={cn('text-3xl font-bold tabular-nums', needsKey.length ? 'text-amber-700' : 'text-[#1C0357]')}>
                  {needsKey.length}
                </p>
                <p className={cn('text-xs', needsKey.length ? 'text-amber-700' : 'text-gray-500')}>
                  need a key first
                </p>
              </div>
            </div>

            {doneIds.length > 0 && (
              <p className="flex items-center gap-2 text-xs text-green-700">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                {doneIds.length} done in this sitting.
              </p>
            )}

            {needsKey.length > 0 && <KeyFixer tracks={needsKey} />}

            {waiting > 0 && (
              <button
                type="button"
                onClick={onOpenPipeline}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-100 p-3 text-left transition-colors hover:bg-gray-50"
              >
                <span className="text-xs text-gray-600">
                  <strong className="font-semibold text-[#1C0357]">
                    {waiting === 1 ? 'One song is' : `${waiting} songs are`} recorded and waiting
                  </strong>{' '}
                  — approve {waiting === 1 ? 'it' : 'them'} in the pipeline to give {waiting === 1 ? 'it' : 'them'} a slot.
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              </button>
            )}

            {total > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Coming up</p>
                <ul className="space-y-1.5">
                  {upNext.slice(0, 3).map((t) => (
                    <li key={t.requestId} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <Music2 className="h-3.5 w-3.5 shrink-0 text-[#F538BC]" />
                        <span className="truncate font-medium text-[#1C0357]">{t.song}</span>
                        {t.show && <span className="truncate text-xs text-gray-400">{t.show}</span>}
                      </span>
                      <span className="shrink-0 text-[11px] text-gray-400">{keyForDisplay(t.key ?? '')}</span>
                    </li>
                  ))}
                </ul>
                {total > 3 && (
                  <p className="flex items-center gap-1.5 text-[11px] text-gray-400">
                    <Lightbulb className="h-3 w-3 shrink-0" /> and {total - 3} more after
                    {total - 3 === 1 ? '' : ' these'}.
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {nothingToDo ? (
                <Button size="lg" onClick={onOpenBoard} className="bg-[#1C0357] hover:bg-[#1C0357]/90">
                  See the full list
                </Button>
              ) : (
                <Button
                  size="lg"
                  disabled={!nextUp}
                  onClick={startFromIntro}
                  className="bg-[#1C0357] hover:bg-[#1C0357]/90"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start with “{nextUp?.song}”
                </Button>
              )}
              <Button variant="ghost" onClick={onOpenPipeline}>
                What's in the pipeline
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!current && step !== 'done') {
    return (
      <Card className="rounded-2xl border-none bg-white shadow-sm">
        <CardContent className="space-y-4 p-6">
          <p className="text-sm text-gray-500">No songs left to push in this sitting.</p>
          <Button onClick={goHome} variant="outline">
            Back to the start
          </Button>
        </CardContent>
      </Card>
    );
  }

  // -------------------------------------------------------------- details
  if (step === 'details' && current) {
    return (
      <StepShell
        index={0}
        title="Check this one"
        blurb="This is what goes on the video and the caption. Fix anything that’s wrong, then we make the videos."
        headingRef={headingRef}
        onExit={goHome}
        exitLabel="Exit"
      >
        <div className="rounded-xl border border-gray-100 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1C0357]">
            <Music2 className="h-4 w-4 text-[#F538BC]" />
            {current.client ? `Ordered by ${current.client}` : 'Delivered request'}
          </div>
          <audio controls preload="none" src={current.url} className="mt-2 h-9 w-full" />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="wiz-song">Song title</Label>
            <Input id="wiz-song" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Song name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wiz-show">Show or artist</Label>
            <Input id="wiz-show" value={show} onChange={(e) => setShow(e.target.value)} placeholder="from the show" />
          </div>
          <div className="space-y-1.5">
            <Label>Key</Label>
            <KeySelect value={key} onChange={setKey} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-700">Title card preview</p>
            <p className="truncate text-[11px] text-gray-400">
              {title || 'Song'} · {show ? `from ${show}` : 'no show'} · {keyForDisplay(key)}
            </p>
          </div>
          <div className="shrink-0">
            <TitleCardThumb title={title} show={show} client={current.client} musicalKey={key} />
          </div>
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
          {!key && <span className="text-[11px] font-medium text-amber-600">Pick a key first</span>}
          <Button
            variant="ghost"
            onClick={() => advancePast(markHandled(current.requestId))}
          >
            Skip this song
          </Button>
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
        blurb="Three files: a wide one for YouTube, and two vertical ones for TikTok and Instagram. It runs in real time — leave this tab open and it finishes on its own."
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
              <Button size="sm" onClick={makeIt} disabled={busy}>Try again</Button>
              <Button size="sm" variant="ghost" onClick={() => setStep('details')} disabled={busy}>
                Back
              </Button>
            </div>
          </div>
        )}
      </StepShell>
    );
  }

  // ------------------------------------------------------------- captions
  if (step === 'captions' && current) {
    const rows = rowsFor(current.requestId);
    const editor = (
      platform: PublicationPlatform,
      props: { hint: string }
    ) => {
      const row = rows.find((r) => r.platform === platform);
      const draft = drafts[platform];
      const set = (patch: Partial<CaptionDraft>) =>
        setDrafts((all) => ({ ...all, [platform]: { ...all[platform], ...patch } }));
      return (
        <CopyEditor
          key={platform}
          platform={platform}
          published={row ? ['published', 'publishing'].includes(row.status) : false}
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
        blurb="These were written from the details. Nothing goes out until you approve them — edit anything, then carry on."
        headingRef={headingRef}
        onExit={saveAndExit}
        exitLabel="Save & exit"
      >
        {!rows.length && (
          <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
            The rows haven’t appeared yet — they will once the queue refreshes.
          </p>
        )}
        {editor('youtube', { hint: 'The full video' })}
        {editor('tiktok', { hint: 'The full-length vertical cut' })}
        {editor('instagram', { hint: 'The 30-second Reel' })}

        {error && (
          <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={approveCaptions} disabled={busy} className="bg-[#1C0357] hover:bg-[#1C0357]/90">
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            These are good <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <span className="text-[11px] text-gray-400">Your edits are saved when you carry on.</span>
        </div>
      </StepShell>
    );
  }

  // ----------------------------------------------------------------- push
  if (step === 'push' && current) {
    const shopListingUrl = shopSongUrl(products ?? [], current);
    const capDraft = drafts.tiktok.caption.trim() || drafts.instagram.caption.trim();
    return (
      <StepShell
        index={3}
        title={`Push “${title}”`}
        blurb="Last stop. This is everything that will happen:"
        headingRef={headingRef}
        onExit={goHome}
        exitLabel="Exit"
        exitDisabled={busy}
      >
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            <span>
              The video goes on <strong>YouTube</strong>, booked into your next free slot
              {nextSlotLabel ? <> — <strong>{nextSlotLabel}</strong></> : null}.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            <span>
              <strong>TikTok</strong> and <strong>Instagram</strong> teasers ride the same slot
              {capDraft ? '' : ' — with no caption, so give one a line on the previous screen'}.
            </span>
          </li>
        </ul>

        {listed ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-3">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <Store className="h-3.5 w-3.5 text-[#F538BC]" /> Already in the shop
              </p>
              <p className="text-[11px] text-gray-400">
                {listed.is_active === false
                  ? 'It’s saved as a draft — activate it in the Shop when you’re happy.'
                  : 'This song already has a live listing, so it will be left alone.'}
              </p>
            </div>
            {shopListingUrl && (
              <a
                href={shopListingUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-xs font-medium text-[#1C0357] underline"
              >
                View
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-3 rounded-xl bg-gray-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Add it to the shop</p>
                <p className="text-[11px] text-gray-400">$6.99, with the title card as its cover.</p>
              </div>
              <Switch checked={toShop} onCheckedChange={setToShop} />
            </div>
            {toShop && (
              <div className="flex items-center justify-between gap-3 border-t border-gray-200 pt-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Live straight away</p>
                  <p className="text-[11px] text-gray-400">
                    Off saves it as a draft to review in the Shop first.
                  </p>
                </div>
                <Switch checked={shopLive} onCheckedChange={setShopLive} />
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button size="lg" onClick={push} disabled={busy} className="bg-[#F538BC] hover:bg-[#F538BC]/90">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {busy ? 'Pushing…' : 'Push it'}
          </Button>
          <Button variant="ghost" onClick={goHome} disabled={busy}>
            Finish later
          </Button>
        </div>
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
            <p className="text-lg font-bold text-[#1C0357]">{pushed?.song ?? 'Song'} is out the door</p>
            <p className="text-xs text-gray-500">
              Queued for {pushed?.slot ?? nextSlotLabel}
              {pushed?.shop ? ' · added to the shop' : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {nextUp ? (
            <Button size="lg" onClick={() => advancePast(doneIds)} className="bg-[#1C0357] hover:bg-[#1C0357]/90">
              Next song — “{nextUp.song}” <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button size="lg" onClick={goHome} className="bg-[#1C0357] hover:bg-[#1C0357]/90">
              That’s everything
            </Button>
          )}
          <Button variant="ghost" onClick={onOpenBoard}>
            <Store className="mr-2 h-4 w-4" /> See it on the board
          </Button>
        </div>

        {upNext.length > 0 && (
          <p className="flex items-start gap-2 text-xs text-gray-400">
            <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {upNext.length} more ready to push in this sitting.
          </p>
        )}
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

// The songs that can't be made yet, each with the one thing they need. Saving a
// key moves the song straight into the ready count.
function KeyFixer({ tracks }: { tracks: DeliveredTrack[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);

  const save = async (track: DeliveredTrack, value: string) => {
    if (!value || saving) return;
    setSaving(track.requestId);
    try {
      await saveRequestKey(track, value);
      await queryClient.invalidateQueries({ queryKey: ['delivered_tracks'] });
      toast({ title: 'Key saved', description: `“${track.song}” can be pushed now.` });
    } catch (e) {
      toast({ title: "Couldn't save the key", description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-3 rounded-xl bg-amber-50 p-3">
      <p className="flex items-start gap-2 text-xs text-amber-800">
        <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          These are recorded but have no musical key, so their title cards can’t be made. Pick one
          and {tracks.length === 1 ? 'it' : 'they'} will be ready to push.
        </span>
      </p>
      <ul className="space-y-2">
        {tracks.map((t) => (
          <li key={t.requestId} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="min-w-0 flex-1 truncate font-medium text-[#1C0357]">
              {t.song}
              {t.show && <span className="ml-2 text-xs font-normal text-gray-400">{t.show}</span>}
            </span>
            <div className="w-44 shrink-0">
              <KeySelect value="" onChange={(v) => save(t, v)} />
            </div>
            {saving === t.requestId && <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-700" />}
          </li>
        ))}
      </ul>
    </div>
  );
}

// A 1:1 render of the card, so the details step shows what the video will look
// like without a separate preview route.
function TitleCardThumb({
  title,
  show,
  client,
  musicalKey,
}: {
  title: string;
  show: string;
  client: string;
  musicalKey: string;
}) {
  const [url, setUrl] = useState<string | null>(null);

  // Re-render once the typing settles rather than on every keystroke.
  const settled = useDebounced(`${title}|${show}|${client}|${musicalKey}`, 250);
  const [song, artist, who, key] = settled.split('|');

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    renderCardToBlob({ song, artist, client: who, key }, '1:1')
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
  }, [song, artist, who, key]);

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
              className="w-full rounded-lg border border-gray-200 p-2 text-xs leading-relaxed text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#F538BC]/40"
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
            className="w-full rounded-lg border border-gray-200 p-2 text-xs leading-relaxed text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#F538BC]/40"
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
