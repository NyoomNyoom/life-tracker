import type { Metadata } from "next";
import { Dumbbell, Play, Plus, Trophy } from "lucide-react";
import { PendingWorkoutBanner } from "@/components/pending-workout-banner";
import { Badge, Card, CardHeader, EmptyState, LinkButton, List, ListRow, PageHeader } from "@/components/ui";
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
      .select("id, name, workout_date, started_at, ended_at, workout_sets(exercise_position, is_pr)")
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

      <div className="mx-4 mb-4">
        <LinkButton href="/workouts/new" size="lg" block>
          <Play className="size-5" aria-hidden /> Start empty workout
        </LinkButton>
      </div>

      <Card>
        <CardHeader
          title="Routines"
          action={
            <LinkButton href="/routines/new" variant="ghost" size="sm">
              <Plus className="size-4" aria-hidden /> New
            </LinkButton>
          }
        />
        {routines && routines.length > 0 ? (
          <List>
            {routines.map((r) => (
              <div key={r.id} className="flex items-center gap-2 pr-3">
                <div className="min-w-0 flex-1">
                  <ListRow href={`/routines/${r.id}`} title={r.name} subtitle={`${r.routine_exercises[0]?.count ?? 0} exercises`} />
                </div>
                <LinkButton href={`/workouts/new?routine=${r.id}`} variant="secondary" size="sm" aria-label={`Start ${r.name}`}>
                  Start
                </LinkButton>
              </div>
            ))}
          </List>
        ) : (
          <EmptyState title="No routines yet" body="Save your usual workouts (like “Push Day”) to start them in one tap." />
        )}
      </Card>

      <Card>
        <CardHeader title="History" />
        {workouts && workouts.length > 0 ? (
          <List>
            {workouts.map((w) => {
              const exerciseCount = new Set(w.workout_sets.map((s) => s.exercise_position)).size;
              const prCount = w.workout_sets.filter((s) => s.is_pr).length;
              return (
                <ListRow
                  key={w.id}
                  href={`/workouts/${w.id}`}
                  icon={<Dumbbell className="size-5 text-accent" aria-hidden />}
                  title={w.name}
                  subtitle={`${friendlyDate(w.workout_date, today)} · ${exerciseCount} exercise${exerciseCount === 1 ? "" : "s"}, ${w.workout_sets.length} sets`}
                  right={
                    prCount > 0 ? (
                      <Badge tone="pr">
                        <Trophy className="size-3" aria-hidden /> {prCount}
                      </Badge>
                    ) : undefined
                  }
                />
              );
            })}
          </List>
        ) : (
          <EmptyState title="No workouts yet" body="Start one above. Even logging “went to the gym” counts toward your streak." />
        )}
      </Card>

      <Card>
        <List>
          <ListRow href="/challenges" title="Distance challenges" subtitle="Every km you log moves you along a route" />
          <ListRow href="/exercises" title="Exercises & progress" subtitle="Personal bests and charts for every lift" />
          <ListRow href="/achievements" title="Medals & badges" />
        </List>
      </Card>
    </>
  );
}
