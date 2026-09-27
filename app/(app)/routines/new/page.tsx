import type { Metadata } from "next";
import { RoutineEditor } from "@/components/routine-editor";
import { PageHeader } from "@/components/ui";
import { EXERCISE_COLUMNS, type ExerciseLite } from "@/lib/exercises";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "New routine" };

export default async function NewRoutinePage() {
  const { supabase, userId } = await getViewer();
  const { data: exercises } = await supabase.from("exercises").select(EXERCISE_COLUMNS).order("name");
  return (
    <>
      <PageHeader back={{ href: "/workouts", label: "Train" }} title="New routine" />
      <RoutineEditor userId={userId} exercises={(exercises ?? []) as ExerciseLite[]} />
    </>
  );
}
