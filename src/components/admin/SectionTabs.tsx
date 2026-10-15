import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';

// The pill row that sits under a section's title and picks the tab you're on.
//
// Shop, Clients and Settings each hand-rolled this with drifting heights (h-9
// vs h-10), different gaps and no accessible state. One component keeps them
// identical, and gives every tab the same badge slot the shell rail already
// uses for "something here needs you".
export type SectionTab<T extends string> = {
  id: T;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** A count to advertise on the tab. 0 or undefined shows nothing. */
  badge?: number;
  /** Amber = "worth a look"; red is reserved for unread feedback. */
  tone?: 'amber' | 'red';
};

export function SectionTabs<T extends string>({
  tabs,
  active,
  onSelect,
  className,
}: {
  tabs: SectionTab<T>[];
  active: T;
  onSelect: (id: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Section"
      className={cn('mb-6 flex items-center gap-2 overflow-x-auto', className)}
    >
      {tabs.map(({ id, label, icon: Icon, badge, tone }) => {
        const isActive = id === active;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(id)}
            className={cn(
              'flex h-10 items-center gap-2 whitespace-nowrap rounded-xl border px-4 text-sm font-bold transition-colors',
              isActive
                ? 'border-[#1C0357] bg-[#1C0357] text-white shadow-sm'
                : 'border-gray-200 bg-white text-[#1C0357] hover:bg-gray-50'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
            {typeof badge === 'number' && badge > 0 && (
              <span
                className={cn(
                  'flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums',
                  isActive
                    ? 'bg-white/25 text-white'
                    : tone === 'red'
                      ? 'bg-red-500 text-white'
                      : 'bg-amber-100 text-amber-700'
                )}
              >
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
