import { parseDuration } from "./dates";
import type { ExerciseLite } from "./exercises";
import { EMPTY_BESTS, formatDistance, isPersonalRecord, isSetComplete, mergeBests, type Bests, type ExerciseKind, type SetValues } from "./training";
import { formatNumber, fromKg, parseWeightInput, type Unit } from "./units";

// The in-progress workout lives in localStorage as a "draft" so nothing is lost if the phone
// loses signal, the app is swiped away, or the page reloads. Inputs are kept as the strings the
// user typed (in their unit) and only converted to stored values (kg, metres, seconds) on save.

export type DraftSet = {
  key: string;
  weight: string;
  reps: string;
  duration: string;
  distance: string;
  warmup: boolean;
  done: boolean;
};

export type DraftExercise = {
  key: string;
  exercise: ExerciseLite;
  restSeconds: number;
  targetReps: number | null;
  sets: DraftSet[];
};

export type WorkoutDraft = {
  version: 1;
  id: string;
  mode: "new" | "edit";
  name: string;
  date: string;
  routineId: string | null;
  startedAt: string;
  endedAt: string | null;
  notes: string;
  exercises: DraftExercise[];
  /** Finish was pressed but the upload failed (usually no signal); retried automatically. */
  pendingSync: boolean;
  updatedAt: string;
};

export type ExerciseSnapshot = {
  hasHistory: boolean;
  bests: Bests;
  lastDate: string | null;
  lastSets: SetValues[];
};

export function draftStorageKey(userId: string, workoutId?: string) {
  return workoutId ? `lt:workout:${userId}:${workoutId}` : `lt:workout:${userId}:new`;
}

export function newKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

export function emptySet(): DraftSet {
  return { key: newKey(), weight: "", reps: "", duration: "", distance: "", warmup: false, done: false };
}

/** Distance inputs are km for metric users and miles for imperial users. */
function metersPerInputUnit(unit: Unit) {
  return unit === "kg" ? 1000 : 1609.344;
}

export function distanceUnitLabel(unit: Unit) {
  return unit === "kg" ? "km" : "mi";
}

