import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle, ArrowRight, Check, CheckCircle2, Lightbulb, Loader2, Music2, Play, Sparkles, Store,
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn, getErrorMessage, getFunctionErrorMessage } from '@/lib/utils';
import { PLATFORM_LABELS, type PublicationWithAsset } from '@/types/publishing';
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
import { useDeliveredTracks, type DeliveredTrack } from '@/hooks/useDeliveredTracks';
import { KEY_OPTIONS, keyForDisplay } from '@/utils/musicalKeys';
import { renderCardToBlob } from '@/utils/titleCard';
import type { ClipProgress } from '@/utils/canvasRecorder';
import { listTrackInShop, queueTrackForRelease, type ReleasePhase } from '@/utils/releaseTrack';
import type { TrackGroup } from '@/utils/publishingPipeline';

// ---------------------------------------------------------------------------
// The release wizard.
//
// The board answers "what's the state of everything?" — this answers "what do I
// do next?", one song at a time, in plain language. Four stops per song:
//
//   1. Check it     — the details that go on the card. One button.
//   2. We make it   — three videos recorded and uploaded, hands off.
//   3. Read it over — the captions, approved (or edited) in one place.
//   4. Push it      — book the slot, arm the teasers, list it in the shop.
//
// Everything it does is the same machinery the board and the pipeline use, via
// utils/releaseTrack — it is a friendlier way to drive them, not a second path.
// ---------------------------------------------------------------------------

type WizardStep = 'intro' | 'details' | 'making' | 'captions' | 'push' | 'done';

const PHASE_LABELS: { id: ReleasePhase; label: string }[] = [
  { id: 'recording', label: 'Recording the videos' },
  { id: 'uploading', label: 'Uploading them' },
  { id: 'drafting', label: 'Writing the captions' },
];

function StepDots({ index }: { index: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn(
            'h-1.5 rounded-full transition-all',
            i < index ? 'w-6 bg-[#1C0357]' : i === index ? 'w-6 bg-[#F538BC]' : 'w-3 bg-gray-200'
          )}
        />
      ))}
      <span className="ml-1.5 text-[11px] font-medium text-gray-400">Step {index + 1} of 4</span>
    </div>
  );
}

