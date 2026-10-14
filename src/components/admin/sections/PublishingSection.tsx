import { lazy, Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn, getErrorMessage, getFunctionErrorMessage } from '@/lib/utils';
import { allocatePublishingSlots } from '@/utils/nextWeeklySlot';
import {
  PLATFORM_LABELS,
  STATUS_LABELS,
  WEEKDAYS,
  type PublicationWithAsset,
  type PublishingSettings,
} from '@/types/publishing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { AlertTriangle, CalendarClock, Clapperboard, Eye, Instagram, Library, ListChecks, ListPlus, Loader2, RefreshCw, Rocket, Settings2, SlidersHorizontal, Trash2, Video, Youtube } from 'lucide-react';
import CardPreview from '@/components/admin/CardPreview';
import TikTokComposer from '@/components/admin/TikTokComposer';
import { useDeliveredTracks, useShopProducts } from '@/hooks/useDeliveredTracks';
import ReleaseBoard, { VettingDialog } from '@/components/admin/sections/ReleaseBoard';
import { Disclosure, TrackPipelineRow } from '@/components/admin/sections/PublishingBands';
import TrackDetail from '@/components/admin/sections/TrackDetail';
import { assetFilename, signedAssetDownloadUrl } from '@/utils/assetDownload';
import {
  groupPublications,
  isPostable,
  needsAttention,
  teaserProblem,
  type TrackGroup,
} from '@/utils/publishingPipeline';

// The page is four tabs now: what needs you, the full track list, the recorder
// that feeds it, and the cadence settings you rarely touch.
type PublishingTab = 'pipeline' | 'tracks' | 'recorder' | 'settings';

const PUBLISHING_TABS: { id: PublishingTab; label: string; icon: typeof ListChecks }[] = [
  { id: 'pipeline', label: 'Pipeline', icon: ListChecks },
  { id: 'tracks', label: 'Tracks', icon: Library },
  { id: 'recorder', label: 'Recorder', icon: Clapperboard },
  { id: 'settings', label: 'Settings', icon: Settings2 },
];

