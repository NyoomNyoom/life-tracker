"use client";

import { useActionState, useState } from "react";
import { saveTodo } from "@/app/(app)/todos/actions";
import type { ActionResult } from "@/lib/viewer";
import { FormError, Segmented, SubmitButton, Switch, WeekdayPicker } from "./form-controls";
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
    <form action={action} className="space-y-2.5 px-3">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <div className="space-y-4 rounded-tile bg-todos p-5 text-todos-ink">
        <Field label="What needs doing?">
          <Input onTile name="title" defaultValue={initial?.title} placeholder="Take creatine" maxLength={120} required autoFocus={!initial} size="lg" strong />
        </Field>
        <Field label="Notes">
          <Textarea onTile name="notes" defaultValue={initial?.notes ?? ""} placeholder="Optional" maxLength={1000} />
        </Field>
      </div>

      <div className="space-y-4 rounded-tile bg-card p-5">
        <div>
          <span className="mb-2 block text-[15px] font-bold">Repeats</span>
          <Segmented
            label="Repeats"
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
        </div>
        {schedule === "once" && (
          <Field label="Due on">
            <Input type="date" name="due_date" defaultValue={initial?.due_date ?? today} required className="font-mono" />
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
          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-[18px] font-bold">Active</span>
            <Switch name="active" label="Active" checked={active} onChange={setActive} />
          </div>
        )}
      </div>

      <div className="space-y-4 rounded-tile bg-reminders p-5 text-reminders-ink">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[21px] font-extrabold tracking-tight">Remind me</span>
          <Switch label="Remind me" checked={remind} onChange={setRemind} />
          {remind && <input type="hidden" name="remind" value="on" />}
        </div>
        {remind && <ReminderFields initial={initial?.reminder ?? undefined} />}
        {remind && (
          <p className="border-t border-reminders-ink/15 pt-4 text-[16px] font-bold">Only sent on days it&apos;s due, and only if you haven&apos;t ticked it off.</p>
        )}
      </div>

      <FormError message={state && !state.ok ? state.error : null} />
      <SubmitButton size="xl">{initial?.id ? "Save changes" : "Add to-do"}</SubmitButton>
    </form>
  );
}
