"use client";

import { useState } from "react";
import { FOLLOW_UP_OPTIONS } from "@/lib/reminder-form";
import { Segmented } from "./form-controls";
import { Field, Input, Select } from "./ui";

export type ReminderFieldValues = { time_of_day: string; channel: "push" | "email" | "both"; follow_up_minutes: number };

/** Time, delivery channel and follow-up inputs, named for readReminderFields(). */
export function ReminderFields({ initial }: { initial?: Partial<ReminderFieldValues> }) {
  const [channel, setChannel] = useState<ReminderFieldValues["channel"]>(initial?.channel ?? "push");
  return (
    <div className="space-y-3">
      <Field label="Time">
        <Input type="time" name="time_of_day" defaultValue={initial?.time_of_day?.slice(0, 5) ?? "09:00"} required />
      </Field>
      <div>
        <span className="mb-1.5 block text-[14px] font-medium text-muted">Send by</span>
        <Segmented
          name="channel"
          value={channel}
          onChange={setChannel}
          options={[
            { value: "push", label: "Notification" },
            { value: "email", label: "Email" },
            { value: "both", label: "Both" },
          ]}
        />
        <p className="mt-1.5 text-[13px] text-muted">
          {channel === "push"
            ? "If no device has notifications on, it's emailed instead so it's never lost."
            : channel === "email"
              ? "Sent to your account email."
              : "Sent as a notification and an email."}
        </p>
      </div>
      <Field label="If it's still not done" hint="One extra nudge, unless you've done it or skipped today.">
        <Select name="follow_up_minutes" defaultValue={String(initial?.follow_up_minutes ?? 60)}>
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
