import { lazy, Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn, getErrorMessage, getFunctionErrorMessage } from '@/lib/utils';
import { allocatePublishingSlots } from '@/utils/nextWeeklySlot';
import {
  WEEKDAYS,
  type PublicationMetadata,
  type PublicationWithAsset,
  type PublishingSettings,
} from '@/types/publishing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, CalendarClock, Clapperboard, Instagram, Library, ListChecks, Rocket, Settings2, Youtube } from 'lucide-react';
import { useDeliveredTracks, useShopProducts } from '@/hooks/useDeliveredTracks';
import ReleaseBoard, { VettingDialog } from '@/components/admin/sections/ReleaseBoard';
import { ReleaseWizard } from '@/components/admin/sections/ReleaseWizard';
import { Disclosure } from '@/components/admin/sections/PublishingBands';
import TrackDetail from '@/components/admin/sections/TrackDetail';
import { assetFilename, signedAssetDownloadUrl } from '@/utils/assetDownload';
import { shopProductForTrack } from '@/utils/shopLink';
import {
  groupPublications,
  trackBookable,
  type PushMode,
  type PushOutcome,
  type TrackGroup,
} from '@/utils/publishingPipeline';

// Three tabs: the songs (where all the work happens), the free-form recorder, and
// the settings you rarely touch.
type PublishingTab = 'songs' | 'recorder' | 'settings';

const PUBLISHING_TABS: { id: PublishingTab; label: string; icon: typeof ListChecks }[] = [
  { id: 'songs', label: 'Songs', icon: Library },
  { id: 'recorder', label: 'Recorder', icon: Clapperboard },
  { id: 'settings', label: 'Settings', icon: Settings2 },
];

// A retry or reset must start from a clean slate. If a half-finished Instagram
// container id survives in metadata, the worker resumes it instead of recording a
// fresh post — which can republish a Reel that already went out.
function withoutInstagramContainer(meta: PublicationMetadata | undefined): PublicationMetadata {
  const next = { ...(meta ?? {}) } as Record<string, unknown>;
  delete next.instagram_post;
  return next as PublicationMetadata;
}

// The teaser/title-card recorder used to live under Shop → Marketing, which is
// why nobody could find it. It belongs here, next to the pipeline it feeds.
const TitleCardGenerator = lazy(() => import('@/pages/TitleCardGenerator'));

const TIMEZONES = [
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Australia/Perth',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Pacific/Auckland',
];

function formatWhen(iso: string | null, tz: string): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-AU', {
      timeZone: tz,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

