"use client";

import { useOptimistic, useTransition } from "react";
import { Check } from "lucide-react";
import { toggleTodo } from "@/app/(app)/todos/actions";
import { cx } from "./ui";

/** Round checkbox that completes a to-do for one day, updating instantly. */
export function TodoCheck({ todoId, date, done, title }: { todoId: string; date: string; done: boolean; title: string }) {
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
      className={cx(
        "flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition",
        optimistic ? "border-accent bg-accent text-accent-fg" : "border-faint text-transparent",
      )}
    >
      <Check className="size-4" strokeWidth={3} />
    </button>
  );
}
