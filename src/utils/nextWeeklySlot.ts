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

// Next occurrence of the weekly slot in the configured timezone, strictly after
// `from`. Falls back to the same wall time on the following day if `from` is
// already past today's slot.
export function nextWeeklySlot(
  settings: Pick<PublishingSettings, "weekly_dow" | "weekly_time" | "timezone">,
  from: Date = new Date()
): Date {
  const [h, m] = settings.weekly_time.split(":").map(Number);
  const today = todayInZone(settings.timezone, from);
  for (let offset = 0; offset <= 8; offset++) {
    const base = new Date(Date.UTC(today.y, today.m - 1, today.d) + offset * DAY_MS);
    const y = base.getUTCFullYear();
    const month = base.getUTCMonth() + 1;
    const d = base.getUTCDate();
    const dow = base.getUTCDay();
    if (dow !== settings.weekly_dow) continue;
    const candidate = zonedTimeToUtc(y, month, d, h, m, settings.timezone);
    if (candidate.getTime() > from.getTime()) return candidate;
  }
  throw new Error("Could not compute the next weekly slot.");
}