function parseIntOrNull(raw: string): number | null {
  if (!raw.trim()) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/** Converts what was typed into stored values. Empty strings become null. */
export function parseSet(set: Pick<DraftSet, "weight" | "reps" | "duration" | "distance">, unit: Unit): SetValues {
  const distance = set.distance.trim() ? Number(set.distance.replace(",", ".")) : NaN;
  return {
    weight_kg: set.weight.trim() ? parseWeightInput(set.weight, unit) : null,
    reps: parseIntOrNull(set.reps),
    duration_seconds: set.duration.trim() ? parseDuration(set.duration) : null,
    distance_m: Number.isFinite(distance) && distance >= 0 ? Math.round(distance * metersPerInputUnit(unit) * 10) / 10 : null,
  };
}

/** Stored values back into input strings, for prefilling from last time or editing a saved workout. */
export function toInputs(values: SetValues, unit: Unit): Pick<DraftSet, "weight" | "reps" | "duration" | "distance"> {
  const d = values.duration_seconds;
  return {
    weight: values.weight_kg != null ? formatNumber(fromKg(values.weight_kg, unit), 2) : "",
    reps: values.reps != null ? String(values.reps) : "",
    duration: d != null ? `${Math.floor(d / 60)}:${String(d % 60).padStart(2, "0")}` : "",
    distance: values.distance_m != null ? formatNumber(values.distance_m / metersPerInputUnit(unit), 2) : "",
  };
}

export function hasInput(set: DraftSet): boolean {
  return [set.weight, set.reps, set.duration, set.distance].some((v) => v.trim() !== "");
}

/** A set is saved if it was ticked off or has enough data typed in. */
export function isLoggable(kind: ExerciseKind, set: DraftSet, unit: Unit): boolean {
  return isSetComplete(kind, parseSet(set, unit));
}

type SetInputs = Pick<DraftSet, "weight" | "reps" | "duration" | "distance">;

/**
 * The set as saved when ticked: blanks are filled from `source` (the previous set in this session,
 * else the same set last time, which is what the placeholders show) when the set can't be saved as
 * typed. Cardio fills a blank distance or time even when the other was typed, because a time alone
 * is saveable and the greyed-out distance would otherwise be dropped (and not count toward challenges).
 */
export function fillBlanks(kind: ExerciseKind, set: DraftSet, source: SetInputs, unit: Unit): DraftSet {
  const needsFill = kind === "distance_time" ? !set.distance.trim() || !set.duration.trim() : !isLoggable(kind, set, unit);
  if (!needsFill) return set;
  const pick = (typed: string, fallback: string) => (typed.trim() ? typed : fallback);
  return {
    ...set,
    weight: pick(set.weight, source.weight),
    reps: pick(set.reps, source.reps),
    duration: pick(set.duration, source.duration),
    distance: pick(set.distance, source.distance),
  };
}

/** Why a typed distance or time can't be read (it would be saved as blank), or null if it's fine. */
export function unreadableInput(kind: ExerciseKind, set: DraftSet, unit: Unit): string | null {
  const values = parseSet(set, unit);
  if (kind === "distance_time" && set.distance.trim() && values.distance_m == null) {
    return `Enter the distance as a number of ${unit === "kg" ? "kilometres" : "miles"}, like 2.5.`;
  }
  if ((kind === "duration" || kind === "distance_time") && set.duration.trim() && values.duration_seconds == null) {
    return "Enter the time as minutes:seconds, like 25:00.";
  }
  return null;
}

/** A cardio set that will save with a time but no distance, so it won't count toward distance challenges. */
export function lacksDistance(kind: ExerciseKind, set: DraftSet, unit: Unit): boolean {
  if (kind !== "distance_time") return false;
  const values = parseSet(set, unit);
  return (values.distance_m ?? 0) <= 0 && (values.duration_seconds ?? 0) > 0;
}

/**
 * Which sets are personal records, compared against history and the sets before them in this
 * session (so repeating a PR weight on the next set doesn't count twice). Warm-ups never count.
 */
export function computePRs(draft: WorkoutDraft, snapshots: Record<string, ExerciseSnapshot | undefined>, unit: Unit): Set<string> {
  const prs = new Set<string>();
  const running = new Map<string, { bests: Bests; hasHistory: boolean }>();
  for (const ex of draft.exercises) {
    const id = ex.exercise.id;
    if (!running.has(id)) {
      const snap = snapshots[id];
      running.set(id, { bests: snap?.bests ?? EMPTY_BESTS, hasHistory: snap?.hasHistory ?? false });
    }
    const state = running.get(id)!;
    for (const set of ex.sets) {
      if (set.warmup || !isLoggable(ex.exercise.kind, set, unit)) continue;
      const values = parseSet(set, unit);
      if (isPersonalRecord(ex.exercise.kind, values, state.bests, state.hasHistory)) prs.add(set.key);
      state.bests = mergeBests(state.bests, values);
      state.hasHistory = true;
    }
  }
  return prs;
}

export type SavePayload = {
  workout: {
    id: string;
    workout_date: string;
    name: string;
    routine_id: string | null;
    started_at: string;
    ended_at: string | null;
    notes: string;
  };
  sets: {
    exercise_id: string;
    exercise_position: number;
    set_number: number;
    reps: number | null;
    weight_kg: number | null;
    duration_seconds: number | null;
    distance_m: number | null;
    is_warmup: boolean;
    is_pr: boolean;
  }[];
};

/** The arguments for the save_workout RPC. Exercises with no loggable sets are dropped. */
export function buildPayload(draft: WorkoutDraft, unit: Unit, prs: Set<string>, endedAt: string | null): SavePayload {
  const sets: SavePayload["sets"] = [];
  let position = 0;
  for (const ex of draft.exercises) {
    const loggable = ex.sets.filter((s) => isLoggable(ex.exercise.kind, s, unit));
    if (loggable.length === 0) continue;
    loggable.forEach((s, i) => {
      const v = parseSet(s, unit);
      sets.push({
        exercise_id: ex.exercise.id,
        exercise_position: position,
        set_number: i + 1,
        reps: v.reps ?? null,
        weight_kg: v.weight_kg ?? null,
        duration_seconds: v.duration_seconds ?? null,
        distance_m: v.distance_m ?? null,
        is_warmup: s.warmup,
        is_pr: prs.has(s.key),
      });
    });
    position++;
  }
  return {
    workout: {
      id: draft.id,
      workout_date: draft.date,
      name: draft.name.trim() || "Workout",
      routine_id: draft.routineId,
      started_at: draft.startedAt,
      ended_at: endedAt,
      notes: draft.notes,
    },
    sets,
  };
}

/** Short "last time" hint for a set row, e.g. "80×5" or "5 km". */
export function previousHint(kind: ExerciseKind, prev: SetValues | undefined, unit: Unit): string {
  if (!prev) return "—";
  switch (kind) {
    case "weight_reps":
      return `${formatNumber(fromKg(prev.weight_kg ?? 0, unit), 1)}×${prev.reps ?? 0}`;
    case "bodyweight_reps":
      return prev.weight_kg ? `+${formatNumber(fromKg(prev.weight_kg, unit), 1)}×${prev.reps ?? 0}` : `${prev.reps ?? 0}`;
    case "duration": {
      const d = prev.duration_seconds ?? 0;
      return `${Math.floor(d / 60)}:${String(d % 60).padStart(2, "0")}`;
    }
    case "distance_time":
      return prev.distance_m ? formatDistance(prev.distance_m, unit) : "—";
  }
}
