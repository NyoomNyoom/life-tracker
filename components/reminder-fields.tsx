"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { FOLLOW_UP_OPTIONS } from "@/lib/reminder-form";
import { Segmented } from "./form-controls";
import { Field, Input, Select } from "./ui";

export type ReminderFieldValues = { time_of_day: string; channel: "push" | "email" | "both"; follow_up_minutes: number };

/** Time, delivery channel and follow-up inputs, named for readReminderFields(). Drawn for the lavender reminders tile. */
export function ReminderFields({ initial }: { initial?: Partial<ReminderFieldValues> }) {
  const [channel, setChannel] = useState<ReminderFieldValues["channel"]>(initial?.channel ?? "push");
  return (
    <div className="space-y-4">
      <Field label="Time">
        <span className="relative block">
          <Input onTile size="lg" strong type="time" name="time_of_day" defaultValue={initial?.time_of_day?.slice(0, 5) ?? "09:00"} required className="pr-12" />
          <Clock className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-ink" aria-hidden />
        </span>
      </Field>
      <div>
        <span className="mb-2 block text-[15px] font-bold">Send by</span>
        <Segmented
          tone="reminders"
          label="Send by"
          name="channel"
          value={channel}
          onChange={setChannel}
          options={[
            { value: "push", label: "Notification" },
            { value: "email", label: "Email" },
            { value: "both", label: "Both" },
          ]}
        />
        <p className="mt-2 text-[15px] font-medium">
          {channel === "push"
            ? "If no device has notifications on, it's emailed instead so it's never lost."
            : channel === "email"
              ? "Sent to your account email."
              : "Sent as a notification and an email."}
        </p>
      </div>
      <Field label="If it's still not done" hint="One extra nudge, unless you've done it or skipped today.">
        <Select onTile size="lg" strong name="follow_up_minutes" defaultValue={String(initial?.follow_up_minutes ?? 60)}>
          {FOLLOW_UP_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
