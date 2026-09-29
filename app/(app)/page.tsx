import type { Metadata } from "next";
import Link from "next/link";
import { Check, Play } from "lucide-react";
import { ChallengeRoute, ChallengeTrack } from "@/components/challenge-track";
import { InstallHint } from "@/components/install-hint";
import { PendingWorkoutBanner } from "@/components/pending-workout-banner";
import { ReminderSkip } from "@/components/reminder-skip";
import { Sparkline } from "@/components/sparkline";
import { TeethTracker } from "@/components/teeth-tracker";
import { TodoCheck } from "@/components/todo-check";
import { Badge, LinkButton, Notice, Rows, Tile, TileHeader, TileLink, cx } from "@/components/ui";
import { WeightLogForm } from "@/components/weight-log-form";
import { addDays, formatTimeOfDay, nowIn, parseISODate } from "@/lib/dates";
import { loadChallenges } from "@/lib/challenge-data";
import { formatJourney } from "@/lib/challenges";
import { brushingStats, type BrushLog } from "@/lib/habits";
import { appliesOn, dueInstant, type ReminderKind } from "@/lib/reminders/engine";
import { isOverdue, occursOn } from "@/lib/todos";
import { movingAverage, weeklyStats } from "@/lib/training";
import { formatNumber, fromKg, inputValue } from "@/lib/units";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Today" };

