import type { Metadata } from "next";
import Link from "next/link";
import { ListChecks, Plus, Smile } from "lucide-react";
import { BarbellIcon, ScaleIcon } from "@/components/icons";
import { ReminderToggle } from "@/components/reminder-toggle";
import { EmptyState, IconSquare, Notice, PageHeader, Rows, Tile, TileHeader, cx, type Tone } from "@/components/ui";
import { describeWeekdays, formatTimeOfDay } from "@/lib/dates";
import { describeSchedule } from "@/lib/todos";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Reminders" };

const ICONS = { weight: ScaleIcon, workout: BarbellIcon, todo: ListChecks, teeth: Smile };
const TONE: Record<keyof typeof ICONS, Tone> = { weight: "weight", workout: "training", todo: "todos", teeth: "teeth" };
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
        <Notice tone="warn" className="mx-3 mb-2.5">
          No device has notifications turned on, so notification reminders are emailed instead.{" "}
          <Link href="/settings#notifications" className="font-bold underline underline-offset-4">
            Turn on notifications
          </Link>
        </Notice>
      )}

      <div className="mx-3 mb-2.5 grid grid-cols-3 gap-2.5">
        {(
          [
            { kind: "weight", label: "Weigh-in", tone: "bg-weight text-weight-ink" },
            { kind: "workout", label: "Gym day", tone: "bg-training text-training-ink" },
            { kind: "teeth", label: "Brushing", tone: "bg-teeth text-teeth-ink" },
          ] as const
        ).map((t) => (
          <Link key={t.kind} href={`/reminders/new?kind=${t.kind}`} className={cx("flex min-h-[88px] flex-col justify-between rounded-[24px] p-4 active:opacity-85", t.tone)}>
            <Plus className="size-6" strokeWidth={2.5} aria-hidden />
            <span className="text-[17px] leading-tight font-extrabold">{t.label}</span>
          </Link>
        ))}
      </div>

      <Tile tone="reminders">
        <TileHeader title="Your reminders" />
        {list.length === 0 ? (
          <EmptyState title="No reminders yet" body="Add a weigh-in or gym-day reminder above. To-do reminders are set on the to-do itself." />
        ) : (
          <Rows>
            {list.map((r) => {
              const kind = r.kind as keyof typeof ICONS;
              const Icon = ICONS[kind];
              const href = kind === "todo" && r.todo ? `/todos/${r.todo.id}` : `/reminders/${r.id}`;
              const days = kind === "todo" && r.todo ? describeSchedule(r.todo, describeWeekdays) : describeWeekdays(r.weekdays);
              return (
                <div key={r.id} className="flex items-center gap-3.5 py-3.5">
                  <IconSquare tone={TONE[kind]}>
                    <Icon />
                  </IconSquare>
                  <Link href={href} className={cx("min-w-0 flex-1 active:opacity-70", !r.enabled && "opacity-60")}>
                    <span className="block text-[18px] leading-snug font-extrabold">
                      {formatTimeOfDay(r.time_of_day)} · {r.label || (kind === "todo" ? r.todo?.title : kind === "teeth" ? `${TITLES.teeth} (${r.teeth_slot})` : TITLES[kind])}
                    </span>
                    <span className="block text-[15px] leading-snug font-medium opacity-75">
                      {days} · {CHANNEL[r.channel as keyof typeof CHANNEL]}
                      {r.follow_up_minutes ? ` · follow-up after ${r.follow_up_minutes} min` : ""}
                    </span>
                  </Link>
                  <ReminderToggle id={r.id} enabled={r.enabled} label={`${TITLES[kind]} reminder at ${formatTimeOfDay(r.time_of_day)}`} />
                </div>
              );
            })}
          </Rows>
        )}
      </Tile>
    </>
  );
}
