// Cadence maths shared by the publishing worker.
//
// This is a deliberate port of src/utils/nextWeeklySlot.ts — the admin uses the
// same algorithm for the "next upload" forecast and the "Book slots" button, so
// the two must agree on where a slot lands. If you change one, change both.

export interface SlotSettings {
  schedule_mode?: string | null;
  interval_days?: number | null;
  weekly_dow?: number | null;
  weekly_time?: string | null;
  timezone?: string | null;
}

type FullSettings = {
  schedule_mode: string;
  interval_days: number | null;
  weekly_dow: number;
  weekly_time: string;
  timezone: string;
};

const DAY_MS = 86_400_000;

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
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
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
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [y, m, d] = dtf.format(from).split('-').map(Number);
  return { y, m, d };
}

function getZonedParts(d: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const p = Object.fromEntries(dtf.formatToParts(d).map((x) => [x.type, Number(x.value)]));
  return { y: p.year, mo: p.month, d: p.day, h: p.hour === 24 ? 0 : p.hour, mi: p.minute };
}

// Add whole days while preserving the wall-clock time in the configured zone.
function addDaysInZone(d: Date, days: number, timeZone: string): Date {
  const { y, mo, d: day, h, mi } = getZonedParts(d, timeZone);
  const base = new Date(Date.UTC(y, mo - 1, day + days));
  return zonedTimeToUtc(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate(), h, mi, timeZone);
}

// Soonest occurrence of the configured daily time strictly after `from`.
function nextDailyTime(cfg: FullSettings, from: Date): Date {
  const [h, m] = cfg.weekly_time.split(':').map(Number);
  const today = todayInZone(cfg.timezone, from);
  for (let offset = 0; offset <= 2; offset++) {
    const base = new Date(Date.UTC(today.y, today.m - 1, today.d + offset));
    const candidate = zonedTimeToUtc(
      base.getUTCFullYear(),
      base.getUTCMonth() + 1,
      base.getUTCDate(),
      h,
      m,
      cfg.timezone
    );
    if (candidate.getTime() > from.getTime()) return candidate;
  }
  throw new Error('Could not compute the next publishing time.');
}

function clampInterval(days: number | null | undefined): number {
  return Math.min(Math.max(Number(days ?? 3), 1), 90);
}

// Merges a settings row with the defaults the admin also assumes, so a missing
// or null column never shifts where a video lands.
export function slotSettingsFrom(row: SlotSettings | null | undefined): FullSettings {
  return {
    schedule_mode: row?.schedule_mode || 'weekly',
    interval_days: row?.interval_days ?? null,
    weekly_dow: row?.weekly_dow ?? 2,
    weekly_time: row?.weekly_time || '09:00',
    timezone: row?.timezone || 'Australia/Sydney',
  };
}

// The next slot in the cadence, strictly after `from`:
// - weekly: the next matching day/time.
// - interval: the soonest daily time after `from` (allocate spaces the rest).
export function nextPublishingSlot(settings: SlotSettings, from: Date = new Date()): Date {
  const cfg = slotSettingsFrom(settings);
  const [h, m] = cfg.weekly_time.split(':').map(Number);
  if (cfg.schedule_mode === 'interval') {
    return nextDailyTime(cfg, from);
  }
  const today = todayInZone(cfg.timezone, from);
  for (let offset = 0; offset <= 8; offset++) {
    const base = new Date(Date.UTC(today.y, today.m - 1, today.d) + offset * DAY_MS);
    if (base.getUTCDay() !== cfg.weekly_dow) continue;
    const candidate = zonedTimeToUtc(
      base.getUTCFullYear(),
      base.getUTCMonth() + 1,
      base.getUTCDate(),
      h,
      m,
      cfg.timezone
    );
    if (candidate.getTime() > from.getTime()) return candidate;
  }
  throw new Error('Could not compute the next publishing slot.');
}

// Books `count` consecutive free cadence slots, spaced by the configured cadence
// and sliding past anything already scheduled so two bookings never collide.
// Interval mode anchors on the latest scheduled slot so the every-N-days chain
// continues; with nothing scheduled it starts at the next daily time.
export function allocatePublishingSlots(
  settings: SlotSettings,
  count: number,
  existing: Date[] = [],
  from: Date = new Date()
): Date[] {
  const cfg = slotSettingsFrom(settings);
  const tz = cfg.timezone;
  const taken = new Set<number>(
    existing.filter((d) => d.getTime() > from.getTime()).map((d) => d.getTime())
  );
  const slots: Date[] = [];

  if (cfg.schedule_mode === 'interval') {
    const step = clampInterval(cfg.interval_days);
    const anchors = existing.map((d) => d.getTime());
    let candidate = anchors.length
      ? addDaysInZone(new Date(Math.max(...anchors)), step, tz)
      : nextDailyTime(cfg, from);
    while (candidate.getTime() <= from.getTime()) candidate = addDaysInZone(candidate, step, tz);
    for (let i = 0; i < count; i++) {
      while (taken.has(candidate.getTime())) candidate = addDaysInZone(candidate, step, tz);
      slots.push(candidate);
      taken.add(candidate.getTime());
      candidate = addDaysInZone(candidate, step, tz);
    }
    return slots;
  }

  let cursor = new Date(from);
  for (let i = 0; i < count; i++) {
    const s = nextPublishingSlot(cfg, cursor);
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
