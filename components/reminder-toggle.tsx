"use client";

import { useOptimistic, useTransition } from "react";
import { setReminderEnabled } from "@/app/(app)/reminders/actions";
import { cx } from "./ui";

/** iOS-style switch that turns a reminder on or off in place. */
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
      className={cx("relative h-[31px] w-[51px] shrink-0 rounded-full transition", on ? "bg-accent" : "bg-field")}
    >
      <span className={cx("absolute top-[2px] size-[27px] rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-[2px]")} />
    </button>
  );
}
