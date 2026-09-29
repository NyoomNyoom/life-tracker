import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Plus } from "lucide-react";
import { TodoCheck } from "@/components/todo-check";
import { Badge, EmptyState, LinkButton, ListRow, PageHeader, Rows, Tile, TileHeader, cx } from "@/components/ui";
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
  const recurring = all.filter((t) => t.schedule !== "once");

  /** The reminder time as a chip: lavender on white cards, ink on the butter tile. */
  const reminderChip = (t: (typeof all)[number], onTodos = false) => {
    const r = t.reminders[0];
    return r?.enabled ? (
      <Badge tone={onTodos ? "timeDark" : "time"}>
        <Bell className="size-3.5" aria-hidden /> {formatTimeOfDay(r.time_of_day)}
      </Badge>
    ) : null;
  };

  const row = (t: (typeof all)[number], date: string, opts: { label?: string; onDark?: boolean } = {}) => {
    const done = doneOn.has(`${t.id}|${date}`);
    return (
      <div key={`${t.id}|${date}`} className="flex min-h-15 items-center gap-3.5 py-2.5">
        <TodoCheck todoId={t.id} date={date} done={done} title={t.title} onDark={opts.onDark} />
        <Link href={`/todos/${t.id}`} className="min-w-0 flex-1 active:opacity-70">
          <span className={cx("block truncate text-[19px] font-bold", done && "line-through opacity-60")}>{t.title}</span>
          {opts.label && <span className="block text-[15px] font-medium opacity-75">{opts.label}</span>}
        </Link>
        {reminderChip(t, !opts.onDark)}
      </div>
    );
  };

  return (
    <>
      <PageHeader
        title="To-dos"
        subtitle={dueToday.length ? `${dueToday.filter((t) => doneOn.has(`${t.id}|${today}`)).length} of ${dueToday.length} done today` : "Nothing due today"}
        action={
          <LinkButton href="/todos/new" size="md">
            <Plus className="size-5" aria-hidden /> New
          </LinkButton>
        }
      />

      {overdue.length > 0 && (
        <Tile tone="ink">
          <TileHeader title={<span className="text-todos">Overdue</span>} />
          <Rows>{overdue.map((t) => row(t, t.due_date!, { label: `Was due ${friendlyDate(t.due_date!, today)}`, onDark: true }))}</Rows>
        </Tile>
      )}

      <Tile tone="todos">
        <TileHeader title="Today" />
        {dueToday.length ? <Rows>{dueToday.map((t) => row(t, today))}</Rows> : <EmptyState title="All clear" body="Nothing is due today." />}
      </Tile>

      {upcoming.length > 0 && (
        <Tile>
          <TileHeader title="Coming up" />
          <Rows>
            {upcoming.slice(0, 10).map((t) => (
              <ListRow key={t.id} href={`/todos/${t.id}`} title={t.title} subtitle={friendlyDate(t.due_date!, today)} right={reminderChip(t)} />
            ))}
          </Rows>
        </Tile>
      )}

      <Tile>
        <TileHeader title="Recurring" />
        {recurring.length ? (
          <Rows>
            {recurring.map((t) => (
              <ListRow
                key={t.id}
                href={`/todos/${t.id}`}
                title={<span className={t.active ? "" : "text-muted"}>{t.title}</span>}
                subtitle={`${describeSchedule(t, describeWeekdays)}${t.active ? "" : " · paused"}`}
                right={t.active ? reminderChip(t) : null}
              />
            ))}
          </Rows>
        ) : (
          <EmptyState title="No recurring to-dos" body="Things like “Take creatine” every day or “Meal prep” on Sundays." />
        )}
      </Tile>
    </>
  );
}
