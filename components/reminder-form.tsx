"use client";

import { useActionState, useState } from "react";
import { saveReminder } from "@/app/(app)/reminders/actions";
import type { ActionResult } from "@/lib/viewer";
import { FormError, Segmented, SubmitButton, Switch, WeekdayPicker } from "./form-controls";
import { ReminderFields, type ReminderFieldValues } from "./reminder-fields";
import { Field, Input } from "./ui";

export type ReminderFormValues = ReminderFieldValues & {
  id?: string;
  kind: "weight" | "workout" | "teeth";
  teeth_slot?: "morning" | "night" | null;
  label: string | null;
  weekdays: number[];
  enabled: boolean;
};

const COPY = {
  weight: { days: "Days to weigh in", hint: "Sent only if you haven't logged your weight that day.", placeholder: "Log your weight" },
  workout: { days: "Your gym days", hint: "Sent only if you haven't logged a workout that day.", placeholder: "It's a gym day" },
  teeth: { days: "Days", hint: "Sent only if that brush isn't ticked off yet.", placeholder: "Time to brush" },
};

export function ReminderForm({ initial }: { initial: ReminderFormValues }) {
  const [state, action] = useActionState<ActionResult, FormData>(saveReminder, null);
  const [weekdays, setWeekdays] = useState(initial.weekdays);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [slot, setSlot] = useState<"morning" | "night">(initial.teeth_slot ?? "night");
  const copy = COPY[initial.kind];

  return (
    <form action={action} className="space-y-2.5 px-3">
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : <input type="hidden" name="kind" value={initial.kind} />}
      <div className="space-y-4 rounded-tile bg-reminders p-5 text-reminders-ink">
        {initial.kind === "teeth" && (
          <div>
            <span className="mb-2 block text-[15px] font-bold">Which brush?</span>
            <Segmented
              tone="reminders"
              label="Which brush?"
              name="teeth_slot"
              value={slot}
              onChange={setSlot}
              options={[
                { value: "morning", label: "Morning" },
                { value: "night", label: "Night" },
              ]}
            />
          </div>
        )}
        <div>
          <span className="mb-2 block text-[15px] font-bold">{copy.days}</span>
          <WeekdayPicker tone="reminders" name="weekdays" value={weekdays} onChange={setWeekdays} />
        </div>
        <ReminderFields initial={initial} />
        <p className="border-t border-reminders-ink/15 pt-4 text-[16px] font-bold">{copy.hint}</p>
      </div>
      <div className="space-y-5 rounded-tile bg-card p-5">
        <Field label="Custom title" hint="Optional. Shown as the notification title.">
          <Input name="label" defaultValue={initial.label ?? ""} placeholder={copy.placeholder} maxLength={80} />
        </Field>
        {initial.id && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-[18px] font-bold">On</span>
            <Switch name="enabled" label="Reminder on" checked={enabled} onChange={setEnabled} />
          </div>
        )}
      </div>
      <FormError message={state && !state.ok ? state.error : null} />
      <SubmitButton size="xl">{initial.id ? "Save changes" : "Create reminder"}</SubmitButton>
    </form>
  );
}
