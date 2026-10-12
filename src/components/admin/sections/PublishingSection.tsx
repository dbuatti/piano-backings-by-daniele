import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn, getErrorMessage } from '@/lib/utils';
import { nextWeeklySlot } from '@/utils/nextWeeklySlot';
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
import { CalendarClock, Eye, RefreshCw, Rocket, SlidersHorizontal, Video } from 'lucide-react';
import CardPreview from '@/components/admin/CardPreview';

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
function SlotSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<PublishingSettings, Error>({
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

  const [dow, setDow] = useState<number | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string | null>(null);
  const [auto, setAuto] = useState<boolean | null>(null);

  const final = (key: 'weekly_dow' | 'weekly_time' | 'timezone' | 'auto_schedule') =>
    key === 'weekly_dow'
      ? dow !== null
        ? dow
        : settings?.weekly_dow ?? 2
      : key === 'weekly_time'
        ? time ?? settings?.weekly_time ?? '09:00'
        : key === 'timezone'
          ? timezone ?? settings?.timezone ?? 'Australia/Sydney'
          : auto ?? settings?.auto_schedule ?? true;

  const save = async () => {
    const { error } = await supabase
      .from('publishing_settings')
      .update({
        weekly_dow: final('weekly_dow'),
        weekly_time: final('weekly_time'),
        timezone: final('timezone'),
        auto_schedule: final('auto_schedule'),
      })
      .eq('id', 1);
    if (error) {
      toast({ title: "Couldn't save settings", description: getErrorMessage(error), variant: 'destructive' });
      return;
    }
    toast({ title: 'Weekly slot saved' });
    queryClient.invalidateQueries({ queryKey: ['publishing_settings'] });
  };

  if (isLoading || !settings) {
    return <Card className="bg-white border-none shadow-sm rounded-2xl"><CardContent className="p-6 text-sm text-gray-400">Loading settings…</CardContent></Card>;
  }

  return (
    <Card className="bg-white border-none shadow-sm rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-[#1C0357] flex items-center gap-2">
          <CalendarClock className="h-5 w-5" /> Weekly publishing slot
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
          Approved videos are scheduled into the next free weekly slot. Publishing runs every 15 minutes,
          so this is roughly when they'll appear.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div className="space-y-1.5 flex flex-col justify-end">
            <div className="flex h-9 items-center gap-2">
              <Switch checked={final('auto_schedule')} onCheckedChange={setAuto} />
              <Label className="font-normal">Auto-schedule on approval</Label>
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={save} className="bg-[#1C0357] hover:bg-[#1C0357]/90">Save slot</Button>
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
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save metadata", description: getErrorMessage(error), variant: 'destructive' });
      return;
    }
    toast({ title: 'Metadata saved' });
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
              key={publication.content_assets?.key ?? null}
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
  onMutation,
}: {
  publication: PublicationWithAsset;
  tz: string;
  onMutation: () => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<'approve' | 'schedule' | 'publish' | 'retry' | 'refresh' | 'draft' | null>(null);
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
      toast({ title: 'Action failed', description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  // Approve & schedule = mark approved, assign the next weekly slot (if auto),
  // then kick the queue so the video is uploaded to YouTube immediately as a
  // private video that YouTube itself publishes at `scheduled_for`.
  const approve = () =>
    run(async () => {
      const { data: user } = await supabase.auth.getUser();
      const patch: Record<string, unknown> = {
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user.user?.id ?? null,
        error: null,
      };
      const { data: settings } = await supabase
        .from('publishing_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      if (settings?.auto_schedule) {
        patch.scheduled_for = nextWeeklySlot(settings).toISOString();
      }
      const { error } = await supabase.from('publications').update(patch).eq('id', publication.id);
      if (error) throw error;
      const { error: invokeError } = await supabase.functions.invoke('run-publish-queue', { body: {} });
      if (invokeError) throw invokeError;
    }, 'approve', 'Approved — uploading to YouTube');

  // Publish now = upload immediately (no publishAt), via the same queue path.
  const publishNow = () =>
    run(async () => {
      const { error } = await supabase
        .from('publications')
        .update({
          status: 'approved',
          scheduled_for: new Date().toISOString(),
          error: null,
        })
        .eq('id', publication.id);
      if (error) throw error;
      const { error: invokeError } = await supabase.functions.invoke('run-publish-queue', { body: {} });
      if (invokeError) throw invokeError;
    }, 'publish', 'Published');

  const redraft = () =>
    run(async () => {
      const { error } = await supabase.functions.invoke('draft-publication-metadata', {
        body: { asset_id: publication.asset_id, platform: publication.platform },
      });
      if (error) throw error;
    }, 'draft', 'Metadata regenerated');

  // Manual slot: lets a publish time be chosen even when auto_schedule is off
  // (or to override the auto slot for one video). Uploads via the same queue.
  const scheduleManual = () =>
    run(async () => {
      const when = new Date(manualWhen);
      if (Number.isNaN(when.getTime())) throw new Error('Choose a publish time first.');
      const { error } = await supabase
        .from('publications')
        .update({
          status: 'approved',
          scheduled_for: when.toISOString(),
          error: null,
        })
        .eq('id', publication.id);
      if (error) throw error;
      const { error: invokeError } = await supabase.functions.invoke('run-publish-queue', { body: {} });
      if (invokeError) throw invokeError;
      setScheduleOpen(false);
      setManualWhen('');
    }, 'schedule', 'Scheduled — uploading to YouTube');

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
          <p className="truncate font-bold text-[#1C0357]">{label}</p>
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
          <Badge variant="outline">{publication.platform}</Badge>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
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
            ['draft', 'pending_approval', 'failed'].includes(publication.status) && (
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
        </div>
      </div>
      {showPreview && (
        <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-4">
          <CardPreview
            previewPath={asset?.preview_path ?? null}
            title={asset?.title ?? null}
            show={asset?.show ?? null}
            key={asset?.key ?? null}
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
  const queryClient = useQueryClient();

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

  const active = queue.filter((p) => p.status !== 'skipped' && p.status !== 'published');
  const published = queue.filter((p) => p.status === 'published');

  const counts = queue.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});

  const runQueue = async () => {
    const { error } = await supabase.functions.invoke('run-publish-queue', { body: {} });
    if (error) {
      toast({ title: 'Queue run failed', description: getErrorMessage(error), variant: 'destructive' });
    } else {
      toast({ title: 'Publishing pass complete' });
      refetch();
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#1C0357]">Publishing</h2>
          <p className="text-sm text-gray-500">
            Generated videos → approval → weekly slot → channel. YouTube is live; TikTok and Instagram
            will follow once their apps are approved.
          </p>
        </div>
        <Button variant="outline" onClick={runQueue}>
          <Rocket className="h-4 w-4" /> Run due now
        </Button>
      </div>

      <SlotSettings />

      <Card className="bg-white border-none shadow-sm rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-[#1C0357] flex items-center justify-between">
            <span>Approval queue</span>
            <span className="text-xs font-normal text-gray-400">
              {Object.entries(counts).map(([s, n]) => `${STATUS_LABELS[s as keyof typeof STATUS_LABELS]} ${n}`).join(' · ')}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className={cn('space-y-0.5', !isLoading && active.length === 0 && 'pt-2')}>
          {isLoading ? (
            <p className="px-4 py-6 text-sm text-gray-400">Loading queue…</p>
          ) : active.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400">
              Nothing in the queue. Generate a video and choose “Save to publishing queue” in the Video
              Title Cards tool to start the folder.
            </p>
          ) : (
            active.map((p) => (
              <div key={p.id} className="rounded-xl border border-gray-100 first:mt-0">
                <QueueRow publication={p} tz={tz} onMutation={() => refetch()} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {published.length > 0 && (
        <Card className="bg-white border-none shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#1C0357]">Published</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0.5">
            {published.map((p) => (
              <div key={p.id} className="rounded-xl border border-gray-100">
                <QueueRow publication={p} tz={tz} onMutation={() => refetch()} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PublishingSection;