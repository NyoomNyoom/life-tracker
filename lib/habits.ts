import { addDays } from "./dates";

// Teeth brushing: a morning and a night check-in per local day. A day is "complete" when both
// slots are brushed. Streaks count complete days in a row, ending today if today is already
// complete, otherwise yesterday (so an unfinished today doesn't break the streak yet).

export type BrushSlot = "morning" | "night";
export const BRUSH_SLOTS: BrushSlot[] = ["morning", "night"];

export type BrushLog = { log_date: string; slot: BrushSlot | string; flossed: boolean; mouthwash: boolean };

export type BrushDay = { morning: BrushLog | null; night: BrushLog | null };

export function groupByDay(logs: BrushLog[]): Map<string, BrushDay> {
  const days = new Map<string, BrushDay>();
  for (const log of logs) {
    const day = days.get(log.log_date) ?? { morning: null, night: null };
    if (log.slot === "morning" || log.slot === "night") day[log.slot] = log;
    days.set(log.log_date, day);
  }
  return days;
}

function streak(today: string, isDone: (date: string) => boolean): number {
  let date = isDone(today) ? today : addDays(today, -1);
  let count = 0;
  while (isDone(date)) {
    count++;
    date = addDays(date, -1);
  }
  return count;
}

export type BrushingStats = {
  today: BrushDay;
  /** Days in a row with both morning and night brushed. */
  streak: number;
  /** Days in a row with at least one floss. */
  flossStreak: number;
  /** Over the last 7 days including today. */
  week: { complete: number; flossed: number; mouthwash: number };
};

export function brushingStats(logs: BrushLog[], today: string): BrushingStats {
  const days = groupByDay(logs);
  const complete = (d: string) => Boolean(days.get(d)?.morning && days.get(d)?.night);
  const flossed = (d: string) => Boolean(days.get(d)?.morning?.flossed || days.get(d)?.night?.flossed);
  const mouthwash = (d: string) => Boolean(days.get(d)?.morning?.mouthwash || days.get(d)?.night?.mouthwash);
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, -i));
  return {
    today: days.get(today) ?? { morning: null, night: null },
    streak: streak(today, complete),
    flossStreak: streak(today, flossed),
    week: {
      complete: last7.filter(complete).length,
      flossed: last7.filter(flossed).length,
      mouthwash: last7.filter(mouthwash).length,
    },
  };
}
