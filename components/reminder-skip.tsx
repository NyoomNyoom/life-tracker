"use client";

import { useOptimistic, useTransition } from "react";
import { skipReminder } from "@/app/(app)/reminders/actions";

/** "Skip today" / "Undo" for one of today's reminders on the dashboard. */
export function ReminderSkip({ id, date, skipped }: { id: string; date: string; skipped: boolean }) {
  const [value, setValue] = useOptimistic(skipped);
  const [, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="shrink-0 rounded-lg bg-field px-2.5 py-1 text-[13px] font-semibold text-muted"
      onClick={() =>
        startTransition(async () => {
          setValue(!value);
          await skipReminder(id, date, !value);
        })
      }
    >
      {value ? "Undo" : "Skip today"}
    </button>
  );
}
