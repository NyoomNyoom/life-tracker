"use client";

import { useOptimistic, useTransition } from "react";
import { setReminderEnabled } from "@/app/(app)/reminders/actions";
import { SwitchKnob, switchClass } from "./form-controls";

/** Switch that turns a reminder on or off in place. */
export function ReminderToggle({ id, enabled, label }: { id: string; enabled: boolean; label: string }) {
  const [on, setOn] = useOptimistic(enabled);
  const [, startTransition] = useTransition();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() =>
        startTransition(async () => {
          setOn(!on);
          await setReminderEnabled(id, !on);
        })
      }
      className={switchClass(on)}
    >
      <SwitchKnob on={on} />
    </button>
  );
}
