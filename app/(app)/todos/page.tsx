import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Plus } from "lucide-react";
import { TodoCheck } from "@/components/todo-check";
import { Badge, Card, CardHeader, EmptyState, LinkButton, List, ListRow, PageHeader } from "@/components/ui";
import { describeWeekdays, formatTimeOfDay, friendlyDate } from "@/lib/dates";
import { describeSchedule, isOverdue, occursOn } from "@/lib/todos";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "To-dos" };

export default async function TodosPage() {
  const { supabase, today } = await getViewer();
  const [{ data: todos }, { data: completions }] = await Promise.all([
    supabase.from("todos").select("*, reminders(time_of_day, enabled)").order("created_at"),
    supabase.from("todo_completions").select("todo_id, occurrence_date"),
  ]);

  const doneOn = new Set((completions ?? []).map((c) => `${c.todo_id}|${c.occurrence_date}`));
  const all = todos ?? [];
  const dueToday = all.filter((t) => occursOn(t, today));
  const overdue = all.filter((t) => t.due_date && isOverdue(t, today, doneOn.has(`${t.id}|${t.due_date}`)));
  const upcoming = all
    .filter((t) => t.active && t.schedule === "once" && t.due_date && t.due_date > today && !doneOn.has(`${t.id}|${t.due_date}`))
    .sort((a, b) => a.due_date!.localeCompare(b.due_date!));

  const reminderLabel = (t: (typeof all)[number]) => {
    const r = t.reminders[0];
    return r?.enabled ? (
      <Badge>
        <Bell className="size-3" aria-hidden /> {formatTimeOfDay(r.time_of_day)}
      </Badge>
    ) : null;
  };

  const row = (t: (typeof all)[number], date: string, label?: string) => (
    <div key={`${t.id}|${date}`} className="flex items-center gap-3 px-4 py-2.5">
      <TodoCheck todoId={t.id} date={date} done={doneOn.has(`${t.id}|${date}`)} title={t.title} />
      <Link href={`/todos/${t.id}`} className="min-w-0 flex-1">
        <span className={`block truncate text-[16px] ${doneOn.has(`${t.id}|${date}`) ? "text-muted line-through" : ""}`}>{t.title}</span>
        {label && <span className="block text-[13px] text-muted">{label}</span>}
      </Link>
      {reminderLabel(t)}
    </div>
  );

  return (
    <>
      <PageHeader
        title="To-dos"
        subtitle={dueToday.length ? `${dueToday.filter((t) => doneOn.has(`${t.id}|${today}`)).length} of ${dueToday.length} done today` : "Nothing due today"}
        action={
          <LinkButton href="/todos/new" size="sm">
            <Plus className="size-4" aria-hidden /> New
          </LinkButton>
        }
      />

      {overdue.length > 0 && (
        <Card>
          <CardHeader title="Overdue" />
          <div className="divide-y divide-border">{overdue.map((t) => row(t, t.due_date!, `Was due ${friendlyDate(t.due_date!, today)}`))}</div>
        </Card>
      )}

      <Card>
        <CardHeader title="Today" />
        {dueToday.length ? (
          <div className="divide-y divide-border">{dueToday.map((t) => row(t, today))}</div>
        ) : (
          <EmptyState title="All clear" body="Nothing is due today." />
        )}
      </Card>

      {upcoming.length > 0 && (
        <Card>
          <CardHeader title="Coming up" />
          <List>
            {upcoming.slice(0, 10).map((t) => (
              <ListRow key={t.id} href={`/todos/${t.id}`} title={t.title} subtitle={friendlyDate(t.due_date!, today)} right={reminderLabel(t)} />
            ))}
          </List>
        </Card>
      )}

      <Card>
        <CardHeader title="Recurring" />
        {all.filter((t) => t.schedule !== "once").length ? (
          <List>
            {all
              .filter((t) => t.schedule !== "once")
              .map((t) => (
                <ListRow
                  key={t.id}
                  href={`/todos/${t.id}`}
                  title={<span className={t.active ? "" : "text-muted"}>{t.title}</span>}
                  subtitle={`${describeSchedule(t, describeWeekdays)}${t.active ? "" : " · paused"}`}
                  right={reminderLabel(t)}
                />
              ))}
          </List>
        ) : (
          <EmptyState title="No recurring to-dos" body="Things like “Take creatine” every day or “Meal prep” on Sundays." />
        )}
      </Card>
    </>
  );
}
