import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Trophy } from "lucide-react";
import { Celebration } from "@/components/celebration";
import { ConfirmButton } from "@/components/confirm-button";
import { Badge, Card, LinkButton, Notice, PageHeader } from "@/components/ui";
import { friendlyDate } from "@/lib/dates";
import { formatSet, type ExerciseKind } from "@/lib/training";
import { getViewer } from "@/lib/viewer";
import { deleteWorkout } from "../actions";

export const metadata: Metadata = { title: "Workout" };

export default async function WorkoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; earned?: string }>;
}) {
  const [{ id }, { saved, earned }] = await Promise.all([params, searchParams]);
  const { supabase, unit, today } = await getViewer();
  const { data: workout } = await supabase
    .from("workouts")
    .select("*, workout_sets(*, exercise:exercises(id, name, kind))")
    .eq("id", id)
    .order("exercise_position", { referencedTable: "workout_sets" })
    .order("set_number", { referencedTable: "workout_sets" })
    .maybeSingle();
  if (!workout) notFound();

  const groups = new Map<number, { exercise: { id: string; name: string; kind: string }; sets: typeof workout.workout_sets }>();
  for (const s of workout.workout_sets) {
    const g = groups.get(s.exercise_position) ?? { exercise: s.exercise!, sets: [] };
    g.sets.push(s);
    groups.set(s.exercise_position, g);
  }
  const prCount = workout.workout_sets.filter((s) => s.is_pr).length;
  const minutes =
    workout.started_at && workout.ended_at
      ? Math.round((new Date(workout.ended_at).getTime() - new Date(workout.started_at).getTime()) / 60000)
      : null;

  return (
    <>
      <PageHeader
        back={{ href: "/workouts", label: "Train" }}
        title={workout.name}
        subtitle={[friendlyDate(workout.workout_date, today), minutes != null && minutes > 0 && minutes < 600 ? `${minutes} min` : null].filter(Boolean).join(" · ")}
        action={
          <LinkButton href={`/workouts/${workout.id}/edit`} variant="secondary" size="sm">
            Edit
          </LinkButton>
        }
      />
      {saved && (
        <div className="mx-4 mb-4">
          <Notice tone="accent">
            Workout saved{prCount > 0 ? `, with ${prCount} new personal record${prCount === 1 ? "" : "s"} 🏆` : ". Nice work!"}
          </Notice>
        </div>
      )}

      {earned && <Celebration keys={earned.split(",")} />}

      {groups.size === 0 && (
        <Card className="px-4 py-5 text-[15px] text-muted">Logged as a gym visit with no sets.</Card>
      )}

      {[...groups.entries()]
        .sort(([a], [b]) => a - b)
        .map(([pos, g]) => {
          let working = 0;
          return (
            <Card key={pos} className="pb-2">
              <Link href={`/exercises/${g.exercise.id}`} className="block px-4 pt-3 pb-1 text-[17px] font-semibold text-accent">
                {g.exercise.name}
              </Link>
              <ul>
                {g.sets.map((s) => {
                  if (!s.is_warmup) working++;
                  return (
                    <li key={s.id} className="flex items-center gap-3 px-4 py-1.5 text-[16px]">
                      <span className={`w-6 text-center font-semibold tabular ${s.is_warmup ? "text-warn" : "text-muted"}`}>
                        {s.is_warmup ? "W" : working}
                      </span>
                      <span className="flex-1 tabular">
                        {formatSet(
                          g.exercise.kind as ExerciseKind,
                          {
                            reps: s.reps,
                            weight_kg: s.weight_kg != null ? Number(s.weight_kg) : null,
                            duration_seconds: s.duration_seconds,
                            distance_m: s.distance_m != null ? Number(s.distance_m) : null,
                          },
                          unit,
                        )}
                      </span>
                      {s.is_pr && (
                        <Badge tone="pr">
                          <Trophy className="size-3" aria-hidden /> PR
                        </Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          );
        })}

      {workout.notes && (
        <Card className="px-4 py-3">
          <p className="text-[13px] font-semibold tracking-wide text-muted uppercase">Notes</p>
          <p className="mt-1 text-[15px] whitespace-pre-wrap">{workout.notes}</p>
        </Card>
      )}

      <form action={deleteWorkout} className="mx-4 mt-6">
        <input type="hidden" name="id" value={workout.id} />
        <ConfirmButton message="Delete this workout and all of its sets?" variant="danger" block>
          Delete workout
        </ConfirmButton>
      </form>
    </>
  );
}
