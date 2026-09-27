"use client";

import { useActionState, useState } from "react";
import { saveReminder } from "@/app/(app)/reminders/actions";
import type { ActionResult } from "@/lib/viewer";
import { FormError, SubmitButton, WeekdayPicker } from "./form-controls";
import { ReminderFields, type ReminderFieldValues } from "./reminder-fields";
import { Field, Input } from "./ui";

export type ReminderFormValues = ReminderFieldValues & {
  id?: string;
  kind: "weight" | "workout";
  label: string | null;
  weekdays: number[];
  enabled: boolean;
};

const COPY = {
  weight: { days: "Days to weigh in", hint: "Sent only if you haven't logged your weight that day.", placeholder: "Log your weight" },
  workout: { days: "Your gym days", hint: "Sent only if you haven't logged a workout that day.", placeholder: "It's a gym day" },
};

export function ReminderForm({ initial }: { initial: ReminderFormValues }) {
  const [state, action] = useActionState<ActionResult, FormData>(saveReminder, null);
  const [weekdays, setWeekdays] = useState(initial.weekdays);
  const [enabled, setEnabled] = useState(initial.enabled);
  const copy = COPY[initial.kind];

  return (
    <form action={action} className="space-y-4 px-4">
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : <input type="hidden" name="kind" value={initial.kind} />}
      <div className="space-y-3 rounded-2xl bg-card p-4">
        <span className="block text-[14px] font-medium text-muted">{copy.days}</span>
        <WeekdayPicker name="weekdays" value={weekdays} onChange={setWeekdays} />
        <ReminderFields initial={initial} />
        <p className="text-[13px] text-muted">{copy.hint}</p>
      </div>
      <div className="space-y-3 rounded-2xl bg-card p-4">
        <Field label="Custom title" hint="Optional. Shown as the notification title.">
          <Input name="label" defaultValue={initial.label ?? ""} placeholder={copy.placeholder} maxLength={80} />
        </Field>
        {initial.id && (
          <label className="flex items-center justify-between text-[16px]">
            <span>On</span>
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="size-5 accent-[var(--accent)]" />
            <input type="hidden" name="enabled" value={enabled ? "on" : "off"} />
          </label>
        )}
      </div>
      <FormError message={state && !state.ok ? state.error : null} />
      <SubmitButton>{initial.id ? "Save changes" : "Create reminder"}</SubmitButton>
    </form>
  );
}
