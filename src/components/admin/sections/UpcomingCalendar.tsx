import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarRange } from 'lucide-react';
import { type PublicationWithAsset } from '@/types/publishing';

const DAY_MS = 86_400_000;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function useTz(tz: string) {
  const keyFmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const timeFmt = new Intl.DateTimeFormat('en-AU', { timeZone: tz, hour: 'numeric', minute: '2-digit' });
  // Cells are anchored as local-midnight-as-UTC, so label them in UTC.
  const dayFmt = new Intl.DateTimeFormat('en-AU', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });
  const keyOf = (d: Date) => keyFmt.format(d); // en-CA → YYYY-MM-DD local to tz
  const timeOf = (d: Date) => timeFmt.format(d);
  const labelOf = (d: Date) => dayFmt.format(d);
  return { keyOf, timeOf, labelOf };
}

// Six weeks starting on the current (timezone-local) Monday, with every
// upcoming scheduled publication grouped under its local calendar day.
export default function UpcomingCalendar({
  queue,
  tz,
}: {
  queue: PublicationWithAsset[];
  tz: string;
}) {
  const { keyOf, timeOf, labelOf } = useTz(tz);

  const { cells, byKey } = useMemo(() => {
    const byKey = new Map<string, PublicationWithAsset[]>();
    queue.forEach((p) => {
      if (!p.scheduled_for) return;
      const when = new Date(p.scheduled_for);
      if (when.getTime() < Date.now()) return;
      if (!['approved', 'scheduled', 'publishing'].includes(p.status)) return;
      const k = keyOf(when);
      byKey.set(k, [...(byKey.get(k) ?? []), p].sort((a, b) =>
        new Date(a.scheduled_for!).getTime() - new Date(b.scheduled_for!).getTime()));
    });

    // Anchor at local-midnight-as-UTC so weekday math matches the tz calendar.
    // Cell keys are the anchor's own UTC date (== the local date), not a
    // re-format (re-formatting a UTC midnight in a zone behind UTC shifts a day).
    const todayKey = keyOf(new Date());
    const [y, m, d] = todayKey.split('-').map(Number);
    const anchor = new Date(Date.UTC(y, m - 1, d));
    const mondayOffset = ((anchor.getUTCDay() + 6) % 7) * DAY_MS;
    const monday = new Date(anchor.getTime() - mondayOffset);
    const cells = Array.from({ length: 42 }, (_, i) => {
      const date = new Date(monday.getTime() + i * DAY_MS);
      const key = date.toISOString().slice(0, 10);
      return { date, key, today: key === todayKey };
    });
    return { cells, byKey };
  }, [queue, keyOf]);

  const scheduled = cells.reduce((n, c) => n + (byKey.get(c.key)?.length ?? 0), 0);

  return (
    <Card className="bg-white border-none shadow-sm rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-[#1C0357] flex items-center justify-between">
          <span className="flex items-center gap-2"><CalendarRange className="h-5 w-5" /> Upcoming schedule</span>
          <span className="text-xs font-normal text-gray-400">
            {scheduled > 0 ? `${scheduled} publication${scheduled === 1 ? '' : 's'} · ${tz} · weeks start Monday` : 'Nothing scheduled'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((w) => (
            <div key={w} className="text-center text-[11px] font-semibold uppercase text-gray-400">
              {w}
            </div>
          ))}
          {cells.map((c) => {
            const items = byKey.get(c.key) ?? [];
            return (
              <div
                key={c.key}
                className={c.today
                  ? 'rounded-lg border-2 border-[#F538BC] bg-[#F538BC]/5 px-1.5 py-1'
                  : 'rounded-lg border border-gray-100 px-1.5 py-1'}
              >
                <div className="mb-0.5 text-[10px] font-semibold text-gray-500">{labelOf(c.date)}</div>
                {items.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    className="mb-0.5 truncate whitespace-nowrap text-[10px] text-[#1C0357]"
                    title={p.content_assets?.title ?? ''}
                  >
                    <span className="font-bold text-[#F538BC]">{timeOf(new Date(p.scheduled_for!))}</span>{' '}
                    {shortLabel(p)}
                  </div>
                ))}
                {items.length > 3 && (
                  <div className="text-[10px] text-gray-400">+{items.length - 3} more</div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function shortLabel(p: PublicationWithAsset): string {
  const a = p.content_assets;
  return (a?.song_title || a?.title || 'video').slice(0, 22);
}