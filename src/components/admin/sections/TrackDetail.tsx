import { useState, type ReactNode } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clapperboard,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
  Rocket,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PLATFORM_LABELS,
  STATUS_LABELS,
  type PublicationPlatform,
  type PublicationStatus,
  type PublicationWithAsset,
} from '@/types/publishing';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CardPreview } from '@/components/admin/CardPreview';
import { shopProductForTrack, shopSongUrl } from '@/utils/shopLink';
import type { DeliveredTrack, ShopProductRow } from '@/hooks/useDeliveredTracks';
import {
  captionOf,
  formatSeconds,
  isPostable,
  teaserProblem,
  trackReadiness,
  when,
  type ReadinessItem,
  type TrackGroup,
} from '@/utils/publishingPipeline';

// The per-song page: one track, everything about it, and the one action that
// takes it from delivered to published. It is read-only except for the fixes and
// the final publish — the release board stays the place you edit.

const STEPS = ['Overview', 'Video', 'Teasers', 'Publish'] as const;

const CHIP: Record<string, string> = {
  draft: 'border-gray-200 bg-gray-50 text-gray-500',
  pending_approval: 'border-amber-200 bg-amber-50 text-amber-700',
  approved: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  scheduled: 'border-blue-200 bg-blue-50 text-blue-700',
  publishing: 'border-purple-200 bg-purple-50 text-purple-700',
  published: 'border-green-200 bg-green-50 text-green-700',
  failed: 'border-red-200 bg-red-50 text-red-600',
  skipped: 'border-gray-200 bg-gray-50 text-gray-400',
};

function Chip({ pub, tz }: { pub?: PublicationWithAsset; tz: string }) {
  if (!pub) return null;
  const stamp =
    pub.status === 'scheduled' || pub.status === 'published'
      ? pub.scheduled_for ?? pub.published_at
      : null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        CHIP[pub.status]
      )}
    >
      {STATUS_LABELS[pub.status]}
      {stamp ? <span className="font-normal opacity-70">· {when(stamp, tz)}</span> : null}
    </span>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-gray-50 py-1.5 last:border-0">
      <span className="shrink-0 text-xs text-gray-400">{label}</span>
      <span className="min-w-0 break-words text-right text-xs font-medium text-gray-700">
        {children}
      </span>
    </div>
  );
}

function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-100 p-4">
      {title ? (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</p>
      ) : null}
      {children}
    </div>
  );
}

function CheckItem({ item }: { item: ReadinessItem }) {
  return (
    <li className="flex items-start gap-2 text-xs">
      {item.ok ? (
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
      ) : (
        <AlertCircle
          className={cn(
            'mt-0.5 h-3.5 w-3.5 shrink-0',
            item.advisory ? 'text-gray-400' : 'text-amber-500'
          )}
        />
      )}
      <span>
        <span className={cn('font-medium', item.ok ? 'text-gray-600' : 'text-gray-800')}>
          {item.label}
        </span>
        <span className="text-gray-400"> — {item.note}</span>
      </span>
    </li>
  );
}

function assetLine(pub?: PublicationWithAsset): string {
  const a = pub?.content_assets;
  if (!a) return 'No file';
  return [
    a.aspect ?? 'unknown size',
    formatSeconds(a.duration_seconds),
    (a.mime_type || '').replace('video/', '') || 'unknown type',
  ].join(' · ');
}

