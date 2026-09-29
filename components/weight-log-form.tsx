"use client";

import { useActionState, useEffect, useRef } from "react";
import { logWeight } from "@/app/(app)/weight/actions";
import { FormError, SubmitButton } from "./form-controls";
import { cx } from "./ui";
import type { ActionResult } from "@/lib/viewer";
import type { Unit } from "@/lib/units";

/**
 * Weight entry, drawn for the blue weight tile. `showDate` (the Weight page) adds a date picker for
 * back-filling and a bigger number field; without it, it's the compact form on the Today tile.
 */
export function WeightLogForm({
  unit,
  today,
  defaultValue,
  showDate = false,
}: {
  unit: Unit;
  today: string;
  defaultValue?: string;
  showDate?: boolean;
}) {
  const [state, action] = useActionState<ActionResult, FormData>(logWeight, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  const input = (
    <div className="relative min-w-0 flex-1">
      <input
        name="weight"
        inputMode="decimal"
        autoComplete="off"
        placeholder={defaultValue || (unit === "kg" ? "80.0" : "176.0")}
        aria-label={`Weight in ${unit}`}
        required
        className={cx(
          "block w-full rounded-[20px] border-2 border-transparent bg-card pr-12 pl-5 font-extrabold tracking-tight text-ink outline-none placeholder:text-faint focus:border-ink",
          showDate ? "h-16 text-[30px]" : "h-13 text-[22px]",
        )}
      />
      <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[16px] font-semibold text-muted">{unit}</span>
    </div>
  );

  return (
    <form ref={formRef} action={action} className="space-y-3">
      {showDate ? (
        <div className="flex gap-2">
          {input}
          <SubmitButton block={false} size="xl" pendingText="…" className="min-w-24">
            Save
          </SubmitButton>
        </div>
      ) : (
        <>
          {input}
          <SubmitButton size="md" pendingText="…">
            Log
          </SubmitButton>
        </>
      )}
      {showDate && (
        <label className="flex items-center justify-between gap-3">
          <span className="text-[17px] font-bold">Date</span>
          <input
            type="date"
            name="date"
            defaultValue={today}
            max={today}
            className="h-13 min-w-0 rounded-full bg-white/15 px-5 font-mono text-[17px] font-medium text-white outline-none [color-scheme:dark] focus:bg-white/25"
          />
        </label>
      )}
      {state?.ok && state.message && <p className="text-[16px] font-bold text-todos">{state.message} ✓</p>}
      <FormError message={state && !state.ok ? state.error : null} />
    </form>
  );
}
