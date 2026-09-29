import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkoutLoggerClient } from "@/components/workout-logger-client";
import { EXERCISE_COLUMNS, type ExerciseLite } from "@/lib/exercises";
import { getViewer } from "@/lib/viewer";
import { draftStorageKey, toInputs, type DraftExercise, type WorkoutDraft } from "@/lib/workout-draft";

export const metadata: Metadata = { title: "Edit workout" };

export default async function EditWorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId, unit } = await getViewer();

  const [{ data: workout }, { data: exercises }] = await Promise.all([
    supabase
      .from("workouts")
      .select(`*, workout_sets(*, exercise:exercises(${EXERCISE_COLUMNS}))`)
      .eq("id", id)
      .order("exercise_position", { referencedTable: "workout_sets" })
      .order("set_number", { referencedTable: "workout_sets" })
      .maybeSingle(),
    supabase.from("exercises").select(EXERCISE_COLUMNS).order("name"),
  ]);
  if (!workout) notFound();

  const byPosition = new Map<number, DraftExercise>();
  for (const s of workout.workout_sets) {
    const group =
      byPosition.get(s.exercise_position) ??
      ({ key: crypto.randomUUID(), exercise: s.exercise as ExerciseLite, restSeconds: 90, targetReps: null, sets: [] } satisfies DraftExercise);
    group.sets.push({
      key: crypto.randomUUID(),
      ...toInputs(
        {
          reps: s.reps,
          weight_kg: s.weight_kg != null ? Number(s.weight_kg) : null,
          duration_seconds: s.duration_seconds,
          distance_m: s.distance_m != null ? Number(s.distance_m) : null,
        },
        unit,
      ),
      warmup: s.is_warmup,
      done: true,
    });
    byPosition.set(s.exercise_position, group);
  }

  const draft: WorkoutDraft = {
    version: 1,
    id: workout.id,
    mode: "edit",
    name: workout.name,
    date: workout.workout_date,
    routineId: workout.routine_id,
    startedAt: workout.started_at ?? workout.created_at,
    endedAt: workout.ended_at,
    notes: workout.notes ?? "",
    exercises: [...byPosition.entries()].sort(([a], [b]) => a - b).map(([, g]) => g),
    pendingSync: false,
    updatedAt: new Date().toISOString(),
  };

  return (
    <WorkoutLoggerClient
      userId={userId}
      unit={unit}
      exercises={(exercises ?? []) as ExerciseLite[]}
      initialDraft={draft}
      storageKey={draftStorageKey(userId, workout.id)}
    />
  );
}
