import type { Metadata } from "next";
import { ReminderForm } from "@/components/reminder-form";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "New reminder" };

export default async function NewReminderPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind: raw } = await searchParams;
  const kind = raw === "workout" ? "workout" : "weight";
  return (
    <>
      <PageHeader back={{ href: "/reminders", label: "Reminders" }} title={kind === "weight" ? "Weigh-in reminder" : "Gym-day reminder"} />
      <ReminderForm
        initial={{
          kind,
          label: null,
          time_of_day: kind === "weight" ? "09:00" : "19:00",
          weekdays: kind === "weight" ? [1, 2, 3, 4, 5, 6, 7] : [1, 3, 5],
          channel: "push",
          follow_up_minutes: 60,
          enabled: true,
        }}
      />
    </>
  );
}
