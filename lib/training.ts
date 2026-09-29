import { addDays, daysBetween, formatDuration, startOfWeek } from "./dates";
import { formatNumber, formatWeight, fromKg, type Unit } from "./units";

export type ExerciseKind = "weight_reps" | "bodyweight_reps" | "duration" | "distance_time";

export type SetValues = {
  reps?: number | null;
  weight_kg?: number | null;
  duration_seconds?: number | null;
  distance_m?: number | null;
};

export type Bests = {
  weight_kg: number | null;
  e1rm_kg: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance_m: number | null;
};

export const EMPTY_BESTS: Bests = { weight_kg: null, e1rm_kg: null, reps: null, duration_seconds: null, distance_m: null };

/**
 * Estimated one-rep max (Epley). Only trusted for 1-12 reps; returns null otherwise.
 * Keep in sync with public.exercise_snapshot in supabase/migrations.
 */
export function estimate1RM(weightKg: number | null | undefined, reps: number | null | undefined): number | null {
  if (!weightKg || weightKg <= 0 || !reps || reps < 1 || reps > 12) return null;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 100) / 100;
}

function gt(value: number | null | undefined, best: number | null): boolean {
  return value != null && value > 0 && (best == null || value > best + 1e-9);
}

/**
 * Whether a set beats your previous bests for this exercise. The first time you do an exercise
 * sets a baseline rather than a PR, so `hasHistory` must be true.
 */
export function isPersonalRecord(kind: ExerciseKind, set: SetValues, bests: Bests, hasHistory: boolean): boolean {
  if (!hasHistory) return false;
  switch (kind) {
    case "weight_reps":
      return gt(estimate1RM(set.weight_kg, set.reps), bests.e1rm_kg) || gt(set.weight_kg, bests.weight_kg);
    case "bodyweight_reps":
      return gt(set.reps, bests.reps) || gt(set.weight_kg, bests.weight_kg);
    case "duration":
      return gt(set.duration_seconds, bests.duration_seconds);
    case "distance_time":
      return gt(set.distance_m, bests.distance_m);
  }
}

/** Folds a completed set into the running bests, so later sets in the same session compare against it. */
export function mergeBests(bests: Bests, set: SetValues): Bests {
  const max = (a: number | null, b: number | null | undefined) => (b == null ? a : a == null ? b : Math.max(a, b));
  return {
    weight_kg: max(bests.weight_kg, set.weight_kg),
    e1rm_kg: max(bests.e1rm_kg, estimate1RM(set.weight_kg, set.reps)),
    reps: max(bests.reps, set.reps),
    duration_seconds: max(bests.duration_seconds, set.duration_seconds),
    distance_m: max(bests.distance_m, set.distance_m),
  };
}

export function formatDistance(meters: number, unit: Unit): string {
  if (unit === "lb") return `${formatNumber(meters / 1609.344, 2)} mi`;
  return meters >= 1000 ? `${formatNumber(meters / 1000, 2)} km` : `${formatNumber(meters, 0)} m`;
}

/** Human summary of a set: "80 kg × 5", "BW × 12", "+10 kg × 8", "1:30", "5 km · 25:00". */
export function formatSet(kind: ExerciseKind, set: SetValues, unit: Unit): string {
  switch (kind) {
    case "weight_reps":
      return `${formatNumber(fromKg(set.weight_kg ?? 0, unit), 1)} ${unit} × ${set.reps ?? 0}`;
    case "bodyweight_reps":
      return set.weight_kg && set.weight_kg > 0 ? `+${formatWeight(set.weight_kg, unit)} × ${set.reps ?? 0}` : `BW × ${set.reps ?? 0}`;
    case "duration":
      return formatDuration(set.duration_seconds ?? 0);
    case "distance_time": {
      const parts = [];
      if (set.distance_m) parts.push(formatDistance(set.distance_m, unit));
      if (set.duration_seconds) parts.push(formatDuration(set.duration_seconds));
      return parts.join(" · ") || "—";
    }
  }
}

/** Whether a set has enough data to be saved. */
export function isSetComplete(kind: ExerciseKind, set: SetValues): boolean {
  switch (kind) {
    case "weight_reps":
      return (set.reps ?? 0) > 0 && set.weight_kg != null;
    case "bodyweight_reps":
      return (set.reps ?? 0) > 0;
    case "duration":
      return (set.duration_seconds ?? 0) > 0;
    case "distance_time":
      return (set.distance_m ?? 0) > 0 || (set.duration_seconds ?? 0) > 0;
  }
}

export type WeeklyStats = {
  thisWeek: number;
  goal: number;
  /** Consecutive weeks (Mon-Sun) that met the goal, counting this week only once it has. */
  streakWeeks: number;
  daysSinceLast: number | null;
};

/** Gym stats from the dates you trained on. Rest days never break a streak; a week under goal does. */
export function weeklyStats(workoutDates: string[], today: string, goal: number): WeeklyStats {
  const days = new Set(workoutDates.filter((d) => d <= today));
  const perWeek = new Map<string, number>();
  for (const d of days) {
    const wk = startOfWeek(d);
    perWeek.set(wk, (perWeek.get(wk) ?? 0) + 1);
  }
  const thisWeekStart = startOfWeek(today);
  const thisWeek = perWeek.get(thisWeekStart) ?? 0;

  let streak = thisWeek >= goal ? 1 : 0;
  let week = addDays(thisWeekStart, -7);
  while ((perWeek.get(week) ?? 0) >= goal) {
    streak++;
    week = addDays(week, -7);
  }

  const last = [...days].sort().at(-1);
  return { thisWeek, goal, streakWeeks: streak, daysSinceLast: last ? daysBetween(last, today) : null };
}

/** Trailing moving average over the previous `window` calendar days (inclusive) for each point. */
export function movingAverage(points: { date: string; value: number }[], window = 7): { date: string; value: number }[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((p) => {
    const from = addDays(p.date, -(window - 1));
    const inWindow = sorted.filter((q) => q.date >= from && q.date <= p.date);
    const avg = inWindow.reduce((sum, q) => sum + q.value, 0) / inWindow.length;
    return { date: p.date, value: Math.round(avg * 100) / 100 };
  });
}
