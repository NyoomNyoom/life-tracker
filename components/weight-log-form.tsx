"use client";

import { useActionState, useEffect, useRef } from "react";
import { logWeight } from "@/app/(app)/weight/actions";
import { FormError, SubmitButton } from "./form-controls";
import { inputClass, cx } from "./ui";
import type { ActionResult } from "@/lib/viewer";
import type { Unit } from "@/lib/units";

/** Quick weight entry. `showDate` adds a date picker for back-filling. */
export function WeightLogForm({
  unit,
  today,
  defaultValue,
  showDate = false,
  compact = false,
}: {
  unit: Unit;
  today: string;
  defaultValue?: string;
  showDate?: boolean;
  compact?: boolean;
}) {
  const [state, action] = useActionState<ActionResult, FormData>(logWeight, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            name="weight"
            inputMode="decimal"
            autoComplete="off"
            placeholder={defaultValue || (unit === "kg" ? "80.0" : "176.0")}
            aria-label={`Weight in ${unit}`}
            required
            className={cx(inputClass, "pr-12 text-[20px] font-semibold tabular", compact ? "h-11" : "h-12")}
          />
          <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-[15px] text-muted">{unit}</span>
        </div>
        <SubmitButton block={false} size={compact ? "md" : "lg"} pendingText="…" className="min-w-20">
          Log
        </SubmitButton>
      </div>
      {showDate && (
        <label className="flex items-center justify-between gap-3 text-[15px]">
          <span className="text-muted">Date</span>
          <input type="date" name="date" defaultValue={today} max={today} className={cx(inputClass, "h-10 w-auto")} />
        </label>
      )}
      {state?.ok && state.message && <p className="text-[14px] font-medium text-accent">{state.message} ✓</p>}
      <FormError message={state && !state.ok ? state.error : null} />
    </form>
  );
}