// ---------------------------------------------------------------------------
// Queue runway
// ---------------------------------------------------------------------------
// How long posting keeps going on its own, and the nudge to top the queue up
// before it stops. Deliberately loud: an empty queue is silent — nothing posts,
// nothing emails you, and the only symptom is a quiet channel.
function QueueRunway({
  postDates,
  notQueued,
  tz,
  cadenceLabel,
}: {
  postDates: string[];
  notQueued: number;
  tz: string;
  cadenceLabel: string;
}) {
  const now = Date.now();
  const future = postDates
    .map((s) => new Date(s).getTime())
    .filter((t) => Number.isFinite(t) && t > now)
    .sort((a, b) => a - b);
  // One entry per posting day: a song's video and its teasers share a slot, and
  // a song rows twice on the same day only counts once.
  const days = [...new Set(future.map((t) => new Date(t).toLocaleDateString('en-CA', { timeZone: tz })))];
  const last = future.length ? new Date(future[future.length - 1]) : null;
  const daysLeft = last ? Math.ceil((last.getTime() - now) / 86_400_000) : 0;

  const tone: 'empty' | 'low' | 'ok' = !last ? 'empty' : daysLeft <= 6 ? 'low' : 'ok';
  const shell = {
    empty: 'border-red-200 bg-red-50',
    low: 'border-amber-200 bg-amber-50',
    ok: 'border-emerald-200 bg-emerald-50/70',
  }[tone];
  const ink = {
    empty: 'text-red-700',
    low: 'text-amber-800',
    ok: 'text-emerald-800',
  }[tone];

  const headline =
    tone === 'empty'
      ? 'Nothing is queued — nothing will post.'
      : tone === 'low'
        ? `Only ${days.length} posting day${days.length === 1 ? '' : 's'} left — the last is ${formatWhen(last!.toISOString(), tz)}.`
        : `${days.length} posting days queued, running to ${formatWhen(last!.toISOString(), tz)}.`;

  const nudge =
    notQueued > 0
      ? `${notQueued} delivered song${notQueued === 1 ? '' : 's'} ${notQueued === 1 ? "hasn't" : "haven't"} been sent yet — scheduling ${notQueued === 1 ? 'it' : 'them'} keeps the run going.`
      : 'Every delivered song is already on its way.';

  return (
    <div className={cn('flex flex-wrap items-start gap-x-4 gap-y-3 rounded-2xl border px-4 py-3', shell)}>
      <CalendarClock className={cn('mt-0.5 h-5 w-5 shrink-0', ink)} />
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-semibold', ink)}>{headline}</p>
        <p className="mt-0.5 text-xs text-gray-600">{nudge}</p>
        <p className="mt-0.5 text-[11px] text-gray-500">
          To add one: take a song below through its steps and choose{' '}
          <span className="font-medium">Schedule for the next slot</span> at the end. It lands on
          your {cadenceLabel} cadence.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Weekly slot settings
// ---------------------------------------------------------------------------
function SlotSettings({
  pendingCount = 0,
  existingSlots = [],
  onRespace,
  respaceCount = 0,
  respacing = false,
}: {
  // How many uploads still need a slot (the not-on-YouTube backlog + anything
  // already queued but not published) and the slots already booked — used for
  // the live "when will this finish?" forecast under the controls.
  pendingCount?: number;
  existingSlots?: Date[];
  onRespace?: () => void;
  respaceCount?: number;
  respacing?: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error: settingsError } = useQuery<PublishingSettings, Error>({
    queryKey: ['publishing_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('publishing_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [mode, setMode] = useState<'weekly' | 'interval' | null>(null);
  const [days, setDays] = useState<string | null>(null);
  const [dow, setDow] = useState<number | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string | null>(null);
  const [auto, setAuto] = useState<boolean | null>(null);
  const [autoBook, setAutoBook] = useState<boolean | null>(null);
  const [socialAuto, setSocialAuto] = useState<boolean | null>(null);
  const [socialOffset, setSocialOffset] = useState<string | null>(null);
  const [tikTokPrivacy, setTikTokPrivacy] = useState<string | null>(null);
  const [tikTokPoster, setTikTokPoster] = useState<'api' | 'browser' | null>(null);

  function final(key: 'schedule_mode'): 'weekly' | 'interval';
  function final(key: 'interval_days' | 'weekly_dow' | 'social_offset_minutes'): number;
  function final(key: 'weekly_time' | 'timezone' | 'social_tiktok_privacy'): string;
  function final(key: 'social_tiktok_poster'): 'api' | 'browser';
  function final(key: 'auto_schedule' | 'auto_book' | 'social_auto_post'): boolean;
  function final(key: string): string | number | boolean {
    switch (key) {
      case 'social_auto_post':
        return socialAuto ?? settings?.social_auto_post ?? false;
      case 'social_offset_minutes':
        return Number(socialOffset ?? String(settings?.social_offset_minutes ?? 0)) || 0;
      case 'social_tiktok_privacy':
        return tikTokPrivacy ?? settings?.social_tiktok_privacy ?? 'SELF_ONLY';
      case 'social_tiktok_poster':
        return (tikTokPoster ?? settings?.social_tiktok_poster ?? 'api') as 'api' | 'browser';
      case 'schedule_mode':
        return (mode ?? settings?.schedule_mode ?? 'weekly') as 'weekly' | 'interval';
      case 'interval_days':
        return days !== null
          ? Math.min(Math.max(Number(days), 1), 90)
          : settings?.interval_days ?? 5;
      case 'weekly_dow':
        return dow !== null ? dow : settings?.weekly_dow ?? 2;
      case 'weekly_time':
        return time ?? settings?.weekly_time ?? '09:00';
      case 'timezone':
        return timezone ?? settings?.timezone ?? 'Australia/Sydney';
      case 'auto_schedule':
        return auto ?? settings?.auto_schedule ?? true;
      case 'auto_book':
        return autoBook ?? settings?.auto_book ?? false;
      default:
        throw new Error(`Unknown setting: ${key}`);
    }
  }

  const save = async () => {
    const payload: Record<string, unknown> = {
      schedule_mode: final('schedule_mode'),
      interval_days: final('schedule_mode') === 'interval' ? final('interval_days') : null,
      weekly_dow: final('weekly_dow'),
      weekly_time: final('weekly_time'),
      timezone: final('timezone'),
      auto_schedule: final('auto_schedule'),
      auto_book: final('auto_book'),
      social_auto_post: final('social_auto_post'),
      social_offset_minutes: final('social_offset_minutes'),
      social_tiktok_privacy: final('social_tiktok_privacy'),
    };
    // Only write the poster column once migration 0045 has added it, so saving
    // settings never breaks on a database that hasn't caught up.
    if (settings && 'social_tiktok_poster' in settings) {
      payload.social_tiktok_poster = final('social_tiktok_poster');
    }
    const { error } = await supabase
      .from('publishing_settings')
      .update(payload)
      .eq('id', 1);
    if (error) {
      toast({ title: "Couldn't save settings", description: getErrorMessage(error), variant: 'destructive' });
      return;
    }
    toast({ title: 'Publishing settings saved' });
    queryClient.invalidateQueries({ queryKey: ['publishing_settings'] });
  };

  if (settingsError) {
    return (
      <Card className="bg-white border-none shadow-sm rounded-2xl">
        <CardContent className="p-6 text-sm text-red-600">
          Couldn't load the publishing settings: {getErrorMessage(settingsError)}
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !settings) {
    return <Card className="bg-white border-none shadow-sm rounded-2xl"><CardContent className="p-6 text-sm text-gray-400">Loading settings…</CardContent></Card>;
  }

  const isInterval = final('schedule_mode') === 'interval';

  // Forecast from the values currently on screen (including unsaved edits), so
  // switching frequency or interval immediately shows when the backlog lands.
  const previewSettings = {
    schedule_mode: final('schedule_mode'),
    interval_days: final('interval_days'),
    weekly_dow: final('weekly_dow'),
    weekly_time: final('weekly_time'),
    timezone: final('timezone'),
  };
  let forecast: { next: Date; last: Date | null } | null = null;
  try {
    const slots = allocatePublishingSlots(previewSettings, Math.max(pendingCount, 1), existingSlots);
    forecast = { next: slots[0], last: pendingCount > 0 ? slots[slots.length - 1] : null };
  } catch {
    forecast = null;
  }

  return (
    <Card className="bg-white border-none shadow-sm rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-[#1C0357] flex items-center gap-2">
          <CalendarClock className="h-5 w-5" /> Publishing cadence
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
          Approved videos are scheduled into the next free slot — every day, every few days or once a
          week. Publishing runs every 15 minutes, so this is roughly when they'll appear.
        </p>
        {forecast && (
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 text-sm">
            <span className="text-gray-500">
              Next upload <span className="font-semibold text-[#1C0357]">{formatWhen(forecast.next.toISOString(), final('timezone'))}</span>
            </span>
            {forecast.last && (
              <span className="text-gray-500">
                {pendingCount} queued · last lands{' '}
                <span className="font-semibold text-[#1C0357]">{formatWhen(forecast.last.toISOString(), final('timezone'))}</span>
              </span>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label>Frequency</Label>
            <Select value={final('schedule_mode')} onValueChange={(v) => setMode(v as 'weekly' | 'interval')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Once a week</SelectItem>
                <SelectItem value="interval">Every N days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isInterval ? (
            <div className="space-y-1.5">
              <Label>Every (days)</Label>
              <Input
                type="number"
                min={1}
                max={90}
                value={days ?? String(settings.interval_days ?? 5)}
                onChange={(e) => setDays(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Day</Label>
              <Select value={String(final('weekly_dow'))} onValueChange={(v) => setDow(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((d, i) => (
                    <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Time</Label>
            <Input type="time" value={final('weekly_time')} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <Select value={final('timezone')} onValueChange={setTimezone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <div className="flex h-9 items-center gap-2">
                <Switch checked={final('auto_schedule')} onCheckedChange={setAuto} />
                <Label className="font-normal">Auto-schedule on approval</Label>
              </div>
              <div className="flex h-9 items-center gap-2">
                <Switch checked={final('auto_book')} onCheckedChange={setAutoBook} />
                <Label className="font-normal">Book new videos automatically</Label>
              </div>
            </div>
            <p className="text-[11px] text-gray-400">
              {final('auto_book')
                ? 'Recorded videos are booked onto the next slot on their own, skipping Review & send — and the shop check. Leave this off to keep the shop-first rule.'
                : 'Videos wait for you to send them (Songs → Review & send).'}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
          <div className="flex items-start gap-3">
            <Switch
              checked={final('social_auto_post')}
              onCheckedChange={setSocialAuto}
              className="mt-0.5"
            />
            <div className="min-w-0">
              <Label className="font-semibold text-[#1C0357]">Auto-post teasers to TikTok &amp; Instagram</Label>
              <p className="mt-0.5 text-xs text-gray-500">
                When a video is approved, its teaser rows are booked onto the same slot and posted
                automatically — no composing, no clicking. A worker checks every 15 minutes.
              </p>
            </div>
          </div>
          {final('social_auto_post') && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Post after the video by (minutes)</Label>
                <Input
                  type="number"
                  min={0}
                  max={1440}
                  value={String(final('social_offset_minutes'))}
                  onChange={(e) => setSocialOffset(e.target.value)}
                />
                <p className="text-[11px] text-gray-400">0 = same time as the YouTube video. 120 = two hours later.</p>
              </div>
              <div className="space-y-1.5">
                <Label>TikTok privacy — API path only</Label>
                <Select value={final('social_tiktok_privacy')} onValueChange={setTikTokPrivacy}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SELF_ONLY">Only me (private)</SelectItem>
                    <SelectItem value="MUTUAL_FOLLOW_FRIENDS">Friends</SelectItem>
                    <SelectItem value="FOLLOWER_OF_CREATOR">Followers</SelectItem>
                    <SelectItem value="PUBLIC_TO_EVERYONE">Everyone</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-gray-400">
                  Only used by the official API (see below). While the app is unaudited that path is
                  forced to <em>Only me</em>. The browser poster ignores this setting and always
                  selects <em>Everyone</em> — public, as long as the TikTok account itself is public.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>How TikTok is posted</Label>
                <Select
                  value={final('social_tiktok_poster')}
                  onValueChange={(v) => setTikTokPoster(v as 'api' | 'browser')}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="api">TikTok API — private until audited</SelectItem>
                    <SelectItem value="browser">Browser poster — public (unofficial, risky)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-gray-400">
                  {final('social_tiktok_poster') === 'browser'
                    ? 'A separate always-on service posts through the web app as you. It can post publicly, but it breaks TikTok rules and risks the account.'
                    : 'Uses the official API. While the app is unaudited this can only post privately.'}
                </p>
              </div>
              <p className="text-[11px] leading-relaxed text-gray-500 sm:col-span-2">
                Heads up: TikTok's rules expect you to post each video yourself, and their API has no
                scheduled-publish setting. Turning this on runs the posts on a timer instead — handy,
                but it isn't what TikTok's review looks for. Switch it off any time to go back to
                composing each teaser by hand.
              </p>
            </div>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {onRespace && (
            <Button variant="outline" onClick={onRespace} disabled={respacing || respaceCount === 0}>
              {respacing
                ? 'Re-spacing…'
                : `Re-space ${respaceCount} queued video${respaceCount === 1 ? '' : 's'} to this cadence`}
            </Button>
          )}
          <Button onClick={save} className="bg-[#1C0357] hover:bg-[#1C0357]/90">Save settings</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main section
// ---------------------------------------------------------------------------
const PublishingSection = () => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('sub');
  // Old links (?sub=pipeline / ?sub=tracks) land on Songs, which replaced both.
  const tab: PublishingTab = PUBLISHING_TABS.some((t) => t.id === rawTab)
    ? (rawTab as PublishingTab)
    : 'songs';
  // The song open in the song flow, kept in the URL (?song=<request id>) so the
  // browser's Back button returns to the list.
  const openSongId = tab === 'songs' ? searchParams.get('song') : null;
  const setTab = (next: PublishingTab) => {
    const sp = new URLSearchParams(searchParams);
    if (next === 'songs') sp.delete('sub');
    else sp.set('sub', next);
    sp.delete('song');
    setSearchParams(sp, { replace: false });
  };
  const openSong = (requestId: string | null) => {
    const sp = new URLSearchParams(searchParams);
    sp.delete('sub');
    if (requestId) sp.set('song', requestId);
    else sp.delete('song');
    setSearchParams(sp, { replace: false });
  };
  // Admin test hooks: which platform pass is running, and the raw worker reply
  // so the pipeline can be verified from the page.
  const [testing, setTesting] = useState<'youtube' | 'tiktok' | 'instagram' | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  // True when the last queue run couldn't read video status from YouTube, so
  // "published" is being inferred from the schedule rather than confirmed.
  const [confirmDegraded, setConfirmDegraded] = useState(false);
  const [running, setRunning] = useState(false);
  // Track whose teaser is being re-recorded from the song's status page — the
  // same teaser-only recorder the Songs list uses.
  const [reRecordFor, setReRecordFor] = useState<string | null>(null);
  const [respacing, setRespacing] = useState(false);
  // The song currently being sent.
  const [publishingKey, setPublishingKey] = useState<string | null>(null);
  // The per-song page: the group key whose page is open, and the publication row
  // being re-drafted from it.
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [draftingId, setDraftingId] = useState<string | null>(null);

  const { data: settings } = useQuery<PublishingSettings, Error>({
    queryKey: ['publishing_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('publishing_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // One query, two reads: the newest rows for display, and *every* YouTube slot
  // (without the display cap) so the "next free slot" can never collide with a
  // row the 200-row display list has hidden. The two ride the same cache key, so
  // every existing refetch() refreshes both.
  const DISPLAY_LIMIT = 200;
  const {
    data: queueData,
    error: queueError,
    refetch,
  } = useQuery<{ queue: PublicationWithAsset[]; slots: string[]; truncated: boolean }, Error>({
    queryKey: ['publications_queue'],
    queryFn: async () => {
      const [listRes, slotRes] = await Promise.all([
        supabase
          .from('publications')
          .select('*, content_assets(*)')
          .order('created_at', { ascending: false })
          .limit(DISPLAY_LIMIT),
        supabase
          .from('publications')
          .select('scheduled_for')
          .eq('platform', 'youtube')
          .not('scheduled_for', 'is', null)
          .order('scheduled_for', { ascending: true })
          .limit(1000),
      ]);
      if (listRes.error) throw listRes.error;
      if (slotRes.error) throw slotRes.error;
      const queue = (listRes.data || []) as PublicationWithAsset[];
      return {
        queue,
        slots: (slotRes.data || [])
          .map((r) => r.scheduled_for)
          .filter((s): s is string => !!s),
        truncated: queue.length >= DISPLAY_LIMIT,
      };
    },
  });
  const queue = useMemo(() => queueData?.queue ?? [], [queueData]);
  const queueTruncated = queueData?.truncated ?? false;

  const tz = settings?.timezone ?? 'Australia/Sydney';
  // Plain-words cadence, for the runway nudge's one-line "how".
  const cadenceLabel =
    (settings?.schedule_mode ?? 'interval') === 'interval'
      ? `${settings?.interval_days ?? 5}-day`
      : 'weekly';
  // The automation switch. It decides whether a booked teaser will move on its
  // own or is waiting for a hand-post, so the "needs you" band reads from it.
  const autoOn = settings?.social_auto_post === true;

  // YouTube-only queue, used for the bulk draft/schedule buttons.
  const youtubeQueue = queue.filter((p) => p.platform === 'youtube');
  const active = youtubeQueue.filter((p) => p.status !== 'skipped' && p.status !== 'published');

  // Every slot the worker will actually post into: rows that are booked and not
  // yet live. Skipped and failed rows are left out, so the runway can't claim
  // time it doesn't have.
  const postDates = youtubeQueue
    .filter((p) => p.status === 'scheduled' || p.status === 'publishing')
    .map((p) => p.scheduled_for)
    .filter((s): s is string => !!s);

  // Delivered tracks the board can't see a YouTube video for. Computed here, not
  // read back from the board, because the board only mounts once its disclosure
  // is opened — the hint and the cadence forecast need it either way.
  const { data: deliveredTracks = [] } = useDeliveredTracks();
  const { data: shopProducts = [] } = useShopProducts();
  const queuedRequestIds = new Set(
    youtubeQueue.map((p) => p.content_assets?.request_id).filter((id): id is string => !!id)
  );
  const notQueued = deliveredTracks.filter(
    (t) => !t.noSocials && !t.isExclusive && !queuedRequestIds.has(t.requestId)
  ).length;

  // Slots the pipeline considers taken. YouTube rows only — that is what the
  // server's auto-book pass reads, and a teaser's slot mirrors its video's, so
  // including teasers here could preview a different "next slot" than the server
  // would actually choose. Read from the uncapped slot query, not the display list.
  const existingDates = (queueData?.slots ?? []).map((s) => new Date(s));

  const nextSlot = () =>
    allocatePublishingSlots(
      settings ?? { schedule_mode: 'weekly', interval_days: null, weekly_dow: 2, weekly_time: '09:00', timezone: tz },
      1,
      existingDates
    )[0];

  // One row per song, all three platforms together. The page is just three
  // slices of this: needs a human, booked, or already live.
  const groups = useMemo(() => groupPublications(queue), [queue]);
  const sendingId = publishingKey
    ? groups.find((g) => g.key === publishingKey)?.requestId ?? null
    : null;

  // The per-song page reads from the live groups, so it stays fresh after a
  // refetch (re-recording, re-drafting) without closing.
  const detailGroup = detailKey ? groups.find((g) => g.key === detailKey) ?? null : null;
  const detailTrack = detailGroup?.requestId
    ? deliveredTracks.find((t) => t.requestId === detailGroup.requestId)
    : undefined;

  // Rows on the schedule (or approved and waiting for one) that a cadence change
  // can re-book — everything not yet live and not manually skipped.
  const respaceableCount = youtubeQueue.filter(
    (p) => p.status === 'approved' || p.status === 'scheduled'
  ).length;

  // Re-books every pending row onto fresh cadence slots, oldest first, then
  // nudges the already-uploaded YouTube videos to the same dates.
  const respace = async () => {
    const rows = youtubeQueue
      .filter((p) => p.status === 'approved' || p.status === 'scheduled')
      .sort((a, b) => ((a.scheduled_for ?? a.created_at) < (b.scheduled_for ?? b.created_at) ? -1 : 1));
    if (rows.length === 0) {
      toast({ title: 'Nothing to re-space', description: 'No approved or scheduled videos in the queue.' });
      return;
    }
    if (!window.confirm(`Re-book ${rows.length} queued video${rows.length === 1 ? '' : 's'} onto the current cadence?`)) return;
    setRespacing(true);
    try {
      const slots = allocatePublishingSlots(
        settings ?? { schedule_mode: 'weekly', interval_days: null, weekly_dow: 2, weekly_time: '09:00', timezone: tz },
        rows.length,
        []
      );
      for (let i = 0; i < rows.length; i++) {
        const { error } = await supabase
          .from('publications')
          .update({ scheduled_for: slots[i].toISOString() })
          .eq('id', rows[i].id);
        if (error) throw error;
      }

      // "Video and teasers ride the same slot" has to hold after a re-space too.
      // A teaser already booked on the old slot is reset to pending_approval so
      // the arm pass re-books it on the video's new slot and re-applies the
      // configured offset — otherwise it posts on a slot its video isn't live on.
      const respacedRequests = new Set(
        rows.map((r) => r.content_assets?.request_id).filter((id): id is string => !!id)
      );
      const staleTeaserIds = queue
        .filter(
          (p) =>
            (p.platform === 'tiktok' || p.platform === 'instagram') &&
            p.status === 'scheduled' &&
            !!p.content_assets?.request_id &&
            respacedRequests.has(p.content_assets.request_id)
        )
        .map((p) => p.id);
      if (staleTeaserIds.length) {
        const { error } = await supabase
          .from('publications')
          .update({ status: 'pending_approval', scheduled_for: null })
          .in('id', staleTeaserIds);
        if (error) throw error;
      }
      await refetch();
      const { data, error: fnErr } = await supabase.functions.invoke('sync-youtube-schedule', { body: {} });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      toast({
        title: `Re-spaced ${rows.length} video${rows.length === 1 ? '' : 's'}`,
        description: data?.failed
          ? `${data.synced} moved on YouTube, ${data.failed} couldn't be moved — reconnect the channel if it persists.`
          : undefined,
        variant: data?.failed ? 'destructive' : 'default',
      });
    } catch (e) {
      toast({ title: "Couldn't re-space the queue", description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setRespacing(false);
    }
  };

  // One button for the whole pipeline: drain the YouTube queue, then let the
  // social worker reconcile / book / post teasers. The social pass is *not*
  // forced — when Auto-post is off the worker stands down and says so, so this
  // button can never post a teaser behind the owner's back.
  const runNow = async () => {
    setRunning(true);
    try {
      const [yt, social] = await Promise.allSettled([
        supabase.functions.invoke('run-publish-queue', { body: {} }),
        supabase.functions.invoke('run-social-queue', { body: {} }),
      ]);

      if (yt.status === 'rejected' || yt.value.error) {
        const err = yt.status === 'rejected' ? yt.reason : yt.value.error;
        toast({ title: 'YouTube pass failed', description: await getFunctionErrorMessage(err), variant: 'destructive' });
      } else {
        setConfirmDegraded(!!yt.value.data?.confirmationDegraded);
      }
      // Hands-off booking (Settings → Book new videos automatically) reports how
      // many rows it gave a slot, so the switch is visible in the run.
      const autoBooked = yt.status === 'fulfilled' ? Number(yt.value.data?.autoBooked ?? 0) : 0;

      let teaserNote = 'Social worker unavailable';
      if (social.status === 'fulfilled' && !social.value.error) {
        const d = social.value.data ?? {};
        if (d.autoPost === false) {
          teaserNote = 'teasers paused — Auto-post is off';
        } else {
          const posted = (d.posted ?? []) as Array<{ status: string }>;
          const ok = posted.filter((p) => p.status === 'published').length;
          const failed = posted.filter((p) => p.status === 'failed').length;
          teaserNote =
            [
              ok ? `${ok} teaser${ok === 1 ? '' : 's'} posted` : null,
              d.armed ? `${d.armed} booked on the schedule` : null,
              failed ? `${failed} failed` : null,
            ]
              .filter(Boolean)
              .join(' · ') || 'no teasers due';
        }
      }
      toast({
        title: 'Run complete',
        description: [autoBooked ? `${autoBooked} booked automatically` : null, teaserNote]
          .filter(Boolean)
          .join(' · '),
      });
      refetch();
    } finally {
      setRunning(false);
    }
  };

  // Puts a failed teaser back in the queue and, when Auto-post is on, runs a
  // pass so the worker retries it. With Auto-post off the row is just cleared so
  // it can be posted by hand — this used to force a pass behind the switch.
  const retryTeaser = async (id: string) => {
    const row = queue.find((p) => p.id === id);
    const { error } = await supabase
      .from('publications')
      .update({
        status: 'pending_approval',
        attempts: 0,
        error: null,
        scheduled_for: null,
        // Drop any half-finished Instagram container so the retry starts clean.
        ...(row ? { metadata: withoutInstagramContainer(row.metadata) } : {}),
      })
      .eq('id', id);
    if (error) {
      toast({ title: "Couldn't reset the teaser", description: getErrorMessage(error), variant: 'destructive' });
      return;
    }
    if (!autoOn) {
      await refetch();
      toast({
        title: 'Teaser cleared',
        description: 'Auto-post is off — post it by hand with "Post it" on the row.',
      });
      return;
    }
    toast({ title: 'Teaser queued to retry' });
    await runNow();
  };

  // The rule the whole page is built on: a song goes to socials only once it can
  // be bought. Read fresh from the database rather than the cached list, because
  // the song flow lists a song moments before it sends it.
  const assertInShop = async (group: TrackGroup) => {
    const track = group.requestId
      ? deliveredTracks.find((t) => t.requestId === group.requestId)
      : undefined;
    const asset = group.yt?.content_assets ?? group.tt?.content_assets ?? group.ig?.content_assets;
    const song = track?.song || asset?.song_title || '';
    const show = track?.show || asset?.show || '';
    const { data, error } = await supabase
      .from('products')
      .select('id, title, artist_name, product_type, is_active');
    if (error) throw error;
    const product = shopProductForTrack(data ?? [], { song, show });
    if (!product?.is_active) {
      throw new Error(
        `“${song || group.label}” isn’t live in the shop yet. Add it to the shop first — nothing goes to socials until it can be bought.`
      );
    }
  };

  // One song, one press: straight out the door (now) or the next cadence slot
  // (schedule). Both run the same workers. Errors are toasted here and handed
  // back in the outcome so the song flow can hold until it actually went out.
  const publishTrack = async (
    group: TrackGroup,
    mode: PushMode = 'schedule'
  ): Promise<PushOutcome> => {
    setPublishingKey(group.key);
    try {
      await assertInShop(group);
      return mode === 'now' ? await publishTrackNow(group) : await scheduleTrack(group);
    } catch (e) {
      const message = getErrorMessage(e);
      toast({ title: "Couldn't publish this song", description: message, variant: 'destructive' });
      return { mode, ok: false, summary: message };
    } finally {
      setPublishingKey(null);
    }
  };

  // Publish now: skip the cadence. The video uploads immediately as public, and
  // each teaser goes out on the spot. Instagram and the API TikTok are forced
  // single posts (`publication_id` ignores the slot); a browser-owned TikTok is
  // left due right now so the poster claims it on its next poll. Auto-post being
  // off does not block any of this — it is an explicit press, like "Test the
  // pipeline", not the timer.
  //
  // Only a genuine failure (a precondition, a DB write, or the YouTube upload
  // pass) is fatal — the wizard holds on that. A teaser that the platform itself
  // declined (TikTok's drafts inbox, an over-length Reel) is reported in the
  // summary and left to the queue, because it must not block the shop listing for
  // a song that otherwise went out.
  const publishTrackNow = async (group: TrackGroup): Promise<PushOutcome> => {
    const yt = group.yt;
    if (yt && !yt.metadata?.description?.trim()) {
      throw new Error('Write the YouTube description first (Re-draft AI or Edit), then publish.');
    }
    const notes: string[] = [];
    let fatal = false;
    const now = new Date().toISOString();

    // Turn a forced social-post response into one honest line. The worker answers
    // 200 even when the platform refused, so the status inside `posted` is the
    // only thing that tells the truth.
    const describeSocial = async (
      label: string,
      data: unknown,
      error: unknown
    ): Promise<string> => {
      if (error) return `${label}: ${await getFunctionErrorMessage(error)}`;
      const first = (((data ?? {}) as Record<string, unknown>).posted as
        | Array<Record<string, unknown>>
        | undefined)?.[0];
      const status = first?.status ? String(first.status) : null;
      if (status === 'published') return `${label}: posted.`;
      if (status === 'failed') return `${label}: ${String(first?.error || 'it failed to post.')}`;
      if (status) return `${label}: ${status} — it will finish on the next pass.`;
      const note = ((data ?? {}) as Record<string, unknown>).note;
      return `${label}: ${note ? String(note) : 'nothing to post.'}`;
    };

    // 1) YouTube — upload now, public. `scheduled_for` in the past means
    //    run-publish-queue sends no publishAt and honours metadata.privacy.
    if (yt && yt.status !== 'published') {
      const { error } = await supabase
        .from('publications')
        .update({
          status: 'approved',
          approved_at: now,
          scheduled_for: now,
          error: null,
          attempts: 0,
          metadata: { ...(yt.metadata ?? {}), privacy: 'public' },
        })
        .eq('id', yt.id);
      if (error) throw error;
      const { error: invokeError } = await supabase.functions.invoke('run-publish-queue', { body: {} });
      if (invokeError) {
        fatal = true;
        notes.push(`YouTube: ${await getFunctionErrorMessage(invokeError)}`);
      } else {
        notes.push('YouTube: uploading now.');
      }
    }

    // 2) Instagram and 3) TikTok — one forced single post each.
    for (const [label, pub] of [
      ['Instagram', group.ig],
      ['TikTok', group.tt],
    ] as const) {
      if (!pub || pub.status === 'published') continue;
      // The browser poster owns TikTok, so the API must not race it: make the row
      // due now and let the poster claim it on its next pass.
      if (label === 'TikTok' && (settings?.social_tiktok_poster ?? 'api') === 'browser') {
        const { error } = await supabase
          .from('publications')
          .update({ status: 'scheduled', scheduled_for: now, error: null })
          .eq('id', pub.id);
        notes.push(
          error
            ? `TikTok: ${getErrorMessage(error)}`
            : 'TikTok: queued now for the browser poster (it posts on its next pass).'
        );
        continue;
      }
      const { data, error } = await supabase.functions.invoke('run-social-queue', {
        body: { publication_id: pub.id },
      });
      notes.push(await describeSocial(label, data, error));
    }

    const summary =
      notes.join(' ') || 'Nothing to publish — every platform for this song is already live.';
    await refetch();
    toast({
      title: fatal ? 'Publishing now — YouTube failed' : 'Publishing now',
      description: summary,
      variant: fatal ? 'destructive' : 'default',
    });
    return { mode: 'now', ok: !fatal, summary };
  };

  // Schedule: approve the video, give it the next free slot on the cadence, then
  // run both workers. The teasers ride the video's slot, and the social worker
  // still obeys the Auto-post switch.
  const scheduleTrack = async (group: TrackGroup): Promise<PushOutcome> => {
    const yt = group.yt;
    // Shared predicate: a row that failed its upload is bookable again (its old,
    // stale slot must not stop the retry), matching the bar and the song page.
    const bookable = trackBookable(group);
    if (yt && bookable && !yt.metadata?.description?.trim()) {
      throw new Error('Write the YouTube description first (Re-draft AI or Edit), then publish.');
    }
    let slot: string | undefined;
    if (yt && bookable) {
      const at = nextSlot();
      slot = formatWhen(at.toISOString(), tz);
      const { error } = await supabase
        .from('publications')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          scheduled_for: at.toISOString(),
          error: null,
          attempts: 0,
        })
        .eq('id', yt.id);
      if (error) throw error;
    }

    // A teaser that failed last time goes back in line, so the arm pass books it
    // on the video's slot instead of leaving the song stuck under "Needs fixing".
    const failedTeasers = [group.tt, group.ig].filter(
      (p): p is PublicationWithAsset => p?.status === 'failed'
    );
    for (const pub of failedTeasers) {
      const { error } = await supabase
        .from('publications')
        .update({
          status: 'pending_approval',
          attempts: 0,
          error: null,
          scheduled_for: null,
          metadata: withoutInstagramContainer(pub.metadata),
        })
        .eq('id', pub.id);
      if (error) throw error;
    }

    const [ytPass, socialPass] = await Promise.allSettled([
      supabase.functions.invoke('run-publish-queue', { body: {} }),
      supabase.functions.invoke('run-social-queue', { body: {} }),
    ]);
    const ytErr = ytPass.status === 'rejected' ? ytPass.reason : ytPass.value.error;
    const socialOk = socialPass.status === 'fulfilled' && !socialPass.value.error;
    const socialData = socialOk ? socialPass.value.data : null;

    const summary = [
      bookable ? `Video takes the next free slot${slot ? ` (${slot})` : ''}.` : null,
      ytErr ? `Upload pass: ${await getFunctionErrorMessage(ytErr)}` : null,
      socialPass.status === 'rejected' || socialPass.value.error
        ? 'Teaser pass failed — check Settings → Integrations.'
        : socialData?.autoPost === false
          ? 'Teasers are set to post by hand (Auto-post is off).'
          : `${socialData?.armed ?? 0} teaser(s) armed, ${socialData?.posted?.length ?? 0} posted.`,
    ]
      .filter(Boolean)
      .join(' ');

    // Refresh before announcing: the badge, the row's chip and the open song page
    // all read the same query, and leaving it stale made a just-booked song look
    // untouched (and handed a second publish the same slot).
    await refetch();
    toast({
      title: bookable ? 'Song booked' : 'Passes finished',
      description: summary,
      variant: ytErr ? 'destructive' : 'default',
    });
    return { mode: 'schedule', ok: !ytErr, slot, summary };
  };

  // "Send now" on a scheduled song in the list: skip its slot and post everywhere.
  const sendNowFor = async (requestId: string) => {
    const group = groups.find((g) => g.requestId === requestId);
    if (!group) return;
    if (
      !window.confirm(
        `Send “${group.label}” to YouTube, TikTok and Instagram right now, instead of waiting for its slot?`
      )
    ) {
      return;
    }
    await publishTrack(group, 'now');
  };

  // Opens the per-song page for a group. Keyed by request so a re-recording (which
  // can change a legacy group's asset id) keeps the page on the same song.
  // Opens it from a release-board row: find the group that row belongs to.
  const openByPub = (pub: PublicationWithAsset) => {
    const group = groups.find((g) => g.pubs.some((p) => p.id === pub.id));
    if (group) setDetailKey(group.requestId ?? group.key);
  };

  // Re-drafts one row's copy — from the song page or the pipeline card. The bulk
  // button stays on the pipeline card; this is the single-song version.
  const draftOne = async (pub: PublicationWithAsset) => {
    setDraftingId(pub.id);
    try {
      const { data, error } = await supabase.functions.invoke('draft-publication-metadata', {
        body: { asset_id: pub.asset_id, platform: pub.platform },
      });
      if (error) throw error;
      await refetch();
      if (data?.draft_source === 'template') {
        toast({
          title: 'Drafted from the template',
          description: data.draft_note || 'The AI writer was busy — edit the copy if you like.',
        });
      } else {
        toast({ title: 'Copy drafted' });
      }
    } catch (e) {
      toast({
        title: "Couldn't draft the copy",
        description: await getFunctionErrorMessage(e),
        variant: 'destructive',
      });
    } finally {
      setDraftingId(null);
    }
  };

  // Saves the exact file a row will post, so its audio can be checked locally.
  const downloadPub = async (pub: PublicationWithAsset) => {
    const asset = pub.content_assets;
    const label =
      [asset?.song_title, asset?.show].filter(Boolean).join(' ') || asset?.title || 'track';
    const suffix = pub.platform === 'youtube' ? 'video' : pub.platform === 'instagram' ? 'reel' : 'teaser';
    try {
      const url = await signedAssetDownloadUrl(pub, label, suffix);
      const a = document.createElement('a');
      a.href = url;
      a.download = assetFilename(label, asset?.mime_type, suffix);
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

  // Inline caption edit from the song page. `metadata` is jsonb and an update
  // replaces it wholesale, so merge rather than clobber the AI's other keys.
  const saveCaption = async (pub: PublicationWithAsset, caption: string) => {
    const { error } = await supabase
      .from('publications')
      .update({
        metadata: { ...(pub.metadata ?? {}), caption },
        updated_at: new Date().toISOString(),
      })
      .eq('id', pub.id);
    if (error) throw error;
    await refetch();
    toast({ title: 'Caption saved', description: 'The post will use this text.' });
  };

  // Inline YouTube copy edit from the song page. Merges the jsonb rather than
  // replacing it, then pushes the change to YouTube when the video is already
  // live (the same call the board's edit path uses).
  const saveCopy = async (
    pub: PublicationWithAsset,
    next: { title: string; description: string }
  ) => {
    const { error } = await supabase
      .from('publications')
      .update({
        metadata: {
          ...(pub.metadata ?? {}),
          title: next.title || (pub.metadata?.title ?? ''),
          description: next.description,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', pub.id);
    if (error) throw error;
    if (pub.platform_post_id) {
      const { error: syncError } = await supabase.functions.invoke('update-youtube-video', {
        body: { publication_id: pub.id },
      });
      if (syncError) {
        await refetch();
        throw new Error(
          `Saved here, but YouTube wasn’t updated: ${await getFunctionErrorMessage(syncError)}`
        );
      }
    }
    await refetch();
    toast({ title: 'Copy saved' });
  };

  // Runs one platform's pass on demand, ignoring the schedule, and prints the
  // worker's raw reply so it's obvious whether each side is wired up.
  const testPlatform = async (platform: 'youtube' | 'tiktok' | 'instagram') => {
    setTesting(platform);
    setTestResult(null);
    try {
      if (platform === 'youtube') {
        const { data, error } = await supabase.functions.invoke('run-publish-queue', { body: {} });
        if (error) throw error;
        setTestResult(JSON.stringify(data, null, 2));
      } else {
        const { data, error } = await supabase.functions.invoke('run-social-queue', {
          body: { force: true, only_platform: platform },
        });
        if (error) throw error;
        setTestResult(JSON.stringify(data, null, 2));
      }
      toast({ title: `${platform} pass finished` });
      refetch();
    } catch (e) {
      const message = await getFunctionErrorMessage(e);
      setTestResult(message);
      toast({ title: `${platform} pass failed`, description: message, variant: 'destructive' });
    } finally {
      setTesting(null);
    }
  };

  // The three buttons above only post something that is already due. This one
  // posts a teaser that is waiting, right now, so a real TikTok/Instagram post
  // can be checked end to end without waiting for a slot to come round.
  const forcePostNext = async (platform: 'tiktok' | 'instagram') => {
    const candidates = queue.filter(
      (p) =>
        p.platform === platform &&
        !p.platform_post_id &&
        !['publishing', 'published', 'skipped'].includes(p.status)
    );
    // Prefer one that already has a caption, so the test exercises posting and
    // not the "teaser has no caption" guard.
    const row = candidates.find((p) => p.metadata?.caption || p.metadata?.title) ?? candidates[0];
    if (!row) {
      toast({ title: `No ${platform} teaser waiting to post` });
      return;
    }
    // A live post that cannot be undone from here — name it before firing.
    const label =
      [row.content_assets?.song_title, row.content_assets?.show].filter(Boolean).join(' ') ||
      row.content_assets?.title ||
      'the next waiting teaser';
    const channel = platform === 'tiktok' ? 'TikTok' : 'Instagram';
    if (
      !window.confirm(
        `Post ${label} to ${channel} right now? This publishes for real, and can only be undone in the ${channel} app.`
      )
    ) {
      return;
    }
    setTesting(platform);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('run-social-queue', {
        body: { force: true, publication_id: row.id },
      });
      if (error) throw error;
      setTestResult(JSON.stringify(data, null, 2));
      toast({ title: `Posted “${row.metadata?.title || 'teaser'}” to ${platform}` });
      refetch();
    } catch (e) {
      const message = await getFunctionErrorMessage(e);
      setTestResult(message);
      toast({ title: `${platform} post failed`, description: message, variant: 'destructive' });
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-[#1C0357]">Publishing</h1>
          <p className="mt-1 max-w-3xl text-base text-gray-500">
            {queueError ? (
              <span className="font-semibold text-red-600">Couldn't load the queue</span>
            ) : (
              <>
                Every song goes <strong className="text-[#1C0357]">into the shop</strong> →{' '}
                <strong className="text-[#1C0357]">videos made</strong> →{' '}
                <strong className="text-[#1C0357]">sent to socials</strong>, now or on the next slot.
              </>
            )}
          </p>
          {queueTruncated ? (
            <p className="mt-1 text-[11px] text-amber-600">
              Showing the newest {DISPLAY_LIMIT} rows. Older ones are hidden here but still posted
              by the worker.
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {PUBLISHING_TABS.map(({ id, label, icon: Icon }) => {
          const activeTab = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-bold whitespace-nowrap transition-colors',
                activeTab
                  ? 'border-[#1C0357] bg-[#1C0357] text-white'
                  : 'border-gray-200 bg-white text-[#1C0357] hover:bg-gray-50'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>

      {queueError && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">
            The publishing queue didn't load, so this page can't tell you what needs doing:{' '}
            {getErrorMessage(queueError)}
          </span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {confirmDegraded && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">YouTube status checks are unavailable</p>
            <p className="text-amber-700">
              The channel connection can't read video status, so videos are being marked live from their
              schedule (about an hour after their slot) instead of confirmed. Reconnect the channel in
              Admin → Settings → Integrations to restore exact confirmation.
            </p>
          </div>
        </div>
      )}

      {tab === 'songs' && !openSongId && (
        <QueueRunway
          postDates={postDates}
          notQueued={notQueued}
          tz={tz}
          cadenceLabel={cadenceLabel}
        />
      )}

      {tab === 'songs' &&
        (openSongId && !queueData ? (
          // The flow decides where to start from the song's rows, so it waits
          // for them — otherwise a recorded song would open on "Check details".
          <p className="text-sm text-gray-400">Opening the song…</p>
        ) : openSongId ? (
          <ReleaseWizard
            key={openSongId}
            requestId={openSongId}
            queue={queue}
            groups={groups}
            nextSlotLabel={formatWhen(nextSlot().toISOString(), tz)}
            autoOn={autoOn}
            tz={tz}
            onPush={publishTrack}
            onRefresh={async () => (await refetch()).data?.queue ?? []}
            onSaveCaption={saveCaption}
            onSaveCopy={saveCopy}
            onClose={() => openSong(null)}
          />
        ) : (
          <ReleaseBoard
            queue={queue}
            tz={tz}
            onMutation={() => refetch()}
            onOpenTrack={openByPub}
            onOpenSong={openSong}
            onSendNow={sendNowFor}
            sendingId={sendingId}
          />
        ))}

      {tab === 'recorder' && (
        <Suspense fallback={<p className="text-sm text-gray-400">Loading…</p>}>
          <TitleCardGenerator />
        </Suspense>
      )}

      {tab === 'settings' && (
        <>
          <SlotSettings
            pendingCount={notQueued + active.length}
            existingSlots={existingDates}
            onRespace={respace}
            respaceCount={respaceableCount}
            respacing={respacing}
          />

          {/* Troubleshooting: the workers normally run every 15 minutes on their
              own. These are for checking the wiring, not for day-to-day posting —
              that is the Songs tab. */}
          <Disclosure title="Troubleshooting" hint="run the posting workers by hand">
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                The workers post whatever is due every 15 minutes on their own. You don't need these
                to publish a song — use <strong>Songs</strong> for that. They're here to check the
                connections and see exactly what each worker says.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={runNow} disabled={running}>
                  <Rocket className="h-3.5 w-3.5" /> {running ? 'Running…' : 'Run everything due now'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testPlatform('youtube')}
                  disabled={testing !== null}
                >
                  <Youtube className="h-3.5 w-3.5" /> {testing === 'youtube' ? 'Running…' : 'Run YouTube'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testPlatform('tiktok')}
                  disabled={testing !== null}
                >
                  <ListChecks className="h-3.5 w-3.5" /> {testing === 'tiktok' ? 'Running…' : 'Run TikTok'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testPlatform('instagram')}
                  disabled={testing !== null}
                >
                  <Instagram className="h-3.5 w-3.5" /> {testing === 'instagram' ? 'Running…' : 'Run Instagram'}
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                <span className="text-xs text-gray-500">Post one teaser now, without waiting for its slot:</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => forcePostNext('tiktok')}
                  disabled={testing !== null}
                >
                  <ListChecks className="h-3.5 w-3.5" /> Next TikTok teaser
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => forcePostNext('instagram')}
                  disabled={testing !== null}
                >
                  <Instagram className="h-3.5 w-3.5" /> Next Instagram teaser
                </Button>
              </div>
              {testResult && (
                <pre className="max-h-72 overflow-auto rounded-xl bg-gray-900 p-3 text-[11px] leading-relaxed text-gray-100">
                  {testResult}
                </pre>
              )}
            </div>
          </Disclosure>
        </>
      )}

      {/* The song's status page: files, teasers, downloads, retries. Sending
          always happens in the song flow, so its last button hands over there. */}
      {detailGroup && (
        <TrackDetail
          key={detailGroup.key}
          group={detailGroup}
          track={detailTrack}
          products={shopProducts}
          tz={tz}
          autoOn={autoOn}
          draftingId={draftingId}
          onClose={() => setDetailKey(null)}
          onSend={
            detailGroup.requestId
              ? () => {
                  setDetailKey(null);
                  openSong(detailGroup.requestId);
                }
              : undefined
          }
          onDraft={draftOne}
          onRecord={setReRecordFor}
          onRetry={retryTeaser}
          onDownload={downloadPub}
          onSaveCaption={saveCaption}
          onSaveCopy={saveCopy}
        />
      )}

      {reRecordFor && (
        <VettingDialog
          requestId={reRecordFor}
          teaserOnly
          onClose={() => setReRecordFor(null)}
          onQueued={() => {
            setReRecordFor(null);
            refetch();
          }}
        />
      )}
    </div>
  );
};

export default PublishingSection;