import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/confirm-button";
import { TodoForm } from "@/components/todo-form";
import { PageHeader } from "@/components/ui";
import { getViewer } from "@/lib/viewer";
import { deleteTodo } from "../actions";

export const metadata: Metadata = { title: "Edit to-do" };

export default async function EditTodoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, today } = await getViewer();
  const { data: todo } = await supabase
    .from("todos")
    .select("*, reminders(time_of_day, channel, follow_up_minutes)")
    .eq("id", id)
    .maybeSingle();
  if (!todo) notFound();
  const r = todo.reminders[0];

  return (
    <>
      <PageHeader back={{ href: "/todos", label: "To-dos" }} title="Edit to-do" />
      <TodoForm
        today={today}
        initial={{
          id: todo.id,
          title: todo.title,
          notes: todo.notes,
          schedule: todo.schedule as "once" | "daily" | "weekly" | "monthly",
          due_date: todo.due_date,
          weekdays: todo.weekdays,
          month_day: todo.month_day,
          active: todo.active,
          reminder: r
            ? { time_of_day: r.time_of_day, channel: r.channel as "push" | "email" | "both", follow_up_minutes: r.follow_up_minutes ?? 0 }
            : null,
        }}
      />
      <form action={deleteTodo} className="mx-3 mt-2.5">
        <input type="hidden" name="id" value={todo.id} />
        <ConfirmButton message={`Delete “${todo.title}” and its reminder?`} size="xl" block>
          Delete to-do
        </ConfirmButton>
      </form>
    </>
  );
}
