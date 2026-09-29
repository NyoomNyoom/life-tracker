"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { logDistance, type LogDistanceState } from "@/app/(app)/challenges/actions";
import { QUICK_ACTIVITIES } from "@/lib/challenges";
import type { Unit } from "@/lib/units";
import { CelebrationToast } from "./celebration-toast";
import { FormError, SubmitButton } from "./form-controls";
import { cx, inputClass } from "./ui";

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
    <form ref={formRef} action={action} className="space-y-3 px-4 pb-4">
      <input type="hidden" name="activity" value={activity} />
      <div className="flex gap-1.5" role="radiogroup" aria-label="Activity">
        {QUICK_ACTIVITIES.map((a) => (
          <button
            key={a}
            type="button"
            role="radio"
            aria-checked={activity === a}
            onClick={() => setActivity(a)}
            className={cx("h-8 flex-1 rounded-full text-[14px] font-medium", activity === a ? "bg-journey text-white" : "bg-field text-muted")}
          >
            {LABELS[a]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="relative">
          <span className="sr-only">Distance in {unit === "lb" ? "miles" : "kilometres"}</span>
          <input name="distance" inputMode="decimal" placeholder="Distance" required autoComplete="off" className={cx(inputClass, "pr-10")} />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[14px] text-muted">{unit === "lb" ? "mi" : "km"}</span>
        </label>
        <label>
          <span className="sr-only">Time taken (optional), in minutes or hours:minutes</span>
          <input name="duration" inputMode="text" placeholder="Mins or h:mm" autoComplete="off" className={inputClass} />
        </label>
      </div>
      <div className="flex items-center gap-2">
        <label className="flex flex-1 items-center gap-2 text-[14px] text-muted">
          Date
          <input type="date" name="date" defaultValue={today} max={today} className={cx(inputClass, "h-10 flex-1")} />
        </label>
        <SubmitButton block={false} size="md" pendingText="…" className="min-w-24">
          Log it
        </SubmitButton>
      </div>
      {state?.ok && <p className="text-[14px] font-medium text-accent">{state.message} ✓</p>}
      <FormError message={state && !state.ok ? state.message : null} />
      <CelebrationToast keys={earned} onDone={() => setDismissed(state)} />
    </form>
  );
}
