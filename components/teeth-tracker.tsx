"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Check, Moon, Sun } from "lucide-react";
import { setBrushing } from "@/app/(app)/teeth/actions";
import type { BrushDay, BrushSlot } from "@/lib/habits";
import { CelebrationToast } from "./celebration-toast";
import { cx } from "./ui";

type SlotState = { brushed: boolean; flossed: boolean; mouthwash: boolean };

const SLOTS = [
  { slot: "morning", label: "Morning", icon: Sun },
  { slot: "night", label: "Night", icon: Moon },
] as const;

const toState = (day: BrushDay): Record<BrushSlot, SlotState> => ({
  morning: { brushed: !!day.morning, flossed: !!day.morning?.flossed, mouthwash: !!day.morning?.mouthwash },
  night: { brushed: !!day.night, flossed: !!day.night?.flossed, mouthwash: !!day.night?.mouthwash },
});

/**
 * Today's morning and night check-ins. Updates instantly.
 * `compact` is the Today tile: two big pills, brushing only. The full version adds floss and mouthwash.
 */
export function TeethTracker({ date, day, compact = false }: { date: string; day: BrushDay; compact?: boolean }) {
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

  const toast = <CelebrationToast keys={earned} onDone={() => setEarned([])} />;

  if (compact) {
    return (
      <div className="space-y-2.5">
        {SLOTS.map(({ slot, label, icon: Icon }) => {
          const on = state[slot].brushed;
          return (
            <button
              key={slot}
              type="button"
              role="checkbox"
              aria-checked={on}
              aria-label={`Brushed ${slot === "morning" ? "this morning" : "tonight"}`}
              onClick={() => update(slot, { brushed: !on })}
              className={cx(
                "flex h-13 w-full items-center gap-2.5 rounded-full border-2 border-teeth-ink px-5 text-[17px] font-bold transition active:scale-[0.98]",
                on ? "bg-teeth-ink text-teeth" : "text-teeth-ink",
              )}
            >
              {on ? <Check className="size-5 shrink-0" strokeWidth={3} aria-hidden /> : <Icon className="size-5 shrink-0" aria-hidden />}
              {label}
            </button>
          );
        })}
        {toast}
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {SLOTS.map(({ slot, label, icon: Icon }) => {
          const s = state[slot];
          return (
            <li key={slot} className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <button
                type="button"
                role="checkbox"
                aria-checked={s.brushed}
                aria-label={`Brushed ${slot === "morning" ? "this morning" : "tonight"}`}
                onClick={() => update(slot, { brushed: !s.brushed })}
                className={cx(
                  "flex size-13 shrink-0 items-center justify-center rounded-full border-[2.5px] border-teeth-ink transition active:scale-95",
                  s.brushed ? "bg-teeth-ink text-teeth" : "text-teeth-ink",
                )}
              >
                {s.brushed ? <Check className="size-6" strokeWidth={3} /> : <Icon className="size-6" aria-hidden />}
              </button>
              <span className="shrink-0 text-[21px] font-extrabold">{label}</span>
              <span className="ml-auto flex gap-1.5">
                <Extra label="Floss" on={s.flossed} onClick={() => update(slot, { flossed: !s.flossed })} slot={label} />
                <Extra label="Mouthwash" on={s.mouthwash} onClick={() => update(slot, { mouthwash: !s.mouthwash })} slot={label} />
              </span>
            </li>
          );
        })}
      </ul>
      {toast}
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
      className={cx("flex h-11 shrink-0 items-center gap-1 rounded-full px-3 text-[14px] font-bold transition", on ? "bg-teeth-ink text-teeth" : "bg-white/60 text-teeth-ink")}
    >
      {on && <Check className="size-4" strokeWidth={3} aria-hidden />}
      {label}
    </button>
  );
}

/** Round back-fill toggle for one past slot: solid with a tick when brushed, dashed when not. */
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
      className={cx(
        "flex size-12 shrink-0 items-center justify-center rounded-full transition active:scale-95",
        on ? "bg-teeth-ink text-teeth" : "border-2 border-dashed border-faint text-faint",
      )}
    >
      {on ? <Check className="size-5" strokeWidth={3} aria-hidden /> : <Icon className="size-5" aria-hidden />}
    </button>
  );
}
