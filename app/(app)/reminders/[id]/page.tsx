import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ConfirmButton } from "@/components/confirm-button";
import { ReminderForm } from "@/components/reminder-form";
import { PageHeader } from "@/components/ui";
import { getViewer } from "@/lib/viewer";
import { deleteReminder } from "../actions";

export const metadata: Metadata = { title: "Reminder" };

export default async function ReminderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await getViewer();
  const { data: r } = await supabase.from("reminders").select("*").eq("id", id).maybeSingle();
  if (!r) notFound();
  if (r.kind === "todo" && r.todo_id) redirect(`/todos/${r.todo_id}`);
  const kind = r.kind as "weight" | "workout" | "teeth";

  return (
    <>
      <PageHeader back={{ href: "/reminders", label: "Reminders" }} title={{ weight: "Weigh-in reminder", workout: "Gym-day reminder", teeth: "Brushing reminder" }[kind]} />
      <ReminderForm
        initial={{
          id: r.id,
          kind,
          label: r.label,
          teeth_slot: r.teeth_slot as "morning" | "night" | null,
          time_of_day: r.time_of_day,
          weekdays: r.weekdays,
          channel: r.channel as "push" | "email" | "both",
          follow_up_minutes: r.follow_up_minutes ?? 0,
          enabled: r.enabled,
        }}
      />
      <form action={deleteReminder} className="mx-4 mt-6">
        <input type="hidden" name="id" value={r.id} />
        <ConfirmButton message="Delete this reminder?" block>
          Delete reminder
        </ConfirmButton>
      </form>
    </>
  );
}
