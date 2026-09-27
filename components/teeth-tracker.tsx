"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Check, Moon, Sun } from "lucide-react";
import { setBrushing } from "@/app/(app)/teeth/actions";
import type { BrushDay, BrushSlot } from "@/lib/habits";
import { CelebrationToast } from "./celebration-toast";
import { cx } from "./ui";

type SlotState = { brushed: boolean; flossed: boolean; mouthwash: boolean };

const toState = (day: BrushDay): Record<BrushSlot, SlotState> => ({
  morning: { brushed: !!day.morning, flossed: !!day.morning?.flossed, mouthwash: !!day.morning?.mouthwash },
  night: { brushed: !!day.night, flossed: !!day.night?.flossed, mouthwash: !!day.night?.mouthwash },
});

/** Today's morning and night check-ins with optional floss and mouthwash. Updates instantly. */
export function TeethTracker({ date, day }: { date: string; day: BrushDay }) {
  const [state, setState] = useOptimistic(toState(day));
  const [, startTransition] = useTransition();
  const [earned, setEarned] = useState<string[]>([]);

  function update(slot: BrushSlot, patch: Partial<SlotState>) {
    const current = state[slot];
    let next = { ...current, ...patch };
    // Extras imply you brushed; un-brushing clears them.
    if (patch.flossed || patch.mouthwash) next = { ...next, brushed: true };
    if (patch.brushed === false) next = { brushed: false, flossed: false, mouthwash: false };
    startTransition(async () => {
      setState({ ...state, [slot]: next });
      const res = await setBrushing({ date, slot, ...next });
      if (res.earned.length) setEarned(res.earned);
    });
  }

  return (
    <>
      <ul className="divide-y divide-border">
        {(["morning", "night"] as const).map((slot) => {
          const s = state[slot];
          const Icon = slot === "morning" ? Sun : Moon;
          const label = slot === "morning" ? "Morning" : "Night";
          return (
            <li key={slot} className="flex items-center gap-3 px-4 py-2.5">
              <button
                type="button"
                role="checkbox"
                aria-checked={s.brushed}
                aria-label={`Brushed ${slot === "morning" ? "this morning" : "tonight"}`}
                onClick={() => update(slot, { brushed: !s.brushed })}
                className={cx(
                  "flex size-9 shrink-0 items-center justify-center rounded-full border-2 transition",
                  s.brushed ? "border-teeth bg-teeth text-white" : "border-faint text-faint",
                )}
              >
                {s.brushed ? <Check className="size-5" strokeWidth={3} /> : <Icon className="size-4" aria-hidden />}
              </button>
              <span className={cx("min-w-0 flex-1 text-[16px]", s.brushed && "font-medium")}>{label}</span>
              <Extra label="Floss" on={s.flossed} onClick={() => update(slot, { flossed: !s.flossed })} slot={label} />
              <Extra label="Mouthwash" on={s.mouthwash} onClick={() => update(slot, { mouthwash: !s.mouthwash })} slot={label} />
            </li>
          );
        })}
      </ul>
      <CelebrationToast keys={earned} onDone={() => setEarned([])} />
    </>
  );
}

function Extra({ label, on, onClick, slot }: { label: string; on: boolean; onClick: () => void; slot: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={`${label} (${slot.toLowerCase()})`}
      onClick={onClick}
      className={cx("flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-[13px] font-semibold", on ? "bg-teeth-soft text-teeth" : "bg-field text-muted")}
    >
      {on && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
      {label}
    </button>
  );
}

/** Compact back-fill toggle for one past slot. */
export function PastSlotToggle({ date, slot, done, label }: { date: string; slot: BrushSlot; done: boolean; label: string }) {
  const [on, setOn] = useOptimistic(done);
  const [, startTransition] = useTransition();
  const Icon = slot === "morning" ? Sun : Moon;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={label}
      onClick={() =>
        startTransition(async () => {
          setOn(!on);
          await setBrushing({ date, slot, brushed: !on, flossed: false, mouthwash: false });
        })
      }
      className={cx("flex size-9 items-center justify-center rounded-full", on ? "bg-teeth text-white" : "bg-field text-faint")}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}
