"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { logDistance, type LogDistanceState } from "@/app/(app)/challenges/actions";
import { QUICK_ACTIVITIES } from "@/lib/challenges";
import type { Unit } from "@/lib/units";
import { CelebrationToast } from "./celebration-toast";
import { FormError, Segmented, SubmitButton } from "./form-controls";
import { cx, inputClasses } from "./ui";

const LABELS: Record<(typeof QUICK_ACTIVITIES)[number], string> = { Walk: "Walk", Hike: "Hike", "Outdoor Run": "Run", "Outdoor Cycle": "Ride" };

/** One-line logging for walks, hikes, runs and rides that weren't part of a gym session. */
export function QuickDistanceForm({ unit, today }: { unit: Unit; today: string }) {
  const [state, action] = useActionState<LogDistanceState, FormData>(logDistance, null);
  const [activity, setActivity] = useState<(typeof QUICK_ACTIVITIES)[number]>("Walk");
  // The celebration belongs to one result; tapping it away remembers which.
  const [dismissed, setDismissed] = useState<LogDistanceState>(null);
  const earned = state?.ok && state !== dismissed ? state.earned : [];
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <input type="hidden" name="activity" value={activity} />
      <Segmented
        tone="challenges"
        label="Activity"
        value={activity}
        onChange={setActivity}
        options={QUICK_ACTIVITIES.map((a) => ({ value: a, label: LABELS[a] }))}
      />
      <div className="grid grid-cols-2 gap-2">
        <label className="relative">
          <span className="sr-only">Distance in {unit === "lb" ? "miles" : "kilometres"}</span>
          <input name="distance" inputMode="decimal" placeholder="Distance" required autoComplete="off" className={cx(inputClasses({ onTile: true, size: "lg" }), "pr-12")} />
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[16px] font-medium text-muted">{unit === "lb" ? "mi" : "km"}</span>
        </label>
        <label>
          <span className="sr-only">Time taken (optional), in minutes or hours:minutes</span>
          <input name="duration" inputMode="text" placeholder="Mins or h:mm" autoComplete="off" className={inputClasses({ onTile: true, size: "lg" })} />
        </label>
      </div>
      <div className="flex items-center gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-3">
          <span className="text-[17px] font-bold text-white">Date</span>
          <input
            type="date"
            name="date"
            defaultValue={today}
            max={today}
            className="h-13 min-w-0 flex-1 rounded-full bg-challenges-dim px-4 font-mono text-[16px] text-white outline-none [color-scheme:dark] focus:ring-2 focus:ring-challenges-ink"
          />
        </label>
        <SubmitButton block={false} size="lg" pendingText="…" variant="bare" className="bg-challenges-ink text-challenges">
          Log it
        </SubmitButton>
      </div>
      {state?.ok && <p className="text-[16px] font-bold">{state.message} ✓</p>}
      <FormError message={state && !state.ok ? state.message : null} />
      <CelebrationToast keys={earned} onDone={() => setDismissed(state)} />
    </form>
  );
}
