import type { Metadata } from "next";
import { ExerciseList } from "@/components/exercise-list";
import { PageHeader } from "@/components/ui";
import { EXERCISE_COLUMNS, type ExerciseLite } from "@/lib/exercises";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Exercises" };

export default async function ExercisesPage() {
  const { supabase } = await getViewer();
  const [{ data: exercises }, { data: sets }] = await Promise.all([
    supabase.from("exercises").select(EXERCISE_COLUMNS).order("name"),
    supabase.from("workout_sets").select("exercise_id, workout_id"),
  ]);

  // Number of workouts each exercise appears in.
  const sessions = new Map<string, Set<string>>();
  for (const s of sets ?? []) {
    const set = sessions.get(s.exercise_id) ?? new Set();
    set.add(s.workout_id);
    sessions.set(s.exercise_id, set);
  }
  const used = Object.fromEntries([...sessions].map(([id, w]) => [id, w.size]));

  return (
    <>
      <PageHeader back={{ href: "/workouts", label: "Train" }} title="Exercises" subtitle="Tap one to see your progress" />
      <ExerciseList exercises={(exercises ?? []) as ExerciseLite[]} used={used} />
    </>
  );
}