// One platform's teaser, with the single fix that unblocks it.
function TeaserPanel({
  platform,
  pub,
  group,
  tz,
  autoOn,
  onCompose,
  onRecord,
  onRetry,
  onDownload,
  onSaveCaption,
}: {
  platform: PublicationPlatform;
  pub: PublicationWithAsset;
  group: TrackGroup;
  tz: string;
  autoOn: boolean;
  onCompose: (id: string) => void;
  onRecord: (requestId: string) => void;
  onRetry: (id: string) => void;
  onDownload: (pub: PublicationWithAsset) => void;
  onSaveCaption: (pub: PublicationWithAsset, caption: string) => Promise<void>;
}) {
  const name = PLATFORM_LABELS[platform];
  const problem = teaserProblem(pub, group, autoOn);
  const caption = captionOf(pub);
  const igBlocked = platform === 'instagram' && problem && problem.action !== 'record';
  // A caption edits the row the worker posts from, so it is worth doing for a
  // booked teaser too. It is pointless once the post is live — nothing re-reads
  // it — so the affordance is hidden there.
  const canEditCaption = pub.status !== 'published';

  // Inline caption editing: saved straight onto the publication, which is the
  // same field run-social-queue posts, so editing here and posting later agree.
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const startEdit = () => {
    setDraft(caption);
    setSaveError(null);
    setEditing(true);
  };
  const save = async () => {
    const next = draft.trim();
    if (next === caption.trim()) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await onSaveCaption(pub, next);
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save the caption.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel title={name}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Chip pub={pub} tz={tz} />
        <span className="text-[11px] text-gray-400">{assetLine(pub)}</span>
      </div>
      {problem ? (
        <p
          className={cn(
            'mb-2 text-xs',
            problem.action === 'retry' ? 'text-red-600' : 'text-amber-600'
          )}
        >
          {igBlocked ? 'Instagram isn’t connected yet (Settings → Integrations).' : problem.note}
        </p>
      ) : (
        <p className="mb-2 text-xs text-green-700">
          {pub.status === 'published'
            ? 'Live.'
            : pub.status === 'scheduled'
              ? `Posts ${when(pub.scheduled_for, tz)}.`
              : 'Ready to post.'}
        </p>
      )}
      {editing ? (
        <div className="mb-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            autoFocus
            placeholder="Write the caption that goes with the post…"
            className="w-full rounded-lg border border-gray-200 p-2 text-[11px] leading-relaxed text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#F538BC]/40"
          />
          {saveError ? <p className="mt-1 text-[11px] text-red-600">{saveError}</p> : null}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save caption
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
            <span className="text-[11px] text-gray-400">
              This is the text the post goes out with.
            </span>
          </div>
        </div>
      ) : (
        <div className="mb-3">
          {caption ? (
            <p className="max-h-24 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-2 text-[11px] leading-relaxed text-gray-600">
              {caption}
            </p>
          ) : (
            <p className="text-[11px] text-gray-400">No caption yet.</p>
          )}
          {canEditCaption ? (
            <button
              type="button"
              onClick={startEdit}
              className="mt-1 text-[11px] font-medium text-[#F538BC] hover:underline"
            >
              {caption ? 'Edit caption' : 'Write caption'}
            </button>
          ) : null}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {problem?.action === 'record' && group.requestId ? (
          <Button size="sm" variant="outline" onClick={() => onRecord(group.requestId as string)}>
            <Clapperboard className="h-3.5 w-3.5" /> Record teaser
          </Button>
        ) : null}
        {problem?.action === 'retry' ? (
          <Button size="sm" variant="outline" onClick={() => onRetry(pub.id)}>
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        ) : null}
        {pub.platform === 'tiktok' && !igBlocked ? (
          <Button size="sm" variant="outline" onClick={() => onCompose(pub.id)}>
            {caption ? 'Edit caption & post' : 'Write caption & post'}
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={() => onDownload(pub)}>
          <Download className="h-3.5 w-3.5" /> Download
        </Button>
        {pub.url ? (
          <Button size="sm" variant="ghost" asChild>
            <a href={pub.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> Open
            </a>
          </Button>
        ) : null}
      </div>
    </Panel>
  );
}

export interface TrackDetailProps {
  group: TrackGroup;
  track?: DeliveredTrack;
  products: ShopProductRow[];
  tz: string;
  autoOn: boolean;
  /** True while "Publish this song" is running for this group. */
  publishing: boolean;
  /** Publication id currently being re-drafted, if any. */
  draftingId: string | null;
  /** The next free cadence slot, already formatted. */
  nextSlotLabel: string | null;
  onClose: () => void;
  onPublish: () => void;
  onDraft: (pub: PublicationWithAsset) => void;
  onCompose: (id: string) => void;
  onRecord: (requestId: string) => void;
  onRetry: (id: string) => void;
  onDownload: (pub: PublicationWithAsset) => void;
  /** Saves an edited caption onto the row the worker will post from. */
  onSaveCaption: (pub: PublicationWithAsset, caption: string) => Promise<void>;
}

export default function TrackDetail({
  group,
  track,
  products,
  tz,
  autoOn,
  publishing,
  draftingId,
  nextSlotLabel,
  onClose,
  onPublish,
  onDraft,
  onCompose,
  onRecord,
  onRetry,
  onDownload,
  onSaveCaption,
}: TrackDetailProps) {
  const [step, setStep] = useState(0);
  const yt = group.yt;
  const ytAsset = yt?.content_assets;

  const song = track?.song || ytAsset?.song_title || '';
  const show = track?.show || ytAsset?.show || '';
  const shopMatch = shopProductForTrack(products, { song, show });
  const shop: 'live' | 'draft' | 'none' = !shopMatch ? 'none' : shopMatch.is_active ? 'live' : 'draft';
  const shopUrl = shopSongUrl(products, { song, show });

  const ytAssetAspect = yt?.content_assets?.aspect;
  const bookable =
    !!yt &&
    ['draft', 'pending_approval', 'approved', 'failed'].includes(yt.status) &&
    !yt.scheduled_for;

  const readiness = trackReadiness(group, {
    hasCopy: !!yt?.metadata?.description?.trim(),
    copyBlocking: bookable,
    shop,
  });
  const blockers = readiness.filter((i) => !i.ok && !i.advisory);
  const ready = blockers.length === 0;

  const pendingRows = group.pubs.filter((p) =>
    ['draft', 'pending_approval', 'approved', 'failed'].includes(p.status)
  );
  const canPublish = ready && (bookable || pendingRows.length > 0);

  const description = String(yt?.metadata?.description ?? '').trim();
  const ytTitle = String(yt?.metadata?.title ?? '').trim();

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 text-[#1C0357]">
            <span className="truncate">{group.label}</span>
            {track?.client ? (
              <span className="text-sm font-normal text-gray-400">for {track.client}</span>
            ) : null}
          </DialogTitle>
          <p className="text-xs text-gray-400">
            {track?.key ? `Key ${track.key}` : 'No key recorded yet'}
          </p>
        </DialogHeader>

        {/* The stepper. Four steps, one track, and the publish button at the end. */}
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(i)}
              className="group flex flex-1 items-center gap-2"
            >
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                  i < step && 'bg-[#1C0357] text-white',
                  i === step && 'bg-[#F538BC] text-white',
                  i > step && 'bg-gray-200 text-gray-500'
                )}
              >
                {i < step ? '✓' : i + 1}
              </span>
              <span
                className={cn(
                  'truncate text-xs font-medium',
                  i === step ? 'text-[#1C0357]' : 'text-gray-400 group-hover:text-gray-600'
                )}
              >
                {label}
              </span>
              {i < STEPS.length - 1 ? <span className="h-px min-w-2 flex-1 bg-gray-200" /> : null}
            </button>
          ))}
        </div>

        {step === 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Panel title="The track">
              <Fact label="Key">{track?.key || '—'}</Fact>
              <Fact label="Client">{track?.client || '—'}</Fact>
              <Fact label="YouTube">{yt ? STATUS_LABELS[yt.status] : 'Not queued'}</Fact>
              <Fact label="Teasers">
                {[group.tt ? PLATFORM_LABELS.tiktok : null, group.ig ? PLATFORM_LABELS.instagram : null]
                  .filter(Boolean)
                  .join(' + ') || 'None yet'}
              </Fact>
              <Fact label="Shop listing">
                {shop === 'live' ? 'Live' : shop === 'draft' ? 'Draft' : 'None'}
              </Fact>
              {shopUrl ? (
                <Fact label="Shop page">
                  <a
                    href={shopUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#F538BC] hover:underline"
                  >
                    Open
                  </a>
                </Fact>
              ) : null}
              {track?.url ? (
                <div className="pt-3">
                  <audio controls preload="none" src={track.url} className="h-9 w-full" />
                </div>
              ) : null}
            </Panel>
            <Panel title={ready ? 'Ready to publish' : `Ready to publish · ${blockers.length} to fix`}>
              <ul className="space-y-1.5">
                {readiness.map((item) => (
                  <CheckItem key={item.label} item={item} />
                ))}
              </ul>
            </Panel>
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Panel title="Title card">
              <CardPreview
                previewPath={yt?.content_assets?.preview_path ?? null}
                title={group.label}
                musicalKey={track?.key}
                maxWidth={9999}
              />
            </Panel>
            <Panel title={PLATFORM_LABELS.youtube}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {yt ? (
                  <Chip pub={yt} tz={tz} />
                ) : (
                  <span className="text-xs text-gray-400">Nothing queued</span>
                )}
              </div>
              <Fact label="File">{yt ? assetLine(yt) : '—'}</Fact>
              <Fact label="Slot">
                {yt?.scheduled_for
                  ? when(yt.scheduled_for, tz)
                  : bookable
                    ? 'Next free slot'
                    : 'Not booked'}
              </Fact>
              {yt?.error ? <Fact label="Last error">{yt.error}</Fact> : null}
              <Fact label="Video title">{ytTitle || '—'}</Fact>
              {description ? (
                <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-2 text-[11px] leading-relaxed text-gray-600">
                  {description}
                </pre>
              ) : (
                <p className="mt-3 text-[11px] text-gray-400">
                  No description yet — the pipeline can’t book it without one.
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {yt ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDraft(yt)}
                    disabled={draftingId === yt.id}
                  >
                    {draftingId === yt.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {description ? 'Re-draft copy' : 'Draft copy'}
                  </Button>
                ) : null}
                {yt ? (
                  <Button size="sm" variant="ghost" onClick={() => onDownload(yt)}>
                    <Download className="h-3.5 w-3.5" /> Download video
                  </Button>
                ) : null}
                {yt?.url ? (
                  <Button size="sm" variant="ghost" asChild>
                    <a href={yt.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" /> Open on YouTube
                    </a>
                  </Button>
                ) : null}
              </div>
            </Panel>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            {group.tt ? (
              <TeaserPanel
                platform="tiktok"
                pub={group.tt}
                group={group}
                tz={tz}
                autoOn={autoOn}
                onCompose={onCompose}
                onRecord={onRecord}
                onRetry={onRetry}
                onDownload={onDownload}
                onSaveCaption={onSaveCaption}
              />
            ) : (
              <Panel title={PLATFORM_LABELS.tiktok}>
                <p className="text-xs text-gray-400">
                  No TikTok teaser yet.{' '}
                  {group.requestId ? (
                    <button
                      type="button"
                      className="font-medium text-[#F538BC] hover:underline"
                      onClick={() => onRecord(group.requestId as string)}
                    >
                      Record one
                    </button>
                  ) : null}
                </p>
              </Panel>
            )}
            {group.ig ? (
              <TeaserPanel
                platform="instagram"
                pub={group.ig}
                group={group}
                tz={tz}
                autoOn={autoOn}
                onCompose={onCompose}
                onRecord={onRecord}
                onRetry={onRetry}
                onDownload={onDownload}
                onSaveCaption={onSaveCaption}
              />
            ) : (
              <Panel title={PLATFORM_LABELS.instagram}>
                <p className="text-xs text-gray-400">
                  No Instagram cut yet.{' '}
                  {group.requestId ? (
                    <button
                      type="button"
                      className="font-medium text-[#F538BC] hover:underline"
                      onClick={() => onRecord(group.requestId as string)}
                    >
                      Record one
                    </button>
                  ) : null}
                </p>
              </Panel>
            )}
            <p className={cn('text-[11px]', autoOn ? 'text-gray-400' : 'text-amber-600')}>
              {autoOn
                ? 'Auto-post is on: a booked teaser goes out on the video’s slot without you touching the app.'
                : 'Auto-post is off. Booked teasers wait for you — turn it on in Settings to let them ride the slot.'}
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <Panel>
              <p className="text-sm font-semibold text-[#1C0357]">
                {ready
                  ? 'Everything checks out.'
                  : `${blockers.length} thing${blockers.length === 1 ? '' : 's'} still missing.`}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {bookable
                  ? `Publishing books the video into ${nextSlotLabel ?? 'the next free slot'}, then the teasers ride that slot.`
                  : yt?.scheduled_for
                    ? `The video is already booked for ${when(yt.scheduled_for, tz)}. Publishing runs the passes now.`
                    : 'Publishing runs the YouTube and social passes now.'}
              </p>
            </Panel>
            {!ready ? (
              <Panel title="What's missing">
                <ul className="space-y-1.5">
                  {blockers.map((item) => (
                    <CheckItem key={item.label} item={item} />
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-gray-400">
                  Fix these on the earlier steps, then come back here.
                </p>
              </Panel>
            ) : null}
            <Panel title="What goes out">
              <Fact label="YouTube">
                {bookable
                  ? `16:9, full song → ${nextSlotLabel ?? 'next free slot'}`
                  : yt
                    ? `${ytAssetAspect ?? 'unknown size'}, ${STATUS_LABELS[yt.status]}`
                    : '—'}
              </Fact>
              <Fact label="TikTok">
                {group.tt
                  ? `9:16, full song — ${
                      isPostable(group.tt)
                        ? autoOn
                          ? 'posts on the slot'
                          : 'posts by hand'
                        : 'needs a portrait MP4'
                    }`
                  : '—'}
              </Fact>
              <Fact label="Instagram">
                {group.ig
                  ? `9:16, ${formatSeconds(
                      group.ig.content_assets?.duration_seconds
                    )} — ${isPostable(group.ig) ? 'recorded' : 'needs a portrait MP4'}`
                  : '—'}
              </Fact>
            </Panel>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>
          <div className="flex items-center gap-2">
            {step < STEPS.length - 1 ? (
              <Button
                variant="outline"
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              >
                Next <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button onClick={onPublish} disabled={publishing || !canPublish}>
                {publishing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Rocket className="h-3.5 w-3.5" />
                )}
                Publish this song
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
