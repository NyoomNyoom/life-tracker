import type { Metadata } from "next";
import Link from "next/link";
import { Bell, CheckCircle2, Dumbbell, Flame, ListChecks, Play, Scale } from "lucide-react";
import { InstallHint } from "@/components/install-hint";
import { PendingWorkoutBanner } from "@/components/pending-workout-banner";
import { ReminderSkip } from "@/components/reminder-skip";
import { Sparkline } from "@/components/sparkline";
import { TodoCheck } from "@/components/todo-check";
import { Badge, Card, CardHeader, LinkButton, Notice } from "@/components/ui";
import { WeightLogForm } from "@/components/weight-log-form";
import { addDays, formatTimeOfDay, nowIn, parseISODate } from "@/lib/dates";
import { appliesOn, dueInstant, type ReminderKind } from "@/lib/reminders/engine";
import { isOverdue, occursOn } from "@/lib/todos";
import { movingAverage, weeklyStats } from "@/lib/training";
import { formatNumber, formatWeight, fromKg, inputValue } from "@/lib/units";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Today" };

function greeting(hour: number) {
  return hour < 5 ? "Hey night owl" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ password?: string }> }) {
  const { password } = await searchParams;
  const { supabase, userId, profile, unit, today } = await getViewer();
  const now = nowIn(profile.timezone);

  const [weights, workouts, routines, todos, completions, reminders, events, devices] = await Promise.all([
    supabase.from("weight_entries").select("entry_date, weight_kg").gte("entry_date", addDays(today, -60)).order("entry_date"),
    supabase.from("workouts").select("id, name, workout_date").gte("workout_date", addDays(today, -7 * 52)).order("workout_date"),
    supabase.from("routines").select("id, name").order("name").limit(4),
    supabase.from("todos").select("id, title, schedule, due_date, weekdays, month_day, active"),
    // All completions (not just recent ones): a one-off to-do finished months ago must not show as overdue.
    supabase.from("todo_completions").select("todo_id, occurrence_date"),
    supabase.from("reminders").select("id, kind, label, time_of_day, weekdays, follow_up_minutes, created_at, todo_id, channel").eq("enabled", true),
    supabase.from("reminder_events").select("reminder_id, stage, delivered_via").eq("occurrence_date", today),
    supabase.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  // Weight
  const weightList = (weights.data ?? []).map((w) => ({ date: w.entry_date, value: Number(w.weight_kg) }));
  const todayWeight = weightList.find((w) => w.date === today);
  const avg = movingAverage(weightList, 7);
  const avgNow = avg.at(-1);
  const avgWeekAgo = [...avg].reverse().find((p) => p.date <= addDays(today, -7));
  const avgDelta = avgNow && avgWeekAgo ? avgNow.value - avgWeekAgo.value : null;

  // Training
  const workoutList = workouts.data ?? [];
  const stats = weeklyStats(workoutList.map((w) => w.workout_date), today, profile.weekly_workout_goal);
  const todaysWorkouts = workoutList.filter((w) => w.workout_date === today);

  // To-dos
  const doneOn = new Set((completions.data ?? []).map((c) => `${c.todo_id}|${c.occurrence_date}`));
  const todoList = todos.data ?? [];
  const dueToday = todoList.filter((t) => occursOn(t, today));
  const overdue = todoList.filter((t) => t.due_date && isOverdue(t, today, doneOn.has(`${t.id}|${t.due_date}`)));

  // Today's reminders and where each one stands.
  const todoById = new Map(todoList.map((t) => [t.id, t]));
  const eventsFor = (id: string) => (events.data ?? []).filter((e) => e.reminder_id === id);
  const todaysReminders = (reminders.data ?? [])
    .map((r) => ({ ...r, kind: r.kind as ReminderKind, todo: r.todo_id ? (todoById.get(r.todo_id) ?? null) : null }))
    .filter((r) => appliesOn(r, today))
    .map((r) => {
      const ev = eventsFor(r.id);
      const done =
        r.kind === "weight" ? !!todayWeight : r.kind === "workout" ? todaysWorkouts.length > 0 : doneOn.has(`${r.todo_id}|${today}`);
      const skipped = ev.some((e) => e.stage === "dismissed");
      const sent = ev.find((e) => e.stage === "follow_up") ?? ev.find((e) => e.stage === "initial");
      const status = done ? "done" : skipped ? "skipped" : sent ? "sent" : dueInstant(r, today, profile.timezone) <= now ? "due" : "upcoming";
      const title = r.label || (r.kind === "weight" ? "Weigh in" : r.kind === "workout" ? "Gym day" : (r.todo?.title ?? "To-do"));
      return { ...r, status, title };
    })
    .sort((a, b) => a.time_of_day.localeCompare(b.time_of_day));
  const needsPush = todaysReminders.some((r) => r.channel !== "email") && !devices.count;

  const name = profile.display_name?.split(" ")[0];

  return (
    <>
      <header className="px-4 pt-4 pb-3">
        <p className="text-[13px] font-semibold tracking-wide text-muted uppercase">{parseISODate(today).toFormat("cccc d LLLL")}</p>
        <h1 className="text-[28px] font-bold tracking-tight">
          {greeting(now.hour)}
          {name ? `, ${name}` : ""}
        </h1>
      </header>

      {password === "updated" && (
        <div className="mx-4 mb-4">
          <Notice tone="accent">Password updated.</Notice>
        </div>
      )}
      <InstallHint />
      <PendingWorkoutBanner userId={userId} />

      {/* Weight */}
      <Card>
        <CardHeader
          title="Weight"
          icon={<Scale className="size-4" aria-hidden />}
          action={
            <Link href="/weight" className="text-[14px] font-medium text-accent">
              Trend
            </Link>
          }
        />
        <div className="px-4 pb-4">
          {todayWeight ? (
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[34px] leading-tight font-semibold">{formatWeight(todayWeight.value, unit)}</p>
                <p className="text-[14px] text-muted">
                  {avgNow && `7-day avg ${formatWeight(avgNow.value, unit)}`}
                  {avgDelta != null && Math.abs(avgDelta) >= 0.05 && ` · ${avgDelta < 0 ? "↓" : "↑"} ${formatNumber(Math.abs(fromKg(avgDelta, unit)), 1)} vs last week`}
                </p>
              </div>
              <Sparkline values={avg.slice(-30).map((p) => p.value)} />
            </div>
          ) : (
            <WeightLogForm unit={unit} today={today} compact defaultValue={weightList.length ? inputValue(weightList.at(-1)!.value, unit) : undefined} />
          )}
        </div>
      </Card>

      {/* Training */}
      <Card>
        <CardHeader title="Training" icon={<Dumbbell className="size-4" aria-hidden />} />
        <div className="grid grid-cols-3 gap-2 px-4 pt-1 pb-3 text-center">
          <div className="rounded-xl bg-field py-2">
            <p className="text-[22px] font-semibold">
              {stats.thisWeek}
              <span className="text-[15px] text-muted">/{stats.goal}</span>
            </p>
            <p className="text-[12px] text-muted">this week</p>
          </div>
          <div className="rounded-xl bg-field py-2">
            <p className="flex items-center justify-center gap-1 text-[22px] font-semibold">
              {stats.streakWeeks > 0 && <Flame className="size-5 text-warn" aria-hidden />}
              {stats.streakWeeks}
            </p>
            <p className="text-[12px] text-muted">week streak</p>
          </div>
          <div className="rounded-xl bg-field py-2">
            <p className="text-[22px] font-semibold">{stats.daysSinceLast ?? "—"}</p>
            <p className="text-[12px] text-muted">{stats.daysSinceLast === 1 ? "day since last" : "days since last"}</p>
          </div>
        </div>
        <div className="space-y-2 px-4 pb-4">
          {todaysWorkouts.map((w) => (
            <Link key={w.id} href={`/workouts/${w.id}`} className="flex items-center gap-2 rounded-xl bg-accent-soft px-3 py-2.5 text-accent">
              <CheckCircle2 className="size-5" aria-hidden />
              <span className="flex-1 font-semibold">{w.name}</span>
              <span className="text-[13px]">done today</span>
            </Link>
          ))}
          <LinkButton href="/workouts/new" variant={todaysWorkouts.length ? "secondary" : "primary"} block>
            <Play className="size-4" aria-hidden /> {todaysWorkouts.length ? "Log another workout" : "Start workout"}
          </LinkButton>
          {routines.data && routines.data.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {routines.data.map((r) => (
                <Link key={r.id} href={`/workouts/new?routine=${r.id}`} className="rounded-full bg-field px-3 py-1.5 text-[14px] font-medium">
                  {r.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* To-dos */}
      <Card>
        <CardHeader
          title="To-dos"
          icon={<ListChecks className="size-4" aria-hidden />}
          action={
            <Link href="/todos" className="text-[14px] font-medium text-accent">
              All
            </Link>
          }
        />
        {dueToday.length + overdue.length === 0 ? (
          <p className="px-4 pb-4 text-[15px] text-muted">Nothing due today.</p>
        ) : (
          <div className="divide-y divide-border pb-1">
            {[...overdue.map((t) => ({ t, date: t.due_date!, overdue: true })), ...dueToday.map((t) => ({ t, date: today, overdue: false }))].map(({ t, date, overdue }) => (
              <div key={`${t.id}|${date}`} className="flex items-center gap-3 px-4 py-2.5">
                <TodoCheck todoId={t.id} date={date} done={doneOn.has(`${t.id}|${date}`)} title={t.title} />
                <span className={`min-w-0 flex-1 truncate text-[16px] ${doneOn.has(`${t.id}|${date}`) ? "text-muted line-through" : ""}`}>{t.title}</span>
                {overdue && <Badge tone="warn">Overdue</Badge>}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Reminders */}
      <Card>
        <CardHeader
          title="Reminders today"
          icon={<Bell className="size-4" aria-hidden />}
          action={
            <Link href="/reminders" className="text-[14px] font-medium text-accent">
              Manage
            </Link>
          }
        />
        {todaysReminders.length === 0 ? (
          <div className="px-4 pb-4 text-[15px] text-muted">
            None set for today.{" "}
            <Link href="/reminders" className="font-semibold text-accent">
              Add one
            </Link>{" "}
            to get nudged when you forget to weigh in or train.
          </div>
        ) : (
          <ul className="divide-y divide-border pb-1">
            {todaysReminders.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-16 shrink-0 text-[14px] text-muted tabular">{formatTimeOfDay(r.time_of_day)}</span>
                <span className={`min-w-0 flex-1 truncate text-[16px] ${r.status === "done" || r.status === "skipped" ? "text-muted" : ""}`}>{r.title}</span>
                {r.status === "done" && <Badge tone="accent">Done</Badge>}
                {r.status === "sent" && <Badge tone="warn">Sent</Badge>}
                {(r.status === "upcoming" || r.status === "due" || r.status === "sent" || r.status === "skipped") && (
                  <ReminderSkip id={r.id} date={today} skipped={r.status === "skipped"} />
                )}
              </li>
            ))}
          </ul>
        )}
        {needsPush && (
          <div className="px-4 pb-4">
            <Notice tone="warn">
              Notifications aren&apos;t on for any device yet, so these will be emailed.{" "}
              <Link href="/settings#notifications" className="font-semibold underline">
                Turn on
              </Link>
            </Notice>
          </div>
        )}
      </Card>
    </>
  );
}
