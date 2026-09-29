import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Trophy } from "lucide-react";
import { ConfirmButton } from "@/components/confirm-button";
import { ProgressChart } from "@/components/progress-chart";
import { Badge, EmptyState, Notice, PageHeader, Rows, Tile, TileHeader, cx } from "@/components/ui";
import { formatDuration, friendlyDate } from "@/lib/dates";
import { muscleLabel } from "@/lib/exercises";
import { estimate1RM, formatDistance, formatSet, type ExerciseKind, type SetValues } from "@/lib/training";
import { formatWeight } from "@/lib/units";
import { getViewer } from "@/lib/viewer";
import { deleteExercise } from "../actions";

export const metadata: Metadata = { title: "Exercise" };

type Session = { workoutId: string; date: string; name: string; sets: (SetValues & { is_pr: boolean })[]; metric: number; best: SetValues };

export default async function ExercisePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const { supabase, unit, today, userId } = await getViewer();

  const [{ data: exercise }, { data: sets }] = await Promise.all([
    supabase.from("exercises").select("id, name, muscle_group, kind, user_id").eq("id", id).maybeSingle(),
    supabase
      .from("workout_sets")
      .select("reps, weight_kg, duration_seconds, distance_m, is_pr, set_number, workout:workouts(id, workout_date, name, created_at)")
      .eq("exercise_id", id)
      .eq("is_warmup", false),
  ]);
  if (!exercise) notFound();
  const kind = exercise.kind as ExerciseKind;

  // The number that best captures a session's performance for this kind of exercise.
  const metricOf = (s: SetValues): number => {
    switch (kind) {
      case "weight_reps":
        return estimate1RM(s.weight_kg, s.reps) ?? 0;
      case "bodyweight_reps":
        return s.reps ?? 0;
      case "duration":
        return s.duration_seconds ?? 0;
      case "distance_time":
        return s.distance_m ?? 0;
    }
  };

  const byWorkout = new Map<string, Session>();
  for (const s of sets ?? []) {
    if (!s.workout) continue;
    const values: SetValues & { is_pr: boolean } = {
      reps: s.reps,
      weight_kg: s.weight_kg != null ? Number(s.weight_kg) : null,
      duration_seconds: s.duration_seconds,
      distance_m: s.distance_m != null ? Number(s.distance_m) : null,
      is_pr: s.is_pr,
    };
    const session = byWorkout.get(s.workout.id) ?? { workoutId: s.workout.id, date: s.workout.workout_date, name: s.workout.name, sets: [], metric: 0, best: values };
    session.sets.push(values);
    if (metricOf(values) >= session.metric) {
      session.metric = metricOf(values);
      session.best = values;
    }
    byWorkout.set(s.workout.id, session);
  }
  const sessions = [...byWorkout.values()].sort((a, b) => a.date.localeCompare(b.date));

  // One point per day (the best session if you trained it twice).
  const perDay = new Map<string, number>();
  sessions.forEach((s) => perDay.set(s.date, Math.max(perDay.get(s.date) ?? 0, s.metric)));
  const points = [...perDay].map(([date, value]) => ({ date, value })).filter((p) => p.value > 0);

  const all = sessions.flatMap((s) => s.sets);
  const heaviest = Math.max(0, ...all.map((s) => s.weight_kg ?? 0));
  const bestMetric = Math.max(0, ...points.map((p) => p.value));

  const metricLabel = { weight_reps: "Estimated 1-rep max", bodyweight_reps: "Most reps in a set", duration: "Longest hold", distance_time: "Longest distance" }[kind];
  const formatMetric = (v: number) =>
    kind === "weight_reps" ? formatWeight(v, unit) : kind === "bodyweight_reps" ? `${v} reps` : kind === "duration" ? formatDuration(v) : formatDistance(v, unit);

  const statTile = (label: string, value: number | string, tone: "training" | "card") => {
    // Split "91.8 kg" so the number can be the hero and the unit sits small beside it.
    const text = typeof value === "number" ? String(value) : value;
    const m = /^([\d.,:]+)\s*(.*)$/.exec(text);
    return (
      <div className={cx("rounded-tile p-5", tone === "training" ? "bg-training text-training-ink" : "bg-card text-ink")}>
        <p className={cx("text-[15px] font-semibold", tone === "card" && "text-muted")}>{label}</p>
        <p className="mt-1.5 flex items-baseline gap-1">
          <span className="tile-number text-[48px]">{m ? m[1] : text}</span>
          {m?.[2] && <span className="text-[20px] font-bold">{m[2]}</span>}
        </p>
      </div>
    );
  };

  return (
    <>
      <PageHeader back={{ href: "/exercises", label: "Exercises" }} title={exercise.name} subtitle={muscleLabel(exercise.muscle_group)} />
      {error === "in-use" && (
        <Notice tone="warn" className="mx-3 mb-2.5">
          This exercise is used in logged workouts, so it can&apos;t be deleted.
        </Notice>
      )}

      {sessions.length === 0 ? (
        <Tile>
          <EmptyState title="Not logged yet" body="Once you log this exercise, your bests and a progress chart show up here." />
        </Tile>
      ) : (
        <>
          <div className="mx-3 mb-2.5 grid grid-cols-2 gap-2.5">
            {statTile(metricLabel, formatMetric(bestMetric), "training")}
            {statTile(kind === "weight_reps" ? "Heaviest weight" : "Sessions", kind === "weight_reps" ? formatWeight(heaviest, unit) : sessions.length, "card")}
          </div>

          <Tile>
            <TileHeader title={`${metricLabel} over time`} />
            {points.length > 1 ? (
              <ProgressChart points={points} kind={kind} unit={unit} label={metricLabel} />
            ) : (
              <p className="py-6 text-center text-[15px] font-medium text-muted">Log it again to start a chart.</p>
            )}
          </Tile>

          <Tile>
            <TileHeader title="Sessions" />
            <Rows>
              {[...sessions].reverse().map((s) => (
                <Link key={s.workoutId} href={`/workouts/${s.workoutId}`} className="block py-3.5 active:opacity-70">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[20px] font-extrabold tracking-tight">{friendlyDate(s.date, today)}</span>
                    {s.sets.some((x) => x.is_pr) && (
                      <Badge tone="pr">
                        <Trophy className="size-3.5" aria-hidden /> PR
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 font-mono text-[15px] text-muted">{s.sets.map((x) => formatSet(kind, x, unit)).join(" · ")}</p>
                </Link>
              ))}
            </Rows>
          </Tile>
        </>
      )}

      {exercise.user_id === userId && (
        <form action={deleteExercise} className="mx-3 mt-5">
          <input type="hidden" name="id" value={exercise.id} />
          <ConfirmButton message={`Delete your custom exercise “${exercise.name}”?`} size="lg" block>
            Delete exercise
          </ConfirmButton>
        </form>
      )}
    </>
  );
}