function Friendly({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed text-gray-500">{children}</p>;
}

export function ReleaseWizard({
  queue,
  groups,
  tz,
  nextSlotLabel,
  onPush,
  onRefresh,
  onSaveCaption,
  onSaveCopy,
  onOpenBoard,
}: {
  queue: PublicationWithAsset[];
  groups: TrackGroup[];
  tz: string;
  nextSlotLabel: string;
  onPush: (group: TrackGroup) => Promise<void>;
  onRefresh: () => Promise<unknown>;
  onSaveCaption: (pub: PublicationWithAsset, caption: string) => Promise<void>;
  onSaveCopy: (pub: PublicationWithAsset, next: { title: string; description: string }) => Promise<void>;
  onOpenBoard: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tracks } = useDeliveredTracks();

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

  // Push choices.
  const [toShop, setToShop] = useState(true);
  const [shopLive, setShopLive] = useState(true);

  const [pushed, setPushed] = useState<{ song: string; slot: string; shop: boolean } | null>(null);

  const queuedRequestIds = useMemo(() => {
    const set = new Set<string>();
    for (const pub of queue) {
      if (pub.content_assets?.request_id) set.add(pub.content_assets.request_id);
    }
    return set;
  }, [queue]);

  // Songs this wizard can actually finish: not exclusive, allowed on socials,
  // and with no video yet. A song with no key can't be recorded, so it is
  // counted separately rather than being a dead end mid-flow.
  const { ready, needsKey } = useMemo(() => {
    const open = (tracks ?? []).filter(
      (t) => !t.isExclusive && !t.noSocials && !queuedRequestIds.has(t.requestId)
    );
    const withKey: DeliveredTrack[] = [];
    const without: DeliveredTrack[] = [];
    for (const t of open) (t.key ? withKey : without).push(t);
    return { ready: withKey, needsKey: without };
  }, [tracks, queuedRequestIds]);

  // The song being worked on is held in state, not derived from the queue: once a
  // song is recorded its rows exist, so it drops out of `ready` mid-flow and a
  // derived "current" would vanish between the captions and push steps.
  const [current, setCurrent] = useState<DeliveredTrack | null>(null);

  // `ready` minus everything already handled in this sitting. Recomputed from the
  // freshest handled list so "next" is right immediately, before React re-renders.
  const upNext = ready.filter((t) => !doneIds.includes(t.requestId));
  const nextUp = upNext[0] ?? null;

  const rowsFor = (requestId: string) =>
    queue.filter((p) => p.content_assets?.request_id === requestId);

  const begin = (track: DeliveredTrack) => {
    setCurrent(track);
    setTitle(track.song);
    setShow(track.show);
    setKey(track.key ?? 'C Major (0)');
    setError(null);
    setToShop(true);
    setShopLive(true);
    setStep('details');
  };

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

  const skipCurrent = () => {
    if (!current) return;
    const handled = doneIds.includes(current.requestId) ? doneIds : [...doneIds, current.requestId];
    setDoneIds(handled);
    advancePast(handled);
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
      await queueTrackForRelease({
        track: current,
        title,
        show,
        key,
        onPhase: setPhase,
        onProgress: setProgress,
      });
      await onRefresh();
      setStep('captions');
    } catch (e) {
      setError(await getFunctionErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  // Step 3 → step 4: nothing to save here (edits are saved per field), just move on.
  const approveCaptions = () => setStep('push');

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
      if (toShop) {
        await listTrackInShop(current, { active: shopLive });
        await queryClient.invalidateQueries({ queryKey: ['shop_products'] });
        shopped = true;
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

  const nextSong = () => advancePast(doneIds);

  // ---------------------------------------------------------------- intro
  if (step === 'intro') {
    const total = upNext.length;
    return (
      <Card className="border-none bg-white shadow-sm rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-[#1C0357]">
            <Sparkles className="h-5 w-5 text-[#F538BC]" /> Get your songs out
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Friendly>
            One song at a time. We check the details, make the videos, show you the captions, then
            push the song to YouTube, TikTok and Instagram — and into the shop. About a minute a song.
          </Friendly>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-[#1C0357] p-4 text-white">
              <p className="text-3xl font-bold tabular-nums">{total}</p>
              <p className="text-xs text-white/70">ready to push</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-3xl font-bold tabular-nums text-[#1C0357]">{doneIds.length}</p>
              <p className="text-xs text-gray-500">done in this sitting</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-3xl font-bold tabular-nums text-[#1C0357]">{needsKey.length}</p>
              <p className="text-xs text-gray-500">need a key first</p>
            </div>
          </div>

          {needsKey.length > 0 && (
            <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {needsKey.length === 1 ? 'One song has' : `${needsKey.length} songs have`} no musical
                key recorded, so the title card can’t be made yet. Set the key on the request and
                {' '}
                {needsKey.length === 1 ? 'it' : 'they'} will appear here.
              </span>
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              disabled={!nextUp}
              onClick={startFromIntro}
              className="bg-[#1C0357] hover:bg-[#1C0357]/90"
            >
              <Play className="mr-2 h-4 w-4" />
              {total ? `Start with “${nextUp?.song}”` : 'Nothing to push'}
            </Button>
            <Button variant="ghost" onClick={onOpenBoard}>
              See the full list instead
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!current && step !== 'done') {
    return (
      <Card className="border-none bg-white shadow-sm rounded-2xl">
        <CardContent className="space-y-4 p-6">
          <p className="text-sm text-gray-500">No songs left to push in this sitting.</p>
          <Button onClick={() => setStep('intro')} variant="outline">
            Back to the start
          </Button>
        </CardContent>
      </Card>
    );
  }

  // -------------------------------------------------------------- details
  if (step === 'details' && current) {
    return (
      <Card className="border-none bg-white shadow-sm rounded-2xl">
        <CardHeader className="space-y-2">
          <StepDots index={0} />
          <CardTitle className="text-lg font-bold text-[#1C0357]">Check this one</CardTitle>
          <Friendly>
            This is what goes on the video and the caption. Fix anything that’s wrong, then we make
            the videos.
          </Friendly>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-xl border border-gray-100 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#1C0357]">
              <Music2 className="h-4 w-4 text-[#F538BC]" />
              {current.client ? `Ordered by ${current.client}` : 'Delivered request'}
            </div>
            <audio controls preload="none" src={current.url} className="mt-2 h-9 w-full" />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Song title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Song name" />
            </div>
            <div className="space-y-1.5">
              <Label>Show or artist</Label>
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

          <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-700">Title card preview</p>
              <p className="text-[11px] text-gray-400">
                {title || 'Song'} · {show ? `from ${show}` : 'no show'} · {keyForDisplay(key)}
              </p>
            </div>
            <div className="shrink-0">
              <TitleCardThumb title={title} show={show} client={current.client} musicalKey={key} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={makeIt} className="bg-[#1C0357] hover:bg-[#1C0357]/90">
              Looks right — make the videos <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={skipCurrent}>
              Skip this song
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // --------------------------------------------------------------- making
  if (step === 'making') {
    const pct = progress && progress.total ? (progress.loaded / progress.total) * 100 : 0;
    return (
      <Card className="border-none bg-white shadow-sm rounded-2xl">
        <CardHeader className="space-y-2">
          <StepDots index={1} />
          <CardTitle className="text-lg font-bold text-[#1C0357]">
            Making the videos for “{title}”
          </CardTitle>
          <Friendly>
            Three files: a wide one for YouTube, and two vertical ones for TikTok and Instagram. It
            runs in real time — leave this tab open and it finishes on its own.
          </Friendly>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2.5">
            {PHASE_LABELS.map((p, i) => {
              const order = PHASE_LABELS.map((x) => x.id);
              const at = order.indexOf(phase);
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
        </CardContent>
      </Card>
    );
  }

  // ------------------------------------------------------------- captions
  if (step === 'captions' && current) {
    const rows = rowsFor(current.requestId);
    const yt = rows.find((r) => r.platform === 'youtube');
    const tt = rows.find((r) => r.platform === 'tiktok');
    const ig = rows.find((r) => r.platform === 'instagram');
    return (
      <Card className="border-none bg-white shadow-sm rounded-2xl">
        <CardHeader className="space-y-2">
          <StepDots index={2} />
          <CardTitle className="text-lg font-bold text-[#1C0357]">
            Read the captions for “{title}”
          </CardTitle>
          <Friendly>
            These were written from the details. Nothing goes out until you say so — edit any line
            and it saves straight away.
          </Friendly>
        </CardHeader>
        <CardContent className="space-y-5">
          {yt && <CopyEditor pub={yt} onSave={onSaveCopy} />}
          {tt && (
            <CaptionEditor
              label={PLATFORM_LABELS.tiktok}
              pub={tt}
              onSave={onSaveCaption}
              hint="Goes on the full-length vertical video."
            />
          )}
          {ig && (
            <CaptionEditor
              label={PLATFORM_LABELS.instagram}
              pub={ig}
              onSave={onSaveCaption}
              hint="Goes on the 30-second Reel."
            />
          )}
          {!rows.length && (
            <p className="text-sm text-gray-500">
              The rows haven’t appeared yet — refresh and they’ll be here.
            </p>
          )}

          {error && (
            <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={approveCaptions} className="bg-[#1C0357] hover:bg-[#1C0357]/90">
              These are good <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={skipCurrent}>
              Skip this song
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ----------------------------------------------------------------- push
  if (step === 'push' && current) {
    return (
      <Card className="border-none bg-white shadow-sm rounded-2xl">
        <CardHeader className="space-y-2">
          <StepDots index={3} />
          <CardTitle className="text-lg font-bold text-[#1C0357]">Push “{title}”</CardTitle>
          <Friendly>Last stop. This is everything that will happen:</Friendly>
        </CardHeader>
        <CardContent className="space-y-4">
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
                <strong>TikTok</strong> and <strong>Instagram</strong> teasers ride the same slot.
              </span>
            </li>
          </ul>

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
            <Button variant="ghost" onClick={skipCurrent} disabled={busy}>
              Skip this song
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ----------------------------------------------------------------- done
  return (
    <Card className="border-none bg-white shadow-sm rounded-2xl">
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
            <Button size="lg" onClick={nextSong} className="bg-[#1C0357] hover:bg-[#1C0357]/90">
              Next song — “{nextUp.song}” <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button size="lg" onClick={() => setStep('intro')} className="bg-[#1C0357] hover:bg-[#1C0357]/90">
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

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    renderCardToBlob({ song: title, artist: show, client, key: musicalKey }, '1:1')
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
  }, [title, show, client, musicalKey]);

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

// YouTube's copy: a title and a description. Saved together, because they are
// one piece of metadata on the row.
function CopyEditor({
  pub,
  onSave,
}: {
  pub: PublicationWithAsset;
  onSave: (pub: PublicationWithAsset, next: { title: string; description: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState(String(pub.metadata?.title ?? ''));
  const [description, setDescription] = useState(String(pub.metadata?.description ?? ''));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const dirty =
    title !== String(pub.metadata?.title ?? '') || description !== String(pub.metadata?.description ?? '');

  const save = async () => {
    setSaving(true);
    setErr(null);
    try {
      await onSave(pub, { title, description });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-gray-100 p-3">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
          {PLATFORM_LABELS.youtube}
        </Badge>
        <span className="text-[11px] text-gray-400">The full video</span>
      </div>
      <div className="space-y-1.5">
        <Label>Video title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          className="w-full rounded-lg border border-gray-200 p-2 text-xs leading-relaxed text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#F538BC]/40"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={save} disabled={saving || !dirty}>
          {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          {saved ? 'Saved' : 'Save changes'}
        </Button>
        {err && <span className="text-[11px] text-red-600">{err}</span>}
      </div>
    </div>
  );
}

// A teaser's caption: one block of text, saved onto the row the worker posts from.
function CaptionEditor({
  label,
  pub,
  hint,
  onSave,
}: {
  label: string;
  pub: PublicationWithAsset;
  hint: string;
  onSave: (pub: PublicationWithAsset, caption: string) => Promise<void>;
}) {
  const [caption, setCaption] = useState(String(pub.metadata?.caption ?? ''));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const dirty = caption !== String(pub.metadata?.caption ?? '');

  const save = async () => {
    setSaving(true);
    setErr(null);
    try {
      await onSave(pub, caption);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-gray-100 p-3">
      <div className="flex items-center justify-between">
        <Badge variant="outline">{label}</Badge>
        <span className="text-[11px] text-gray-400">{hint}</span>
      </div>
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        rows={5}
        placeholder="Write the caption that goes with the post…"
        className="w-full rounded-lg border border-gray-200 p-2 text-xs leading-relaxed text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#F538BC]/40"
      />
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={save} disabled={saving || !dirty}>
          {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          {saved ? 'Saved' : 'Save changes'}
        </Button>
        {err && <span className="text-[11px] text-red-600">{err}</span>}
      </div>
    </div>
  );
}
