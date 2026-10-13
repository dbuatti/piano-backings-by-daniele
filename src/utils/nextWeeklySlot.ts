import type { PublishingSettings } from "@/types/publishing";

// Converts a wall-clock time expressed in `timeZone` into a UTC Date.
function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(new Date(guess)).map((p) => [p.type, Number(p.value)])
  );
  const hourClear = parts.hour === 24 ? 0 : parts.hour;
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    hourClear,
    parts.minute,
    parts.second
  );
  const offset = asUtc - guess;
  return new Date(guess - offset);
}

function todayInZone(timeZone: string, from: Date): { y: number; m: number; d: number } {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [y, m, d] = dtf.format(from).split("-").map(Number);
  return { y, m, d };
}

const DAY_MS = 86_400_000;

type SlotSettings = Pick<
  PublishingSettings,
  'schedule_mode' | 'interval_days' | 'weekly_dow' | 'weekly_time' | 'timezone'
>;

// Next cadence slot in the configured timezone, strictly after `from`:
// weekly mode returns the next weekly day/time; interval mode returns the next
// occurrence of the daily time, interval_days apart. Returns the same day's
// wall time the following day if `from` is already past today's slot.
export function nextPublishingSlot(settings: SlotSettings, from: Date = new Date()): Date {
  const [h, m] = settings.weekly_time.split(':').map(Number);
  const today = todayInZone(settings.timezone, from);
  const mode = settings.schedule_mode ?? 'weekly';
  const stepDays = mode === 'interval' ? Math.min(settings.interval_days ?? 3, 90) : 8;
  for (let offset = 0; offset <= stepDays; offset++) {
    const base = new Date(Date.UTC(today.y, today.m - 1, today.d) + offset * DAY_MS);
    const y = base.getUTCFullYear();
    const month = base.getUTCMonth() + 1;
    const d = base.getUTCDate();
    if (mode === 'weekly' && base.getUTCDay() !== settings.weekly_dow) continue;
    const candidate = zonedTimeToUtc(y, month, d, h, m, settings.timezone);
    if (candidate.getTime() > from.getTime()) return candidate;
  }
  throw new Error('Could not compute the next publishing slot.');
}

// Books `count` consecutive free cadence slots, spaced by the configured cadence
// and sliding past anything already scheduled so two approvals never collide.
export function allocatePublishingSlots(
  settings: SlotSettings,
  count: number,
  existing: Date[] = [],
  from: Date = new Date()
): Date[] {
  const taken = new Set<number>(
    existing
      .filter((d) => d.getTime() > from.getTime())
      .map((d) => d.getTime())
  );
  const slots: Date[] = [];
  let cursor = new Date(from);
  for (let i = 0; i < count; i++) {
    const s = nextPublishingSlot(settings, cursor);
    if (taken.has(s.getTime())) {
      cursor = new Date(s.getTime() + 1);
      i--;
      continue;
    }
    slots.push(s);
    taken.add(s.getTime());
    cursor = new Date(s.getTime() + 1);
  }
  return slots;
}

// Next occurrence of the weekly slot in the configured timezone, strictly after
// `from`. Falls back to the same wall time on the following day if `from` is
// already past today's slot.
export function nextWeeklySlot(
  settings: Pick<PublishingSettings, 'weekly_dow' | 'weekly_time' | 'timezone'>,
  from: Date = new Date()
): Date {
  return nextPublishingSlot(
    { ...settings, schedule_mode: 'weekly', interval_days: null },
    from
  );
}