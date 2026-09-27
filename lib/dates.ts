import { DateTime } from "luxon";

// Dates that mean "a day in the user's life" are ISO strings (YYYY-MM-DD) in the user's timezone.

export function nowIn(timezone: string): DateTime {
  const dt = DateTime.now().setZone(timezone);
  return dt.isValid ? dt : DateTime.now().setZone("UTC");
}

export function todayIn(timezone: string): string {
  return nowIn(timezone).toISODate()!;
}

export function parseISODate(date: string): DateTime {
  return DateTime.fromISO(date, { zone: "UTC" });
}

/** ISO weekday: 1 = Monday ... 7 = Sunday. */
export function isoWeekday(date: string): number {
  return parseISODate(date).weekday;
}

export function addDays(date: string, days: number): string {
  return parseISODate(date).plus({ days }).toISODate()!;
}

/** Monday of the week containing `date`. */
export function startOfWeek(date: string): string {
  return parseISODate(date).startOf("week").toISODate()!;
}

export function daysBetween(from: string, to: string): number {
  return Math.round(parseISODate(to).diff(parseISODate(from), "days").days);
}

/** "Today", "Yesterday", "Mon 22 Sep", or "22 Sep 2025" for other years. */
export function friendlyDate(date: string, today: string): string {
  if (date === today) return "Today";
  if (date === addDays(today, -1)) return "Yesterday";
  if (date === addDays(today, 1)) return "Tomorrow";
  const d = parseISODate(date);
  const t = parseISODate(today);
  return d.year === t.year ? d.toFormat("ccc d LLL") : d.toFormat("d LLL yyyy");
}

export function shortDate(date: string): string {
  return parseISODate(date).toFormat("d LLL");
}

export const WEEKDAYS = [
  { value: 1, short: "M", label: "Mon" },
  { value: 2, short: "T", label: "Tue" },
  { value: 3, short: "W", label: "Wed" },
  { value: 4, short: "T", label: "Thu" },
  { value: 5, short: "F", label: "Fri" },
  { value: 6, short: "S", label: "Sat" },
  { value: 7, short: "S", label: "Sun" },
] as const;

/** "Every day", "Weekdays", "Mon, Wed, Fri" */
export function describeWeekdays(days: number[]): string {
  const sorted = [...new Set(days)].sort();
  if (sorted.length === 7) return "Every day";
  if (sorted.join() === "1,2,3,4,5") return "Weekdays";
  if (sorted.join() === "6,7") return "Weekends";
  return sorted.map((d) => WEEKDAYS[d - 1]?.label).join(", ");
}

/** "09:00:00" -> "9:00 am" */
export function formatTimeOfDay(time: string): string {
  const dt = DateTime.fromFormat(time.slice(0, 5), "HH:mm");
  return dt.isValid ? dt.toFormat("h:mm a").toLowerCase() : time;
}

/** Seconds -> "1:05:30" or "4:05" */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** Parses "90", "1:30" or "1:02:03" into seconds. */
export function parseDuration(raw: string): number | null {
  const parts = raw.trim().split(":").map((p) => p.trim());
  if (parts.length === 0 || parts.length > 3 || parts.some((p) => p === "" || !/^\d+$/.test(p))) return null;
  return parts.map(Number).reduce((acc, n) => acc * 60 + n, 0);
}
