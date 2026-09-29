import type { Metadata } from "next";
import { ReminderForm } from "@/components/reminder-form";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "New reminder" };

export default async function NewReminderPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind: raw } = await searchParams;
  const kind = raw === "workout" || raw === "teeth" ? raw : "weight";
  return (
    <>
      <PageHeader back={{ href: "/reminders", label: "Reminders" }} title={{ weight: "Weigh-in reminder", workout: "Gym-day reminder", teeth: "Brushing reminder" }[kind]} />
      <ReminderForm
        initial={{
          kind,
          label: null,
          time_of_day: { weight: "09:00", workout: "19:00", teeth: "21:30" }[kind],
          weekdays: kind === "workout" ? [1, 3, 5] : [1, 2, 3, 4, 5, 6, 7],
          teeth_slot: kind === "teeth" ? "night" : null,
          channel: "push",
          follow_up_minutes: 60,
          enabled: true,
        }}
      />
    </>
  );
}
