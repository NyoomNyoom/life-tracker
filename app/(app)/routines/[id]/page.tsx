import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/confirm-button";
import { RoutineEditor } from "@/components/routine-editor";
import { LinkButton, PageHeader } from "@/components/ui";
import { EXERCISE_COLUMNS, type ExerciseLite } from "@/lib/exercises";
import { getViewer } from "@/lib/viewer";
import { deleteRoutine } from "../actions";

export const metadata: Metadata = { title: "Routine" };

export default async function RoutinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId } = await getViewer();
  const [{ data: routine }, { data: exercises }] = await Promise.all([
    supabase
      .from("routines")
      .select(`id, name, notes, routine_exercises(id, target_sets, target_reps, rest_seconds, position, exercise:exercises(${EXERCISE_COLUMNS}))`)
      .eq("id", id)
      .order("position", { referencedTable: "routine_exercises" })
      .maybeSingle(),
    supabase.from("exercises").select(EXERCISE_COLUMNS).order("name"),
  ]);
  if (!routine) notFound();

  return (
    <>
      <PageHeader
        back={{ href: "/workouts", label: "Train" }}
        title={routine.name}
        subtitle={`Routine · ${routine.routine_exercises.length} exercise${routine.routine_exercises.length === 1 ? "" : "s"}`}
        action={
          <LinkButton href={`/workouts/new?routine=${routine.id}`} size="md">
            Start
          </LinkButton>
        }
      />
      <RoutineEditor
        userId={userId}
        exercises={(exercises ?? []) as ExerciseLite[]}
        initial={{
          id: routine.id,
          name: routine.name,
          notes: routine.notes,
          items: routine.routine_exercises.map((re) => ({
            key: re.id,
            exercise: re.exercise as ExerciseLite,
            target_sets: re.target_sets,
            target_reps: re.target_reps,
            rest_seconds: re.rest_seconds,
          })),
        }}
      />
      <form action={deleteRoutine} className="mx-3 mt-2.5">
        <input type="hidden" name="id" value={routine.id} />
        <ConfirmButton message="Delete this routine? Workouts you logged with it are kept." size="lg" block>
          Delete routine
        </ConfirmButton>
      </form>
    </>
  );
}
