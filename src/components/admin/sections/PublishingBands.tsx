import { useState, type ReactNode } from 'react';
import { ChevronRight, Library, MoreHorizontal, RefreshCw, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PLATFORM_LABELS,
  STATUS_LABELS,
  type PublicationPlatform,
  type PublicationWithAsset,
} from '@/types/publishing';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { when, type TrackGroup } from '@/utils/publishingPipeline';

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

// One platform's state for a song: name, status, and the slot it is riding.
function PlatformCell({
  platform,
  pub,
  tz,
}: {
  platform: PublicationPlatform;
  pub?: PublicationWithAsset;
  tz: string;
}) {
  const name = PLATFORM_LABELS[platform];
  if (!pub) {
    return (
      <span className="inline-flex items-center rounded-full border border-dashed border-gray-200 px-2 py-0.5 text-[11px] text-gray-300">
        {name} —
      </span>
    );
  }
  const dated = pub.status === 'scheduled' || pub.status === 'published';
  const stamp = dated ? (pub.scheduled_for ?? pub.published_at) : null;
  return (
    <span
      className={cn(
        'inline-flex max-w-[230px] items-center truncate rounded-full border px-2 py-0.5 text-[11px]',
        CHIP[pub.status] ?? CHIP.draft
      )}
      title={pub.error || undefined}
    >
      {name} · {STATUS_LABELS[pub.status]}
      {stamp ? ` · ${when(stamp, tz)}` : ''}
    </span>
  );
}

// One song across all three platforms — the whole point of the regroup.
export function TrackPipelineRow({
  group,
  tz,
  onOpen,
  onReRecord,
  onResetTeaser,
}: {
  group: TrackGroup;
  tz: string;
  onOpen?: (group: TrackGroup) => void;
  onReRecord?: (requestId: string) => void;
  onResetTeaser?: (group: TrackGroup) => void;
}) {
  const hasTeaser = !!(group.tt || group.ig);
  const canReset = group.tt?.status === 'published' || group.ig?.status === 'published';
  const showMenu = hasTeaser && !!(onReRecord || (onResetTeaser && canReset));
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 px-3 py-2">
      {onOpen ? (
        <button
          type="button"
          onClick={() => onOpen(group)}
          title="Open the song page — everything about this song in one place"
          className="flex min-w-[150px] flex-1 items-center gap-1.5 truncate text-left text-sm font-medium text-[#1C0357] hover:text-[#F538BC] hover:underline"
        >
          <Library className="h-3.5 w-3.5 shrink-0 text-gray-300" />
          <span className="truncate">{group.label}</span>
        </button>
      ) : (
        <span className="min-w-[150px] flex-1 truncate text-sm font-medium text-[#1C0357]">
          {group.label}
        </span>
      )}
      <PlatformCell platform="youtube" pub={group.yt} tz={tz} />
      <PlatformCell platform="tiktok" pub={group.tt} tz={tz} />
      <PlatformCell platform="instagram" pub={group.ig} tz={tz} />
      {/* Teaser housekeeping lives here too, so a booked or live row can be
          re-recorded or reset without hunting through the release board. */}
      {showMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 px-2" title="Teaser actions">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onReRecord && group.requestId && (
              <DropdownMenuItem onSelect={() => onReRecord(group.requestId as string)}>
                <RefreshCw className="h-3.5 w-3.5" /> Re-record teaser
              </DropdownMenuItem>
            )}
            {onResetTeaser && canReset && (
              <DropdownMenuItem onSelect={() => onResetTeaser(group)}>
                <RotateCcw className="h-3.5 w-3.5" /> Reset teaser
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

// Collapsible block: everything optional stays shut so the page opens quiet.
export function Disclosure({
  title,
  hint,
  defaultOpen = false,
  children,
}: {
  title: string;
  hint?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <ChevronRight
          className={cn('h-4 w-4 shrink-0 text-gray-400 transition-transform', open && 'rotate-90')}
        />
        <span className="text-sm font-semibold text-[#1C0357]">{title}</span>
        {hint ? <span className="ml-auto truncate pl-3 text-xs text-gray-400">{hint}</span> : null}
      </button>
      {open && <div className="border-t border-gray-100 p-4">{children}</div>}
    </section>
  );
}