// The teaser side of a "needs you" row: one line per platform that can't move on
// its own, with the single action that unblocks it.
function TeaserNeeds({
  group,
  autoOn,
  onCompose,
  onRecord,
  onRetry,
}: {
  group: TrackGroup;
  autoOn: boolean;
  onCompose: (id: string) => void;
  onRecord: (requestId: string) => void;
  onRetry: (id: string) => void;
}) {
  const lines: Array<{
    platform: 'tiktok' | 'instagram';
    pub: PublicationWithAsset;
    note: string;
    action: 'record' | 'compose' | 'retry';
  }> = [];
  for (const platform of ['tiktok', 'instagram'] as const) {
    const pub = platform === 'tiktok' ? group.tt : group.ig;
    if (!pub) continue;
    const problem = teaserProblem(pub, group, autoOn);
    if (problem) lines.push({ platform, pub, ...problem });
  }
  if (lines.length === 0) return null;

  return (
    <div className="space-y-1.5 border-t border-gray-100 bg-gray-50/60 px-4 py-2.5">
      {lines.map(({ platform, pub, note, action }) => {
        // Only TikTok has a compose flow, and re-recording is the one fix that
        // helps both platforms. Anything else on Instagram waits on its
        // connection in Settings → Integrations.
        const igBlocked = platform === 'instagram' && action !== 'record';
        return (
          <div key={platform} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="font-semibold text-[#1C0357]">{PLATFORM_LABELS[platform]}</span>
            <span className={cn('min-w-0 flex-1', action === 'retry' ? 'text-red-600' : 'text-gray-500')}>
              {igBlocked ? 'Instagram isn’t connected yet (Settings → Integrations).' : note}
            </span>
            {action === 'record' ? (
              group.requestId ? (
                <Button size="sm" variant="outline" onClick={() => onRecord(group.requestId as string)}>
                  Record teaser
                </Button>
              ) : (
                <span className="text-gray-400">Re-record it on the release board</span>
              )
            ) : igBlocked ? null : action === 'compose' ? (
              <Button size="sm" variant="outline" onClick={() => onCompose(pub.id)}>
                Post it
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => onRetry(pub.id)}>
                Retry
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// The whole pipeline for one song in a single press: approve the video, give it
// the next free slot on the cadence, and run both workers. This is the action
// the per-song page is built around, so it lives here first.
function PublishTrackBar({
  group,
  autoOn,
  busy,
  onPublish,
}: {
  group: TrackGroup;
  autoOn: boolean;
  busy: boolean;
  onPublish: () => void;
}) {
  const yt = group.yt;
  const bookable =
    !!yt && ['draft', 'pending_approval', 'approved', 'failed'].includes(yt.status) && !yt.scheduled_for;
  const missingCopy = bookable && !yt?.metadata?.description?.trim();
  const teasers = [group.tt, group.ig].filter((t): t is PublicationWithAsset => !!t);
  const teasersReady = teasers.length > 0 && teasers.every((t) => isPostable(t));
  const teaserWaiting = teasers.some(
    (t) => t.status === 'draft' || t.status === 'pending_approval' || t.status === 'failed'
  );
  const nothingToDo = !bookable && !teaserWaiting;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[#1C0357]/5 bg-[#1C0357]/[0.03] px-4 py-2.5">
      <Button size="sm" onClick={onPublish} disabled={busy || missingCopy || nothingToDo}>
        {busy ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <ListPlus className="mr-1.5 h-4 w-4" />
        )}
        Publish this song
      </Button>
      <span className="min-w-0 flex-1 text-xs text-gray-500">
        {missingCopy
          ? 'Write the YouTube description first — then this books the slot and posts the teasers on it.'
          : nothingToDo
            ? 'Everything here is already booked or live.'
            : !teasersReady
              ? 'Books the next free slot. The teasers still need a portrait MP4 before they can go out.'
              : autoOn
                ? 'Books the next free slot; the teasers post on it automatically.'
                : 'Books the next free slot. Auto-post is off, so you post the teasers by hand.'}
      </span>
    </div>
  );
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

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending_approval: 'bg-amber-100 text-amber-700',
  approved: 'bg-sky-100 text-sky-700',
  scheduled: 'bg-blue-100 text-blue-700',
  publishing: 'bg-violet-100 text-violet-700',
  published: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  skipped: 'bg-gray-100 text-gray-400',
};

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

  function final(key: 'schedule_mode'): 'weekly' | 'interval';
  function final(key: 'interval_days' | 'weekly_dow' | 'social_offset_minutes'): number;
  function final(key: 'weekly_time' | 'timezone' | 'social_tiktok_privacy'): string;
  function final(key: 'auto_schedule' | 'auto_book' | 'social_auto_post'): boolean;
  function final(key: string): string | number | boolean {
    switch (key) {
      case 'social_auto_post':
        return socialAuto ?? settings?.social_auto_post ?? false;
      case 'social_offset_minutes':
        return Number(socialOffset ?? String(settings?.social_offset_minutes ?? 0)) || 0;
      case 'social_tiktok_privacy':
        return tikTokPrivacy ?? settings?.social_tiktok_privacy ?? 'SELF_ONLY';
      case 'schedule_mode':
        return (mode ?? settings?.schedule_mode ?? 'weekly') as 'weekly' | 'interval';
      case 'interval_days':
        return days !== null
          ? Math.min(Math.max(Number(days), 1), 90)
          : settings?.interval_days ?? 3;
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
    const { error } = await supabase
      .from('publishing_settings')
      .update({
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
      })
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
                value={days ?? String(settings.interval_days ?? 3)}
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
                ? 'A video you queue on the release board is booked and uploaded on its own — that queue step is the approval.'
                : 'Every queued video waits for you to book it (Pipeline → Book slots, or Publish this song).'}
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
                <Label>TikTok privacy for automated posts</Label>
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
                  An unaudited TikTok app is forced to <em>Only me</em> no matter what you pick here.
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
// Metadata editor dialog
// ---------------------------------------------------------------------------
function MetadataDialog({
  publication,
  open,
  onOpenChange,
  onSaved,
}: {
  publication: PublicationWithAsset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const meta = publication.metadata || {};
  const [title, setTitle] = useState(meta.title ?? '');
  const [description, setDescription] = useState(meta.description ?? '');
  const [tags, setTags] = useState((meta.tags ?? []).join(', '));
  const [hashtags, setHashtags] = useState((meta.hashtags ?? []).join(', '));
  const [privacy, setPrivacy] = useState<'private' | 'unlisted' | 'public'>(
    meta.privacy ?? 'unlisted'
  );

  const save = async () => {
    setSaving(true);
    const next = {
      ...meta,
      title: title.trim(),
      description: description.trim(),
      tags: tags.split(/[,;\n]/).map((t) => t.trim()).filter(Boolean).slice(0, 10),
      hashtags: hashtags.split(/[,;\n]/).map((h) => h.trim().replace(/^#/, '')).filter(Boolean).slice(0, 6),
      privacy,
    };
    const { error } = await supabase
      .from('publications')
      .update({ metadata: next })
      .eq('id', publication.id);
    if (error) {
      setSaving(false);
      toast({ title: "Couldn't save metadata", description: getErrorMessage(error), variant: 'destructive' });
      return;
    }
    // Already uploaded? Push the edited metadata to the live YouTube video.
    if (publication.platform === 'youtube' && publication.platform_post_id) {
      const { error: syncError } = await supabase.functions.invoke('update-youtube-video', {
        body: { publication_id: publication.id },
      });
      setSaving(false);
      if (syncError) {
        toast({
          title: 'Metadata saved locally',
          description: `The YouTube video wasn't updated: ${getErrorMessage(syncError)}`,
          variant: 'destructive',
        });
        onOpenChange(false);
        onSaved();
        return;
      }
      toast({ title: 'Metadata saved and synced to YouTube' });
    } else {
      setSaving(false);
      toast({ title: 'Metadata saved' });
    }
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit {PLATFORM_LABELS[publication.platform]} metadata</DialogTitle>
        </DialogHeader>
        <div className="mb-4 flex flex-col items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 py-3">
          <Label className="w-full px-4 text-xs text-gray-500">
            Card preview — check the key before approving
          </Label>
          <div className="px-4">
            <CardPreview
              previewPath={publication.content_assets?.preview_path ?? null}
              title={publication.content_assets?.title ?? null}
              show={publication.content_assets?.show ?? null}
              musicalKey={publication.content_assets?.key ?? null}
              aspect={publication.content_assets?.aspect ?? null}
            />
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={9}
              className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F538BC]/40"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tags (comma separated)</Label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Hashtags (comma separated, no #)</Label>
              <Input value={hashtags} onChange={(e) => setHashtags(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Privacy</Label>
            <Select value={privacy} onValueChange={(v) => setPrivacy(v as 'private' | 'unlisted' | 'public')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unlisted">Unlisted (link only)</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-[#1C0357] hover:bg-[#1C0357]/90">
            {saving ? 'Saving…' : 'Save metadata'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Queue item row
// ---------------------------------------------------------------------------
function QueueRow({
  publication,
  tz,
  nextSlot,
  autoSchedule,
  onMutation,
  onOpen,
}: {
  publication: PublicationWithAsset;
  tz: string;
  nextSlot: () => Date;
  autoSchedule: boolean;
  onMutation: () => void;
  /** Opens the per-song page for this row's track. */
  onOpen?: () => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<'approve' | 'schedule' | 'publish' | 'retry' | 'refresh' | 'draft' | 'delete' | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [manualWhen, setManualWhen] = useState('');
  const asset = publication.content_assets;
  const label = [asset?.song_title, asset?.show].filter(Boolean).join(' — ') || asset?.title || 'Untitled video';
  const key = asset?.key?.replace(/ \([^)]*\)$/, '') || null;

  const run = async (fn: () => Promise<void>, which: NonNullable<typeof busy>, done: string) => {
    setBusy(which);
    try {
      await fn();
      toast({ title: done });
      onMutation();
    } catch (e) {
      toast({ title: 'Action failed', description: await getFunctionErrorMessage(e), variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  // Approve & schedule = mark approved, assign the next weekly slot (if auto),
  // then kick the queue so the video is uploaded to YouTube immediately as a
  // private video that YouTube itself publishes at `scheduled_for`.
  // Requires drafted metadata: a video going out with an empty description
  // looks broken on the channel.
  const needsDraft = !publication.metadata?.description?.trim();
  const guardDrafted = () => {
    if (!needsDraft) return true;
    toast({
      title: 'Draft the metadata first',
      description:
        'This video has no description yet — use Re-draft AI or Edit before approving, so the upload carries proper metadata (and its shop link).',
      variant: 'destructive',
    });
    return false;
  };

  const approve = () => {
    if (!guardDrafted()) return;
    return run(async () => {
      const { data: user } = await supabase.auth.getUser();
      const patch: Record<string, unknown> = {
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user.user?.id ?? null,
        error: null,
        attempts: 0,
      };
      if (autoSchedule) {
        patch.scheduled_for = nextSlot().toISOString();
      }
      const { error } = await supabase.from('publications').update(patch).eq('id', publication.id);
      if (error) throw error;
      const { error: invokeError } = await supabase.functions.invoke('run-publish-queue', { body: {} });
      if (invokeError) throw invokeError;
    }, 'approve', 'Approved — uploading to YouTube');
  };

  // Publish now = upload immediately (no publishAt), via the same queue path.
  const publishNow = () => {
    if (!guardDrafted()) return;
    return run(async () => {
      const { error } = await supabase
        .from('publications')
        .update({
          status: 'approved',
          scheduled_for: new Date().toISOString(),
          error: null,
          attempts: 0,
        })
        .eq('id', publication.id);
      if (error) throw error;
      const { error: invokeError } = await supabase.functions.invoke('run-publish-queue', { body: {} });
      if (invokeError) throw invokeError;
    }, 'publish', 'Published');
  };

  const redraft = () =>
    run(async () => {
      const { error } = await supabase.functions.invoke('draft-publication-metadata', {
        body: { asset_id: publication.asset_id, platform: publication.platform },
      });
      if (error) throw error;
      // Already uploaded? Push the regenerated metadata to the live video too.
      if (publication.platform_post_id) {
        const { error: syncError } = await supabase.functions.invoke('update-youtube-video', {
          body: { publication_id: publication.id },
        });
        if (syncError) {
          toast({
            title: 'Metadata regenerated',
            description: `Saved to the queue, but the YouTube video wasn't updated: ${getErrorMessage(syncError)}`,
            variant: 'destructive',
          });
        }
      }
    }, 'draft', 'Metadata regenerated');

  // Manual slot: lets a publish time be chosen even when auto_schedule is off
  // (or to override the auto slot for one video). Uploads via the same queue.
  const scheduleManual = () => {
    if (!guardDrafted()) return;
    return run(async () => {
      const when = new Date(manualWhen);
      if (Number.isNaN(when.getTime())) throw new Error('Choose a publish time first.');
      const { error } = await supabase
        .from('publications')
        .update({
          status: 'approved',
          scheduled_for: when.toISOString(),
          error: null,
          attempts: 0,
        })
        .eq('id', publication.id);
      if (error) throw error;
      const { error: invokeError } = await supabase.functions.invoke('run-publish-queue', { body: {} });
      if (invokeError) throw invokeError;
      setScheduleOpen(false);
      setManualWhen('');
    }, 'schedule', 'Scheduled — uploading to YouTube');
  };

  // Remove a row from the catalogue. Deletes the publication row; when no other
  // platform row references the asset (e.g. a TikTok/IG draft of the same
  // video), the asset and its archived files go too. YouTube's history is
  // untouched — this only cleans our publishing catalogue.
  const removeRow = () => {
    if (!window.confirm(
      'Delete this video from the catalogue?\n\nIt is removed from the publishing catalogue (this admin). The video is NOT deleted from YouTube itself.\n\nThis cannot be undone.'
    )) return;
    return run(async () => {
      const { data: sibling, error: sibErr } = await supabase
        .from('publications')
        .select('id')
        .eq('asset_id', publication.asset_id)
        .neq('id', publication.id)
        .limit(1)
        .maybeSingle();
      if (sibErr) throw sibErr;

      // Only retire the shared asset + its files when no other publication
      // (e.g. a TikTok/IG draft) still references them.
      if (!sibling) {
        await supabase.storage.from('content').remove(
          [asset?.storage_path, asset?.preview_path].filter((p): p is string => !!p)
        );
        const { error: assetErr } = await supabase
          .from('content_assets')
          .delete()
          .eq('id', publication.asset_id);
        if (assetErr) throw assetErr;
      }
      const { error: pubErr } = await supabase
        .from('publications')
        .delete()
        .eq('id', publication.id);
      if (pubErr) throw pubErr;
    }, 'delete', 'Queued video deleted');
  };

  // Live state from YouTube (promotion to public, processed status, failures)
  // rather than trusting the DB's assumption that the slot has come and gone.
  const checkStatus = () =>
    run(async () => {
      const { data, error } = await supabase.functions.invoke<{
        processed: number;
        error?: string;
      }>('check-publication-status', { body: { publication_id: publication.id } });
      if (error) throw error;
      if (data && typeof data.error === 'string') throw new Error(data.error);
    }, 'refresh', 'Status refreshed');

  return (
    <>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <Video className="hidden sm:block h-5 w-5 text-gray-300 shrink-0" />
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          title={showPreview ? 'Hide card preview' : 'Show card preview (PDF)'}
          className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 transition-colors hover:border-[#F538BC]"
        >
          {showPreview ? (
            <span className="flex h-full w-full items-center justify-center text-[#1C0357]">
              <Video className="h-4 w-4" />
            </span>
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[#1C0357]">
              <Eye className="h-4 w-4" />
            </span>
          )}
        </button>
        <div className="min-w-0 flex-1">
          {onOpen ? (
            <button
              type="button"
              onClick={onOpen}
              title="Open the song page — everything about this song in one place"
              className="flex max-w-full items-center gap-1.5 text-left font-bold text-[#1C0357] hover:text-[#F538BC] hover:underline"
            >
              <Library className="h-3.5 w-3.5 shrink-0 text-gray-300" />
              <span className="truncate">{label}</span>
            </button>
          ) : (
            <p className="truncate font-bold text-[#1C0357]">{label}</p>
          )}
          <p className="truncate text-xs text-gray-500">
            {asset?.title || '—'} {key ? `· ${key}` : ''}
            {publication.scheduled_for ? ` · ${formatWhen(publication.scheduled_for, tz)}` : ''}
            {publication.platform_post_id ? ` · youtu.be/${publication.platform_post_id}` : ''}
          </p>
          {publication.error && (
            <p className="mt-1 truncate text-xs text-red-600">{publication.error}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:flex-col lg:flex-row">
          <Badge className={STATUS_STYLE[publication.status]}>{STATUS_LABELS[publication.status]}</Badge>
          <Badge variant="outline">{PLATFORM_LABELS[publication.platform]}</Badge>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {onOpen && (
            <Button variant="outline" size="sm" onClick={onOpen}>
              <Library className="h-3.5 w-3.5" /> Song page
            </Button>
          )}
          {['published', 'scheduled'].includes(publication.status) && publication.url && (
            <Button variant="outline" size="sm" asChild>
              <a href={publication.url} target="_blank" rel="noreferrer">View</a>
            </Button>
          )}
          {['draft', 'pending_approval', 'approved', 'scheduled', 'failed'].includes(publication.status) && (
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <SlidersHorizontal className="h-3.5 w-3.5" /> Edit
            </Button>
          )}
          {publication.platform !== 'youtube' &&
            ['draft', 'pending_approval'].includes(publication.status) && (
              <span className="text-[11px] text-gray-400" title="The posting integration for this platform isn't available yet, so it can't be approved or published.">
                Posting pending
              </span>
            )}
          {publication.platform === 'youtube' &&
            ['draft', 'pending_approval', 'approved', 'failed'].includes(publication.status) && (
              <Button size="sm" className="bg-[#1C0357] hover:bg-[#1C0357]/90" onClick={approve} disabled={busy !== null}>
                {busy === 'approve' ? '…' : 'Approve & schedule'}
              </Button>
            )}
          {publication.platform === 'youtube' &&
            ['draft', 'pending_approval', 'scheduled', 'failed'].includes(publication.status) && (
              <Button variant="outline" size="sm" onClick={redraft} disabled={busy !== null}>
                <RefreshCw className="h-3.5 w-3.5" /> Re-draft AI
              </Button>
            )}
          {publication.platform === 'youtube' &&
            ['approved', 'failed'].includes(publication.status) && (
              <Button variant="outline" size="sm" onClick={() => setScheduleOpen(true)} disabled={busy !== null}>
                <CalendarClock className="h-3.5 w-3.5" /> Schedule…
              </Button>
            )}
          {publication.platform === 'youtube' &&
            ['approved', 'failed'].includes(publication.status) && (
              <Button size="sm" className="bg-[#F538BC] hover:bg-[#F538BC]/90" onClick={publishNow} disabled={busy !== null}>
                <Rocket className="h-3.5 w-3.5" /> Publish now
              </Button>
            )}
          {publication.platform === 'youtube' &&
            (publication.status === 'scheduled' || publication.status === 'publishing') && (
              <Button variant="outline" size="sm" onClick={checkStatus} disabled={busy !== null}>
                {busy === 'refresh' ? '…' : 'Check'}
              </Button>
            )}
          <Button variant="outline" size="sm" onClick={removeRow} disabled={busy !== null}>
            {busy === 'delete' ? '…' : <Trash2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
      {showPreview && (
        <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-4">
          <CardPreview
            previewPath={asset?.preview_path ?? null}
            title={asset?.title ?? null}
            show={asset?.show ?? null}
            musicalKey={asset?.key ?? null}
            aspect={asset?.aspect ?? null}
            maxWidth={320}
            enabled={showPreview}
          />
        </div>
      )}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule publish</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Label htmlFor="publish-when">
              Publish time (local to your browser; YouTube promotes the private
              video to public exactly then)
            </Label>
            <Input
              id="publish-when"
              type="datetime-local"
              value={manualWhen}
              onChange={(e) => setManualWhen(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>Cancel</Button>
            <Button
              className="bg-[#1C0357] hover:bg-[#1C0357]/90"
              onClick={scheduleManual}
              disabled={busy !== null}
            >
              {busy === 'schedule' ? '…' : 'Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <MetadataDialog
        publication={publication}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={onMutation}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Main section
// ---------------------------------------------------------------------------
const PublishingSection = () => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('sub');
  const tab: PublishingTab = PUBLISHING_TABS.some((t) => t.id === rawTab)
    ? (rawTab as PublishingTab)
    : 'pipeline';
  const setTab = (next: PublishingTab) => {
    const sp = new URLSearchParams(searchParams);
    if (next === 'pipeline') sp.delete('sub');
    else sp.set('sub', next);
    setSearchParams(sp, { replace: false });
  };
  const [bulkDrafting, setBulkDrafting] = useState(false);
  // Admin test hooks: which platform pass is running, and the raw worker reply
  // so the pipeline can be verified from the page.
  const [testing, setTesting] = useState<'youtube' | 'tiktok' | 'instagram' | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  // True when the last queue run couldn't read video status from YouTube, so
  // "published" is being inferred from the schedule rather than confirmed.
  const [confirmDegraded, setConfirmDegraded] = useState(false);
  const [running, setRunning] = useState(false);
  // Track whose teaser is being re-recorded from the "needs you" band — the same
  // teaser-only recorder the release board uses.
  const [reRecordFor, setReRecordFor] = useState<string | null>(null);
  const [respacing, setRespacing] = useState(false);
  const [composerId, setComposerId] = useState<string | null>(null);
  // The song currently being booked by "Publish this song".
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

  const {
    data: queue = [],
    isLoading,
    error: queueError,
    refetch,
  } = useQuery<PublicationWithAsset[], Error>({
    queryKey: ['publications_queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('publications')
        .select('*, content_assets(*)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as PublicationWithAsset[];
    },
  });

  const tz = settings?.timezone ?? 'Australia/Sydney';
  // The automation switch. It decides whether a booked teaser will move on its
  // own or is waiting for a hand-post, so the "needs you" band reads from it.
  const autoOn = settings?.social_auto_post === true;

  // YouTube-only queue, used for the bulk draft/schedule buttons.
  const youtubeQueue = queue.filter((p) => p.platform === 'youtube');
  const active = youtubeQueue.filter((p) => p.status !== 'skipped' && p.status !== 'published');

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

  const existingDates = queue
    .map((p) => p.scheduled_for)
    .filter((s): s is string => !!s)
    .map((s) => new Date(s));

  const nextSlot = () =>
    allocatePublishingSlots(
      settings ?? { schedule_mode: 'weekly', interval_days: null, weekly_dow: 2, weekly_time: '09:00', timezone: tz },
      1,
      existingDates
    )[0];

  // One row per song, all three platforms together. The page is just three
  // slices of this: needs a human, booked, or already live.
  const groups = useMemo(() => groupPublications(queue), [queue]);
  const needsYou = groups.filter((g) => needsAttention(g, autoOn));
  const bookedGroups = groups.filter(
    (g) =>
      !needsAttention(g, autoOn) &&
      g.pubs.some((p) => p.status === 'scheduled' || p.status === 'publishing')
  );
  const liveGroups = groups.filter(
    (g) =>
      !needsAttention(g, autoOn) &&
      !g.pubs.some((p) => p.status === 'scheduled' || p.status === 'publishing') &&
      g.pubs.some((p) => p.status === 'published')
  );

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

  // What the two bulk buttons would do right now, so they can show the number
  // and switch themselves off when there's nothing left to do — instead of
  // doing nothing and explaining afterwards.
  const missingMetadata = active.filter(
    (p) =>
      ['draft', 'pending_approval', 'approved', 'failed', 'scheduled'].includes(p.status) &&
      !p.metadata?.description?.trim()
  ).length;
  const readyToBook = active.filter(
    (p) =>
      ['draft', 'pending_approval', 'approved', 'failed'].includes(p.status) &&
      !!p.metadata?.description?.trim() &&
      !p.scheduled_for
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
    const { error } = await supabase
      .from('publications')
      .update({ status: 'pending_approval', attempts: 0, error: null, scheduled_for: null })
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

  // Clears the TikTok/Instagram rows for a song so its teaser can be recorded
  // and posted again. Nothing is deleted from TikTok itself — that stays in the
  // app, by hand.
  const resetTeaserFor = async (group: TrackGroup) => {
    if (
      !window.confirm(
        `Reset the TikTok/Instagram teaser rows for "${group.label}"? You'll need to record and post them again. Anything already on TikTok is not deleted — remove it in the TikTok app.`
      )
    ) {
      return;
    }
    const ids = [group.tt?.id, group.ig?.id].filter((id): id is string => !!id);
    if (ids.length === 0) {
      toast({ title: 'No teaser rows to reset', variant: 'destructive' });
      return;
    }
    const { error } = await supabase
      .from('publications')
      .update({ status: 'pending_approval', scheduled_for: null, platform_post_id: null, published_at: null, error: null })
      .in('id', ids);
    if (error) {
      toast({ title: "Couldn't reset the teaser", description: getErrorMessage(error), variant: 'destructive' });
      return;
    }
    await refetch();
    toast({ title: 'Teaser reset', description: `${group.label} can be recorded and posted again.` });
  };

  // Bulk action: give every vetted-but-unscheduled YouTube row its own cadence
  // slot in one go, then kick the queue so the first upload begins now.
  // Bulk recovery: (re)generate metadata for every active row that still has no
  // description, so a batch of failed AI drafts is one click to fix.
  const draftAll = async () => {
    const missing = active.filter(
      (p) =>
        ['draft', 'pending_approval', 'approved', 'failed', 'scheduled'].includes(p.status) &&
        !p.metadata?.description?.trim()
    );
    if (missing.length === 0) {
      toast({ title: 'Every queue row already has metadata' });
      return;
    }
    if (!window.confirm(`Draft metadata for ${missing.length} video${missing.length === 1 ? '' : 's'}?`)) return;
    setBulkDrafting(true);
    let ok = 0;
    let failed = 0;
    let lastError = '';
    for (const p of missing) {
      try {
        const { error } = await supabase.functions.invoke('draft-publication-metadata', {
          body: { asset_id: p.asset_id, platform: p.platform },
        });
        if (error) throw error;
        ok += 1;
      } catch (e) {
        failed += 1;
        lastError = await getFunctionErrorMessage(e);
      }
    }
    setBulkDrafting(false);
    refetch();
    toast({
      title: `Drafted ${ok} of ${missing.length}`,
      description: failed ? `${failed} failed — ${lastError}` : undefined,
      variant: failed ? 'destructive' : 'default',
    });
  };

  const scheduleAll = async () => {
    const ready = active.filter(
      (p) =>
        p.platform === 'youtube' &&
        ['draft', 'pending_approval', 'approved', 'failed'].includes(p.status) &&
        !!p.metadata?.description?.trim() &&
        !p.scheduled_for
    );
    if (ready.length === 0) {
      toast({ title: 'Nothing ready to schedule', description: 'Rows need drafted metadata (Re-draft AI / Edit) and no existing slot.' });
      return;
    }
    if (!window.confirm(`Assign the next ${ready.length} free slot${ready.length === 1 ? '' : 's'} to ${ready.length} approved video${ready.length === 1 ? '' : 's'} and start uploading?`)) return;

    const existing = active
      .map((p) => p.scheduled_for)
      .filter((s): s is string => !!s)
      .map((s) => new Date(s));
    const slots = allocatePublishingSlots(
      settings ?? { schedule_mode: 'weekly', interval_days: null, weekly_dow: 2, weekly_time: '09:00', timezone: tz },
      ready.length,
      existing
    );
    for (let i = 0; i < ready.length; i++) {
      const { error } = await supabase
        .from('publications')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          scheduled_for: slots[i].toISOString(),
          error: null,
          attempts: 0,
        })
        .eq('id', ready[i].id);
      if (error) throw error;
    }
    // Booking is a YouTube job. The social worker is deliberately NOT run here:
    // teasers are armed by the queue when Auto-post is on, or posted by hand.
    // Running it here used to force-post teasers even with the switch off.
    const { error: uploadError } = await supabase.functions.invoke('run-publish-queue', { body: {} });
    toast({
      title: `Scheduled ${ready.length} video${ready.length === 1 ? '' : 's'}`,
      description: uploadError ? `Upload pass failed: ${await getFunctionErrorMessage(uploadError)}` : undefined,
      variant: uploadError ? 'destructive' : 'default',
    });
    refetch();
  };

  // One song, one press: approve its video, give it the next free slot on the
  // cadence, then run both workers. The teasers ride the video's slot, and the
  // social worker still obeys the Auto-post switch, so this can never post a
  // teaser behind the owner's back — it only does what the cron would have done.
  const publishTrack = async (group: TrackGroup) => {
    const yt = group.yt;
    setPublishingKey(group.key);
    try {
      const bookable =
        !!yt &&
        ['draft', 'pending_approval', 'approved', 'failed'].includes(yt.status) &&
        !yt.scheduled_for;
      if (yt && bookable && !yt.metadata?.description?.trim()) {
        throw new Error('Write the YouTube description first (Re-draft AI or Edit), then publish.');
      }
      if (yt && bookable) {
        const { error } = await supabase
          .from('publications')
          .update({
            status: 'approved',
            approved_at: new Date().toISOString(),
            scheduled_for: nextSlot().toISOString(),
            error: null,
            attempts: 0,
          })
          .eq('id', yt.id);
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
        bookable ? 'Video takes the next free slot.' : null,
        ytErr ? `Upload pass: ${await getFunctionErrorMessage(ytErr)}` : null,
        socialPass.status === 'rejected' || socialPass.value.error
          ? 'Teaser pass failed — check Settings → Integrations.'
          : socialData?.autoPost === false
            ? 'Teasers are set to post by hand (Auto-post is off).'
            : `${socialData?.armed ?? 0} teaser(s) armed, ${socialData?.posted?.length ?? 0} posted.`,
      ]
        .filter(Boolean)
        .join(' ');

      toast({
        title: bookable ? 'Song booked' : 'Passes finished',
        description: summary,
        variant: ytErr ? 'destructive' : 'default',
      });
    } catch (e) {
      toast({ title: "Couldn't publish this song", description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setPublishingKey(null);
    }
  };

  // Opens the per-song page for a group. Keyed by request so a re-recording (which
  // can change a legacy group's asset id) keeps the page on the same song.
  const openTrack = (group: TrackGroup) => setDetailKey(group.requestId ?? group.key);

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
      const { error } = await supabase.functions.invoke('draft-publication-metadata', {
        body: { asset_id: pub.asset_id, platform: pub.platform },
      });
      if (error) throw error;
      await refetch();
      toast({ title: 'Copy drafted' });
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
          <h2 className="text-2xl font-bold text-[#1C0357]">Publishing</h2>
          <p className="text-sm text-gray-500">
            {queueError ? (
              <span className="font-semibold text-red-600">Couldn't load the queue</span>
            ) : needsYou.length > 0 ? (
              <>
                <span className="font-semibold text-amber-600">{needsYou.length}</span> need you
              </>
            ) : (
              <span className="font-semibold text-emerald-600">All caught up</span>
            )}
            {' · '}
            <span className="font-semibold text-[#1C0357]">{bookedGroups.length}</span> booked
            {' · '}
            <span className="font-semibold text-[#1C0357]">{liveGroups.length}</span> live
            {autoOn ? ' · teasers post automatically' : ' · teasers post by hand'}
          </p>
        </div>
        <Button variant="outline" onClick={runNow} disabled={running}>
          <Rocket className="h-4 w-4" /> {running ? 'Running…' : 'Run now'}
        </Button>
      </div>

      {/* Four tabs instead of a page of stacked panels. The tab lives in the
          URL (?sub=tracks), so a link can point straight at it. */}
      <div className="flex gap-2 overflow-x-auto">
        {PUBLISHING_TABS.map(({ id, label, icon: Icon }) => {
          const activeTab = tab === id;
          const badge = id === 'pipeline' ? needsYou.length : 0;
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
              {badge > 0 && (
                <span
                  className={cn(
                    'rounded-full px-1.5 text-[11px] font-bold tabular-nums',
                    activeTab ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                  )}
                >
                  {badge}
                </span>
              )}
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

      {tab === 'pipeline' && (
        <>
      {/* Needs you: what to post, and nothing else. */}
      <Card className="bg-white border-none shadow-sm rounded-2xl">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-lg font-bold text-[#1C0357]">
            <span className="flex items-center gap-2">
              <AlertTriangle className={cn('h-4 w-4', needsYou.length ? 'text-amber-500' : 'text-gray-300')} />
              Needs you
            </span>
            <span className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={draftAll}
                disabled={isLoading || bulkDrafting || missingMetadata === 0}
                title={
                  missingMetadata === 0
                    ? 'Every queued video already has a drafted description.'
                    : `Ask the AI to write the YouTube description for ${missingMetadata} video${missingMetadata === 1 ? '' : 's'} that don’t have one yet.`
                }
              >
                <RefreshCw className={cn('h-3.5 w-3.5', bulkDrafting && 'animate-spin')} />{' '}
                {bulkDrafting
                  ? 'Writing…'
                  : missingMetadata > 0
                    ? `Write ${missingMetadata} description${missingMetadata === 1 ? '' : 's'}`
                    : 'Descriptions drafted'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={scheduleAll}
                disabled={isLoading || readyToBook === 0}
                title={
                  readyToBook === 0
                    ? 'No approved video is waiting for a slot.'
                    : `Give ${readyToBook} ready video${readyToBook === 1 ? '' : 's'} the next free cadence slot${readyToBook === 1 ? '' : 's'}.`
                }
              >
                <CalendarClock className="h-3.5 w-3.5" />{' '}
                {readyToBook > 0 ? `Book ${readyToBook} slot${readyToBook === 1 ? '' : 's'}` : 'Nothing to book'}
              </Button>
            </span>
          </CardTitle>
          <p className="text-xs text-gray-400">
            “Write descriptions” drafts the YouTube copy with AI. “Book slots” drops each ready video
            into the next free cadence slot. Open a song’s page (the book icon, or “Song page”) to see
            everything about it — video, teasers, captions — and publish it in one place.
          </p>
        </CardHeader>
        <CardContent className="space-y-1">
          {isLoading ? (
            <p className="px-4 py-6 text-sm text-gray-400">Loading…</p>
          ) : needsYou.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400">
              Nothing needs you. Every queued song is booked or live.
            </p>
          ) : (
            needsYou.map((group) => (
              <div key={group.key} className="overflow-hidden rounded-xl border border-gray-100">
                {group.yt && ['draft', 'pending_approval', 'approved', 'failed'].includes(group.yt.status) ? (
                  <QueueRow
                    publication={group.yt}
                    tz={tz}
                    nextSlot={nextSlot}
                    autoSchedule={settings?.auto_schedule ?? true}
                    onMutation={() => refetch()}
                    onOpen={() => openTrack(group)}
                  />
                ) : (
                  <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => openTrack(group)}
                      title="Open the song page"
                      className="min-w-0 flex-1 truncate text-left text-sm font-bold text-[#1C0357] hover:text-[#F538BC] hover:underline"
                    >
                      {group.label}
                    </button>
                    <span className="text-xs text-gray-400">
                      {group.yt?.status === 'published'
                        ? 'Video is live'
                        : group.yt
                          ? 'Video is booked'
                          : 'No video queued'}{' '}
                      — its teaser still needs a hand.
                    </span>
                  </div>
                )}
                <TeaserNeeds
                  group={group}
                  autoOn={autoOn}
                  onCompose={setComposerId}
                  onRecord={setReRecordFor}
                  onRetry={retryTeaser}
                />
                <PublishTrackBar
                  group={group}
                  autoOn={autoOn}
                  busy={publishingKey === group.key}
                  onPublish={() => publishTrack(group)}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Booked: one row per song, video and teasers on the same slot. */}
      {bookedGroups.length > 0 && (
        <Card className="bg-white border-none shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#1C0357]">
              Booked
              <span className="mt-1 block text-xs font-normal text-gray-400">
                Video and teasers ride the same slot.
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {bookedGroups.map((group) => (
              <TrackPipelineRow
                key={group.key}
                group={group}
                tz={tz}
                onOpen={openTrack}
                onReRecord={setReRecordFor}
                onResetTeaser={resetTeaserFor}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Live: collapsed by default so the page opens quiet. */}
      <Disclosure title="Live" hint={`${liveGroups.length} published`}>
        {liveGroups.length === 0 ? (
          <p className="text-sm text-gray-400">Nothing published yet.</p>
        ) : (
          <div className="space-y-1">
            {liveGroups.map((group) => (
              <TrackPipelineRow
                key={group.key}
                group={group}
                tz={tz}
                onOpen={openTrack}
                onReRecord={setReRecordFor}
                onResetTeaser={resetTeaserFor}
              />
            ))}
          </div>
        )}
      </Disclosure>

      {/* Fire each platform's pass by hand and see exactly what the worker said. */}
      <Disclosure title="Test the pipeline" hint="force a pass on each platform">
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            Runs the same worker the cron uses, right now. TikTok and Instagram only pick up teasers
            whose slot has arrived — if the list is empty, that's the worker telling you nothing is due.
          </p>
          <div className="flex flex-wrap gap-2">
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
            <span className="text-xs text-gray-500">Post one now, without waiting for its slot:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => forcePostNext('tiktok')}
              disabled={testing !== null}
            >
              <ListChecks className="h-3.5 w-3.5" /> Post next TikTok teaser
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => forcePostNext('instagram')}
              disabled={testing !== null}
            >
              <Instagram className="h-3.5 w-3.5" /> Post next Instagram teaser
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

      {tab === 'tracks' && (
        <ReleaseBoard
          queue={queue}
          tz={tz}
          onMutation={() => refetch()}
          onOpenTrack={openByPub}
        />
      )}

      {tab === 'recorder' && (
        <Suspense fallback={<p className="text-sm text-gray-400">Loading…</p>}>
          <TitleCardGenerator />
        </Suspense>
      )}

      {tab === 'settings' && (
        <SlotSettings
          pendingCount={notQueued + active.length}
          existingSlots={existingDates}
          onRespace={respace}
          respaceCount={respaceableCount}
          respacing={respacing}
        />
      )}

      {/* The per-song page. Rendered before the recorder and the composer so
          those open on top of it, and the song page is still there underneath. */}
      {detailGroup && (
        <TrackDetail
          key={detailGroup.key}
          group={detailGroup}
          track={detailTrack}
          products={shopProducts}
          tz={tz}
          autoOn={autoOn}
          publishing={publishingKey === detailGroup.key}
          draftingId={draftingId}
          nextSlotLabel={formatWhen(nextSlot().toISOString(), tz)}
          onClose={() => setDetailKey(null)}
          onPublish={() => publishTrack(detailGroup)}
          onDraft={draftOne}
          onCompose={setComposerId}
          onRecord={setReRecordFor}
          onRetry={retryTeaser}
          onDownload={downloadPub}
          onSaveCaption={saveCaption}
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

      <TikTokComposer
        publicationId={composerId}
        onClose={() => setComposerId(null)}
        onPosted={() => refetch()}
      />
    </div>
  );
};

export default PublishingSection;