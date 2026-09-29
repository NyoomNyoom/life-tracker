"use client";

import { useActionState, useState } from "react";
import { saveTodo } from "@/app/(app)/todos/actions";
import type { ActionResult } from "@/lib/viewer";
import { FormError, Segmented, SubmitButton, WeekdayPicker } from "./form-controls";
import { ReminderFields, type ReminderFieldValues } from "./reminder-fields";
import { Field, Input, Select, Textarea } from "./ui";

type Schedule = "once" | "daily" | "weekly" | "monthly";

export type TodoFormValues = {
  id?: string;
  title: string;
  notes: string | null;
  schedule: Schedule;
  due_date: string | null;
  weekdays: number[] | null;
  month_day: number | null;
  active: boolean;
  reminder: ReminderFieldValues | null;
};

export function TodoForm({ initial, today }: { initial?: TodoFormValues; today: string }) {
  const [state, action] = useActionState<ActionResult, FormData>(saveTodo, null);
  const [schedule, setSchedule] = useState<Schedule>(initial?.schedule ?? "once");
  const [weekdays, setWeekdays] = useState<number[]>(initial?.weekdays ?? [1, 3, 5]);
  const [remind, setRemind] = useState(initial ? initial.reminder != null : true);
  const [active, setActive] = useState(initial?.active ?? true);

  return (
    <form action={action} className="space-y-4 px-4">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <div className="space-y-3 rounded-2xl bg-card p-4">
        <Field label="What needs doing?">
          <Input name="title" defaultValue={initial?.title} placeholder="Take creatine" maxLength={120} required autoFocus={!initial} />
        </Field>
        <Field label="Notes">
          <Textarea name="notes" defaultValue={initial?.notes ?? ""} placeholder="Optional" maxLength={1000} />
        </Field>
      </div>

      <div className="space-y-3 rounded-2xl bg-card p-4">
        <span className="block text-[14px] font-medium text-muted">Repeats</span>
        <Segmented
          name="schedule"
          value={schedule}
          onChange={setSchedule}
          options={[
            { value: "once", label: "Once" },
            { value: "daily", label: "Daily" },
            { value: "weekly", label: "Weekly" },
            { value: "monthly", label: "Monthly" },
          ]}
        />
        {schedule === "once" && (
          <Field label="Due on">
            <Input type="date" name="due_date" defaultValue={initial?.due_date ?? today} required />
          </Field>
        )}
        {schedule === "weekly" && <WeekdayPicker name="weekdays" value={weekdays} onChange={setWeekdays} />}
        {schedule === "monthly" && (
          <Field label="Day of the month" hint="On the 29th-31st it falls on the last day of shorter months.">
            <Select name="month_day" defaultValue={String(initial?.month_day ?? 1)}>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {initial?.id && (
          <label className="flex items-center justify-between pt-1 text-[16px]">
            <span>Active</span>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-5 accent-[var(--accent)]" />
            <input type="hidden" name="active" value={active ? "on" : "off"} />
          </label>
        )}
      </div>

      <div className="space-y-3 rounded-2xl bg-card p-4">
        <label className="flex items-center justify-between text-[16px] font-medium">
          <span>Remind me</span>
          <input type="checkbox" name="remind" checked={remind} onChange={(e) => setRemind(e.target.checked)} className="size-5 accent-[var(--accent)]" />
        </label>
        {remind && <ReminderFields initial={initial?.reminder ?? undefined} />}
        {remind && <p className="text-[13px] text-muted">Only sent on days it&apos;s due, and only if you haven&apos;t ticked it off.</p>}
      </div>

      <FormError message={state && !state.ok ? state.error : null} />
      <SubmitButton>{initial?.id ? "Save changes" : "Add to-do"}</SubmitButton>
    </form>
  );
}
