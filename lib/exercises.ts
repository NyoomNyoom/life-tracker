import type { ExerciseKind } from "./training";

export type ExerciseLite = {
  id: string;
  name: string;
  muscle_group: string;
  kind: ExerciseKind;
  user_id: string | null;
};

export const MUSCLE_GROUPS: { value: string; label: string }[] = [
  { value: "chest", label: "Chest" },
  { value: "back", label: "Back" },
  { value: "shoulders", label: "Shoulders" },
  { value: "biceps", label: "Biceps" },
  { value: "triceps", label: "Triceps" },
  { value: "legs", label: "Legs" },
  { value: "glutes", label: "Glutes" },
  { value: "core", label: "Core" },
  { value: "full_body", label: "Full body" },
  { value: "cardio", label: "Cardio" },
  { value: "other", label: "Other" },
];

export const KINDS: { value: ExerciseKind; label: string; hint: string }[] = [
  { value: "weight_reps", label: "Weight × reps", hint: "Barbell, dumbbell, machine" },
  { value: "bodyweight_reps", label: "Bodyweight reps", hint: "Optional added weight" },
  { value: "duration", label: "Time", hint: "Planks, holds" },
  { value: "distance_time", label: "Distance + time", hint: "Running, rowing, cycling" },
];

export function muscleLabel(value: string): string {
  return MUSCLE_GROUPS.find((m) => m.value === value)?.label ?? value;
}

export const EXERCISE_COLUMNS = "id, name, muscle_group, kind, user_id";
