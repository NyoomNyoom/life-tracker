"use client";

import { useOptimistic, useTransition } from "react";
import { Check } from "lucide-react";
import { toggleTodo } from "@/app/(app)/todos/actions";
import { cx } from "./ui";

/**
 * Square tick box that completes a to-do for one day, updating instantly.
 * `onDark` is for the ink "Overdue" tile: a borderless white box that fills butter when ticked.
 */
export function TodoCheck({ todoId, date, done, title, onDark = false }: { todoId: string; date: string; done: boolean; title: string; onDark?: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(done);
  const [, startTransition] = useTransition();
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={optimistic}
      aria-label={`${optimistic ? "Undo" : "Complete"}: ${title}`}
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!optimistic);
          await toggleTodo(todoId, date, !optimistic);
        })
      }
      // 28px box inside a 44px hit area.
      className="-m-2 flex size-11 shrink-0 items-center justify-center"
    >
      <span
        className={cx(
          "flex size-7 items-center justify-center rounded-[7px] transition",
          onDark ? (optimistic ? "bg-todos text-ink" : "bg-card text-transparent") : optimistic ? "bg-ink text-white" : "border-2 border-ink bg-card text-transparent",
        )}
      >
        <Check className="size-5" strokeWidth={3} aria-hidden />
      </span>
    </button>
  );
}