function greeting(hour: number) {
  return hour < 5 ? "Hey night owl" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

/** "642 km" → ["642", "km"] so the number can be the hero. */
function splitUnit(text: string): [string, string] {
  const i = text.lastIndexOf(" ");
  return [text.slice(0, i), text.slice(i + 1)];
}

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ password?: string }> }) {
  const { password } = await searchParams;
  const viewer = await getViewer();
  const { supabase, userId, profile, unit, today } = viewer;
  const now = nowIn(profile.timezone);

  const [weights, workouts, routines, todos, completions, reminders, events, devices, brushing, challenges] = await Promise.all([
    supabase.from("weight_entries").select("entry_date, weight_kg").gte("entry_date", addDays(today, -60)).order("entry_date"),
    supabase.from("workouts").select("id, name, workout_date").gte("workout_date", addDays(today, -7 * 52)).order("workout_date"),
    supabase.from("routines").select("id, name").order("name").limit(4),
    supabase.from("todos").select("id, title, schedule, due_date, weekdays, month_day, active"),
    // All completions (not just recent ones): a one-off to-do finished months ago must not show as overdue.
    supabase.from("todo_completions").select("todo_id, occurrence_date"),
    supabase.from("reminders").select("id, kind, label, time_of_day, weekdays, follow_up_minutes, created_at, todo_id, channel, teeth_slot").eq("enabled", true),
    supabase.from("reminder_events").select("reminder_id, stage, delivered_via").eq("occurrence_date", today),
    supabase.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("brushing_logs").select("log_date, slot, flossed, mouthwash").gte("log_date", addDays(today, -400)),
    loadChallenges(viewer),
  ]);

  // Teeth
  const brushLogs = (brushing.data ?? []) as BrushLog[];
  const brush = brushingStats(brushLogs, today);
  const activeChallenges = challenges.joined.filter((j) => !j.progress.complete);

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
  const todoRows = [...overdue.map((t) => ({ t, date: t.due_date!, overdue: true })), ...dueToday.map((t) => ({ t, date: today, overdue: false }))];

  // Today's reminders and where each one stands.
  const todoById = new Map(todoList.map((t) => [t.id, t]));
  const eventsFor = (id: string) => (events.data ?? []).filter((e) => e.reminder_id === id);
  const todaysReminders = (reminders.data ?? [])
    .map((r) => ({ ...r, kind: r.kind as ReminderKind, todo: r.todo_id ? (todoById.get(r.todo_id) ?? null) : null }))
    .filter((r) => appliesOn(r, today))
    .map((r) => {
      const ev = eventsFor(r.id);
      const done =
        r.kind === "weight"
          ? !!todayWeight
          : r.kind === "workout"
            ? todaysWorkouts.length > 0
            : r.kind === "teeth"
              ? Boolean(r.teeth_slot === "morning" ? brush.today.morning : brush.today.night)
              : doneOn.has(`${r.todo_id}|${today}`);
      const skipped = ev.some((e) => e.stage === "dismissed");
      const sent = ev.find((e) => e.stage === "follow_up") ?? ev.find((e) => e.stage === "initial");
      const status = done ? "done" : skipped ? "skipped" : sent ? "sent" : dueInstant(r, today, profile.timezone) <= now ? "due" : "upcoming";
      const title =
        r.label ||
        (r.kind === "weight" ? "Weigh in" : r.kind === "workout" ? "Gym day" : r.kind === "teeth" ? `Brush teeth (${r.teeth_slot})` : (r.todo?.title ?? "To-do"));
      return { ...r, status, title };
    })
    .sort((a, b) => a.time_of_day.localeCompare(b.time_of_day));
  const needsPush = todaysReminders.some((r) => r.channel !== "email") && !devices.count;

  // "N things left today": open to-dos, unbrushed slots (once you track brushing), and a weigh-in or
  // workout that a reminder says is due today.
  const tracksTeeth = brushLogs.length > 0 || todaysReminders.some((r) => r.kind === "teeth");
  const thingsLeft =
    todoRows.filter(({ t, date }) => !doneOn.has(`${t.id}|${date}`)).length +
    (tracksTeeth ? Number(!brush.today.morning) + Number(!brush.today.night) : 0) +
    todaysReminders.filter((r) => (r.kind === "weight" || r.kind === "workout") && r.status !== "done" && r.status !== "skipped").length;

  const name = profile.display_name?.split(" ")[0];
  const [featured, ...others] = activeChallenges;

  return (
    <>
      <header className="px-5 pt-5 pb-5">
        <p className="text-[16px] font-medium text-muted">{parseISODate(today).toFormat("cccc d LLLL")}</p>
        <h1 className="display mt-2 text-[40px]">
          {greeting(now.hour)}
          {name ? `, ${name}.` : "."}
        </h1>
        <p className="display text-[40px] text-faint">
          {thingsLeft === 0 ? "All done for today." : `${thingsLeft} thing${thingsLeft === 1 ? "" : "s"} left today.`}
        </p>
      </header>

      {password === "updated" && <Notice tone="success" className="mx-3 mb-2.5">Password updated.</Notice>}
      <InstallHint />
      <PendingWorkoutBanner userId={userId} />

      <div className="mx-3 mb-2.5 grid grid-cols-2 gap-2.5">
        {/* Weight */}
        {todayWeight ? (
          <Link href="/weight" className="flex flex-col rounded-tile bg-weight p-5 text-weight-ink active:opacity-90" aria-label="Weight trend">
            <span className="text-[15px] font-semibold">Weight · {unit}</span>
            <span className="tile-number mt-5 text-[56px]">{formatNumber(fromKg(todayWeight.value, unit), 1)}</span>
            <span className="mt-2 text-[15px] leading-snug font-semibold">
              {avgNow && <>7-day avg {formatNumber(fromKg(avgNow.value, unit), 1)}</>}
              {avgDelta != null && Math.abs(avgDelta) >= 0.05 && (
                <span className="block">
                  {avgDelta < 0 ? "↓" : "↑"} {formatNumber(Math.abs(fromKg(avgDelta, unit)), 1)} vs last week
                </span>
              )}
            </span>
            <Sparkline values={avg.slice(-30).map((p) => p.value)} className="mt-auto block h-auto w-full pt-4" />
          </Link>
        ) : (
          <Tile tone="weight" flush>
            <Link href="/weight" className="block text-[15px] font-semibold">
              Weight · {unit}
            </Link>
            <p className="mt-1 mb-4 text-[14px] font-medium text-white/75">
              {weightList.length ? `Last ${formatNumber(fromKg(weightList.at(-1)!.value, unit), 1)}. ` : ""}Log today&apos;s:
            </p>
            <WeightLogForm unit={unit} today={today} defaultValue={weightList.length ? inputValue(weightList.at(-1)!.value, unit) : undefined} />
          </Tile>
        )}

        {/* Teeth */}
        <Tile tone="teeth" flush className="flex flex-col">
          <div className="mb-auto flex items-center justify-between gap-2 pb-5">
            <Link href="/teeth" className="text-[15px] font-semibold">
              Teeth
            </Link>
            {brush.streak > 0 && <Badge tone="teeth">{brush.streak} day{brush.streak === 1 ? "" : "s"}</Badge>}
          </div>
          <TeethTracker date={today} day={brush.today} compact />
        </Tile>
      </div>

      {/* Training */}
      <Tile tone="training">
        <TileHeader title="Training" tight />
        <p className="display text-[34px]">
          {stats.thisWeek} of {stats.goal} this week
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex shrink-0 gap-1.5" aria-hidden>
            {Array.from({ length: Math.max(stats.goal, stats.thisWeek) }, (_, i) => (
              <span key={i} className={cx("rounded-full border-[2.5px] border-ink", stats.goal > 5 ? "size-5" : "size-7", i < stats.thisWeek && "bg-ink")} />
            ))}
          </div>
          <p className="text-[15px] leading-snug font-semibold">
            {[
              stats.streakWeeks > 0 ? `${stats.streakWeeks}-week streak` : null,
              stats.daysSinceLast == null ? null : stats.daysSinceLast === 0 ? "trained today" : `${stats.daysSinceLast} day${stats.daysSinceLast === 1 ? "" : "s"} since last`,
            ]
              .filter(Boolean)
              .join(" · ") || "Your first workout starts the streak"}
          </p>
        </div>
        {todaysWorkouts.length > 0 && (
          <div className="mt-4 space-y-2">
            {todaysWorkouts.map((w) => (
              <Link key={w.id} href={`/workouts/${w.id}`} className="flex h-12 items-center gap-2 rounded-full bg-white/30 px-5 font-bold active:opacity-80">
                <Check className="size-5" strokeWidth={3} aria-hidden />
                <span className="min-w-0 flex-1 truncate">{w.name}</span>
                <span className="text-[14px] font-semibold">done today</span>
              </Link>
            ))}
          </div>
        )}
        <LinkButton href="/workouts/new" size="lg" block className="mt-4">
          <Play className="size-5 fill-current" aria-hidden /> {todaysWorkouts.length ? "Log another workout" : "Start workout"}
        </LinkButton>
        {routines.data && routines.data.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {routines.data.map((r) => (
              <Link key={r.id} href={`/workouts/new?routine=${r.id}`} className="flex h-12 items-center rounded-full border-2 border-ink px-5 text-[16px] font-bold active:bg-ink/10">
                {r.name}
              </Link>
            ))}
          </div>
        )}
      </Tile>

      {/* Challenges */}
      <Tile tone="challenges">
        <TileHeader title={<span className="text-white">Challenges</span>} action={<TileLink href="/challenges">{activeChallenges.length ? "All" : "Browse"}</TileLink>} />
        {featured ? (
          <>
            <Link href={`/challenges/${featured.challenge.slug}`} className="block active:opacity-80">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[20px] font-extrabold text-white">{featured.challenge.name}</span>
                <span className="font-mono text-[14px]">{Math.floor(featured.progress.fraction * 100)}%</span>
              </div>
              {(() => {
                const [km, u] = splitUnit(formatJourney(featured.progress.km, unit));
                return (
                  <p className="mt-1 flex items-baseline gap-1.5">
                    <span className="tile-number text-[56px]">{km}</span>
                    <span className="text-[22px] font-bold">
                      / {splitUnit(formatJourney(featured.challenge.km, unit))[0]} {u}
                    </span>
                  </p>
                );
              })()}
              <div className="my-3">
                <ChallengeRoute fraction={featured.progress.fraction} label={`${featured.challenge.name} route progress`} />
              </div>
              <p className="text-[16px] font-bold text-white">
                {featured.progress.next!.id === "finish" ? "Finish" : featured.progress.next!.name} in {formatJourney(featured.progress.toNextKm, unit)}
              </p>
            </Link>
            {others.slice(0, 1).map((j) => (
              <Link key={j.challenge.slug} href={`/challenges/${j.challenge.slug}`} className="mt-4 block border-t border-challenges-ink/20 pt-4 active:opacity-80">
                <div className="mb-2.5 flex items-baseline justify-between gap-2">
                  <span className="truncate text-[17px] font-bold text-white">{j.challenge.name}</span>
                  <span className="font-mono text-[14px]">{Math.floor(j.progress.fraction * 100)}%</span>
                </div>
                <ChallengeTrack challenge={j.challenge} progress={j.progress} onDark dots={false} />
                <p className="mt-2.5 text-[14px] font-medium">
                  {formatJourney(j.progress.km, unit).replace(/ \w+$/, "")} of {formatJourney(j.challenge.km, unit)} ·{" "}
                  {j.progress.next!.id === "finish" ? "finish" : j.progress.next!.name} in {formatJourney(j.progress.toNextKm, unit)}
                </p>
              </Link>
            ))}
          </>
        ) : (
          <p className="text-[16px] font-medium text-white">
            Walk the length of New Zealand or take the Ring to Mordor, one logged km at a time.{" "}
            <Link href="/challenges" className="font-bold text-challenges-ink underline underline-offset-4">
              Start a challenge
            </Link>
          </p>
        )}
      </Tile>

      {/* To-dos */}
      <Tile tone="todos">
        <TileHeader title="To-dos" action={<TileLink href="/todos">All</TileLink>} />
        {todoRows.length === 0 ? (
          <p className="py-1 text-[16px] font-medium">Nothing due today.</p>
        ) : (
          <Rows>
            {todoRows.map(({ t, date, overdue }) => {
              const done = doneOn.has(`${t.id}|${date}`);
              return (
                <div key={`${t.id}|${date}`} className="flex min-h-15 items-center gap-3.5 py-2">
                  <TodoCheck todoId={t.id} date={date} done={done} title={t.title} />
                  <span className={cx("min-w-0 flex-1 truncate text-[18px] font-medium", done && "line-through opacity-60")}>{t.title}</span>
                  {overdue && <Badge tone="overdue">Overdue</Badge>}
                </div>
              );
            })}
          </Rows>
        )}
      </Tile>

      {/* Reminders */}
      <Tile tone="reminders">
        <TileHeader title="Reminders today" action={<TileLink href="/reminders">Manage</TileLink>} />
        {todaysReminders.length === 0 ? (
          <p className="py-1 text-[16px] font-medium">
            None set for today.{" "}
            <Link href="/reminders" className="font-bold underline underline-offset-4">
              Add one
            </Link>{" "}
            to get nudged when you forget to weigh in or train.
          </p>
        ) : (
          <Rows>
            {todaysReminders.map((r) => (
              <div key={r.id} className="flex min-h-15 items-center gap-2.5 py-2">
                <span className="w-16 shrink-0 font-mono text-[14px] whitespace-nowrap">{formatTimeOfDay(r.time_of_day)}</span>
                <span className={cx("min-w-0 flex-1 truncate text-[16px] font-medium", (r.status === "done" || r.status === "skipped") && "opacity-60")}>{r.title}</span>
                {r.status === "done" && <Badge tone="done">Done</Badge>}
                {r.status === "sent" && <Badge tone="white">Sent</Badge>}
                {(r.status === "upcoming" || r.status === "due" || r.status === "sent" || r.status === "skipped") && (
                  <ReminderSkip id={r.id} date={today} skipped={r.status === "skipped"} />
                )}
              </div>
            ))}
          </Rows>
        )}
        {needsPush && (
          <p className="mt-3 rounded-[18px] bg-white/55 px-4 py-3 text-[15px] font-semibold">
            Notifications aren&apos;t on for any device yet, so these will be emailed.{" "}
            <Link href="/settings#notifications" className="font-bold underline underline-offset-4">
              Turn on
            </Link>
          </p>
        )}
      </Tile>
    </>
  );
}
