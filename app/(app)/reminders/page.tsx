import type { Metadata } from "next";
import Link from "next/link";
import { Dumbbell, ListChecks, Plus, Scale, Smile } from "lucide-react";
import { ReminderToggle } from "@/components/reminder-toggle";
import { Card, CardHeader, EmptyState, LinkButton, Notice, PageHeader } from "@/components/ui";
import { describeWeekdays, formatTimeOfDay } from "@/lib/dates";
import { describeSchedule } from "@/lib/todos";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Reminders" };

const ICONS = { weight: Scale, workout: Dumbbell, todo: ListChecks, teeth: Smile };
const TITLES = { weight: "Weigh-in", workout: "Gym day", todo: "To-do", teeth: "Brush teeth" };
const CHANNEL = { push: "Notification", email: "Email", both: "Notification + email" };

export default async function RemindersPage() {
  const { supabase, userId } = await getViewer();
  const [{ data: reminders }, { count: devices }] = await Promise.all([
    supabase.from("reminders").select("*, todo:todos(id, title, schedule, due_date, weekdays, month_day, active)").order("time_of_day"),
    supabase.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  const list = reminders ?? [];
  const needsPush = list.some((r) => r.enabled && r.channel !== "email") && !devices;

  return (
    <>
      <PageHeader back={{ href: "/more", label: "More" }} title="Reminders" subtitle="Only sent if you haven't done the thing yet" />

      {needsPush && (
        <div className="mx-4 mb-4">
          <Notice tone="warn">
            No device has notifications turned on, so notification reminders are emailed instead.{" "}
            <Link href="/settings#notifications" className="font-semibold underline">
              Turn on notifications
            </Link>
          </Notice>
        </div>
      )}

      <div className="mx-4 mb-4 grid grid-cols-3 gap-2">
        <LinkButton href="/reminders/new?kind=weight" variant="secondary">
          <Plus className="size-4" aria-hidden /> Weigh-in
        </LinkButton>
        <LinkButton href="/reminders/new?kind=workout" variant="secondary">
          <Plus className="size-4" aria-hidden /> Gym day
        </LinkButton>
        <LinkButton href="/reminders/new?kind=teeth" variant="secondary">
          <Plus className="size-4" aria-hidden /> Brushing
        </LinkButton>
      </div>

      <Card>
        <CardHeader title="Your reminders" />
        {list.length === 0 ? (
          <EmptyState
            title="No reminders yet"
            body="Add a weigh-in or gym-day reminder above. To-do reminders are set on the to-do itself."
          />
        ) : (
          <ul className="divide-y divide-border">
            {list.map((r) => {
              const kind = r.kind as keyof typeof ICONS;
              const Icon = ICONS[kind];
              const href = kind === "todo" && r.todo ? `/todos/${r.todo.id}` : `/reminders/${r.id}`;
              const days = kind === "todo" && r.todo ? describeSchedule(r.todo, describeWeekdays) : describeWeekdays(r.weekdays);
              return (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <Icon className="size-5 shrink-0 text-accent" aria-hidden />
                  <Link href={href} className="min-w-0 flex-1">
                    <span className="block text-[16px] font-medium">
                      {formatTimeOfDay(r.time_of_day)} · {r.label || (kind === "todo" ? r.todo?.title : kind === "teeth" ? `${TITLES.teeth} (${r.teeth_slot})` : TITLES[kind])}
                    </span>
                    <span className="block text-[13px] text-muted">
                      {days} · {CHANNEL[r.channel as keyof typeof CHANNEL]}
                      {r.follow_up_minutes ? ` · follow-up after ${r.follow_up_minutes} min` : ""}
                    </span>
                  </Link>
                  <ReminderToggle id={r.id} enabled={r.enabled} label={`${TITLES[kind]} reminder at ${formatTimeOfDay(r.time_of_day)}`} />
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
