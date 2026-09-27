import type { Metadata } from "next";
import { WorkoutLoggerClient } from "@/components/workout-logger-client";
import { EXERCISE_COLUMNS, type ExerciseLite } from "@/lib/exercises";
import { getViewer } from "@/lib/viewer";
import { draftStorageKey, emptySet, type WorkoutDraft } from "@/lib/workout-draft";

export const metadata: Metadata = { title: "Workout" };

export default async function NewWorkoutPage({ searchParams }: { searchParams: Promise<{ routine?: string }> }) {
  const { routine: routineId } = await searchParams;
  const { supabase, userId, unit, today } = await getViewer();

  const { data: exercises } = await supabase.from("exercises").select(EXERCISE_COLUMNS).order("name");

  const draft: WorkoutDraft = {
    version: 1,
    id: crypto.randomUUID(),
    mode: "new",
    name: "Workout",
    date: today,
    routineId: null,
    startedAt: new Date().toISOString(),
    endedAt: null,
    notes: "",
    exercises: [],
    pendingSync: false,
    updatedAt: new Date().toISOString(),
  };

  if (routineId) {
    const { data: routine } = await supabase
      .from("routines")
      .select(`id, name, routine_exercises(position, target_sets, target_reps, rest_seconds, exercise:exercises(${EXERCISE_COLUMNS}))`)
      .eq("id", routineId)
      .order("position", { referencedTable: "routine_exercises" })
      .maybeSingle();
    if (routine) {
      draft.name = routine.name;
      draft.routineId = routine.id;
      draft.exercises = routine.routine_exercises.map((re) => ({
        key: crypto.randomUUID(),
        exercise: re.exercise as ExerciseLite,
        restSeconds: re.rest_seconds,
        targetReps: re.target_reps,
        sets: Array.from({ length: re.target_sets }, emptySet),
      }));
    }
  }

  return (
    <WorkoutLoggerClient
      userId={userId}
      unit={unit}
      exercises={(exercises ?? []) as ExerciseLite[]}
      initialDraft={draft}
      storageKey={draftStorageKey(userId)}
    />
  );
}
