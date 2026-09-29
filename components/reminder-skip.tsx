"use client";

import { useOptimistic, useTransition } from "react";
import { skipReminder } from "@/app/(app)/reminders/actions";

/** "Skip today" / "Undo" pill for one of today's reminders on the dashboard. */
export function ReminderSkip({ id, date, skipped }: { id: string; date: string; skipped: boolean }) {
  const [value, setValue] = useOptimistic(skipped);
  const [, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="h-10 shrink-0 rounded-full bg-card px-3.5 text-[13px] font-bold text-ink active:opacity-70"
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
