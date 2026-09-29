"use client";

import { useActionState, useState } from "react";
import { updateProfile } from "@/app/(app)/settings/actions";
import { useDeviceTimezone, useTimezones } from "@/lib/use-device";
import type { ActionResult } from "@/lib/viewer";
import { FormError, Segmented, SubmitButton, Switch } from "./form-controls";
import { Field, Input, Notice, Select } from "./ui";

export function ProfileForm({
  initial,
}: {
  initial: { display_name: string | null; unit: "kg" | "lb"; timezone: string; weekly_workout_goal: number; notify_milestones: boolean };
}) {
  const [state, action] = useActionState<ActionResult, FormData>(updateProfile, null);
  const [unit, setUnit] = useState(initial.unit);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [milestones, setMilestones] = useState(initial.notify_milestones);
  const allZones = useTimezones();
  const zones = allZones.includes(timezone) ? allZones : [timezone, ...allZones];
  const device = useDeviceTimezone();

  return (
    <form action={action} className="space-y-5">
      <Field label="Name">
        <Input name="display_name" defaultValue={initial.display_name ?? ""} maxLength={60} placeholder="Optional" />
      </Field>
      <div>
        <span className="mb-2 block text-[15px] font-bold">Units</span>
        <Segmented label="Units" name="unit" value={unit} onChange={setUnit} options={[{ value: "kg", label: "kg · km" }, { value: "lb", label: "lb · mi" }]} />
      </div>
      <Field
        label="Timezone"
        hint={
          device && device !== timezone ? (
            <button type="button" className="font-bold underline underline-offset-4" onClick={() => setTimezone(device)}>
              Use this device&apos;s timezone ({device})
            </button>
          ) : (
            "Reminders and “today” follow this timezone."
          )
        }
      >
        <Select name="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
          {zones.map((z) => (
            <option key={z} value={z}>
              {z.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Weekly workout goal" hint="Used for your weekly count and streak.">
        <Select name="weekly_workout_goal" defaultValue={String(initial.weekly_workout_goal)}>
          {Array.from({ length: 7 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} workout{n === 1 ? "" : "s"} a week
            </option>
          ))}
        </Select>
      </Field>
      <div className="flex items-center justify-between gap-4">
        <span>
          <span className="block text-[18px] leading-snug font-bold">Checkpoint &amp; medal notifications</span>
          <span className="mt-0.5 block text-[14px] font-medium text-muted">A push when you reach a challenge checkpoint or finish one.</span>
        </span>
        <Switch name="notify_milestones" label="Checkpoint and medal notifications" checked={milestones} onChange={setMilestones} />
      </div>
      <FormError message={state && !state.ok ? state.error : null} />
      {state?.ok && <Notice tone="success">Saved.</Notice>}
      <SubmitButton size="xl">Save</SubmitButton>
    </form>
  );
}
