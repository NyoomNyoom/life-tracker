import type { Metadata } from "next";
import Link from "next/link";
import { Award, ChartColumn, Play, Plus, Route, Trophy } from "lucide-react";
import { BarbellIcon } from "@/components/icons";
import { PendingWorkoutBanner } from "@/components/pending-workout-banner";
import { Badge, EmptyState, IconSquare, LinkButton, ListRow, PageHeader, Rows, Tile, TileHeader, cx } from "@/components/ui";
import { friendlyDate } from "@/lib/dates";
import { weeklyStats } from "@/lib/training";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Train" };

export default async function TrainPage() {
  const { supabase, userId, profile, today } = await getViewer();

  const [{ data: routines }, { data: workouts }] = await Promise.all([
    supabase.from("routines").select("id, name, routine_exercises(count)").order("name"),
    supabase
      .from("workouts")
      .select("id, name, workout_date, started_at, ended_at, workout_sets(exercise_position, is_pr, exercise:exercises(kind))")
      .order("workout_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const stats = weeklyStats((workouts ?? []).map((w) => w.workout_date), today, profile.weekly_workout_goal);

  return (
    <>
      <PageHeader
        title="Train"
        subtitle={`${stats.thisWeek} of ${stats.goal} this week${stats.streakWeeks > 0 ? ` · ${stats.streakWeeks}-week streak` : ""}`}
      />
      <PendingWorkoutBanner userId={userId} />

      <div className="mx-3 mb-2.5">
        <LinkButton href="/workouts/new" size="xl" block>
          <Play className="size-5 fill-current" aria-hidden /> Start empty workout
        </LinkButton>
      </div>

      <Tile tone="training">
        <TileHeader
          title="Routines"
          action={
            <LinkButton href="/routines/new" variant="outline" size="sm">
              <Plus className="size-5" aria-hidden /> New
            </LinkButton>
          }
        />
        {routines && routines.length > 0 ? (
          <Rows>
            {routines.map((r) => {
              const count = r.routine_exercises[0]?.count ?? 0;
              return (
                <div key={r.id} className="flex items-center gap-3 py-3">
                  <Link href={`/routines/${r.id}`} className="min-w-0 flex-1 active:opacity-70">
                    <span className="block truncate text-[22px] font-extrabold tracking-tight">{r.name}</span>
                    <span className="block text-[15px] font-medium">
                      {count} exercise{count === 1 ? "" : "s"}
                    </span>
                  </Link>
                  <LinkButton href={`/workouts/new?routine=${r.id}`} size="md" aria-label={`Start ${r.name}`}>
                    Start
                  </LinkButton>
                </div>
              );
            })}
          </Rows>
        ) : (
          <EmptyState title="No routines yet" body="Save your usual workouts (like “Push Day”) to start them in one tap." />
        )}
      </Tile>

      <Tile>
        <TileHeader title="History" />
        {workouts && workouts.length > 0 ? (
          <Rows>
            {workouts.map((w) => {
              const exerciseCount = new Set(w.workout_sets.map((s) => s.exercise_position)).size;
              const prCount = w.workout_sets.filter((s) => s.is_pr).length;
              // Walks, runs and rides (every set a distance) get the trail icon.
              const outing = w.workout_sets.length > 0 && w.workout_sets.every((s) => s.exercise?.kind === "distance_time");
              return (
                <ListRow
                  key={w.id}
                  href={`/workouts/${w.id}`}
                  icon={
                    <IconSquare tone={outing ? "done" : "trainingSoft"}>
                      {outing ? <Route /> : <BarbellIcon />}
                    </IconSquare>
                  }
                  title={w.name}
                  subtitle={`${friendlyDate(w.workout_date, today)} · ${exerciseCount} exercise${exerciseCount === 1 ? "" : "s"}, ${w.workout_sets.length} set${w.workout_sets.length === 1 ? "" : "s"}`}
                  right={
                    prCount > 0 ? (
                      <Badge tone="pr">
                        <Trophy className="size-3.5" aria-hidden /> {prCount}
                      </Badge>
                    ) : undefined
                  }
                />
              );
            })}
          </Rows>
        ) : (
          <EmptyState title="No workouts yet" body="Start one above. Even logging “went to the gym” counts toward your streak." />
        )}
      </Tile>

      <div className="mx-3 grid grid-cols-3 gap-2.5">
        {[
          { href: "/challenges", label: "Distance challenges", icon: Route, tone: "bg-challenges text-challenges-ink" },
          { href: "/exercises", label: "Exercises & progress", icon: ChartColumn, tone: "bg-card text-ink" },
          { href: "/achievements", label: "Medals & badges", icon: Award, tone: "bg-achievements text-achievements-ink" },
        ].map(({ href, label, icon: Icon, tone }) => (
          <Link key={href} href={href} className={cx("flex min-h-36 flex-col justify-between rounded-tile p-4 active:opacity-85", tone)}>
            <Icon className="size-7" aria-hidden />
            <span className="text-[17px] leading-tight font-extrabold">{label}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
