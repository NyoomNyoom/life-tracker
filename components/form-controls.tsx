"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps, ReactNode } from "react";
import { X } from "lucide-react";
import { WEEKDAYS } from "@/lib/dates";
import { buttonClass, cx } from "./ui";

/** Submit button that shows a pending state while its form's server action runs. */
export function SubmitButton({
  children,
  pendingText,
  variant = "primary",
  size = "lg",
  block = true,
  className,
  ...rest
}: ComponentProps<"button"> & {
  pendingText?: string;
  variant?: "primary" | "secondary" | "outline" | "white" | "danger" | "ghost" | "bare";
  size?: "md" | "sm" | "lg" | "xl";
  block?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || rest.disabled} className={cx(buttonClass(variant, size, block), className)} {...rest}>
      {pending ? (pendingText ?? "Saving…") : children}
    </button>
  );
}

/**
 * Where a control sits decides its colours: "field" on white cards (grey track, ink selection),
 * "reminders" on the lavender tile (white track, deep-violet selection), "challenges" on the green tile.
 */
export type ControlTone = "field" | "reminders" | "challenges";

const segmentTones: Record<ControlTone, { track: string; on: string; off: string }> = {
  field: { track: "bg-field", on: "bg-ink text-white", off: "text-ink" },
  reminders: { track: "bg-card", on: "bg-reminders-ink text-white", off: "text-reminders-ink" },
  challenges: { track: "bg-challenges-dim", on: "bg-challenges-ink text-challenges", off: "text-white" },
};

/** Seven round toggles for picking days of the week (ISO 1-7). Renders hidden inputs named `name`. */
export function WeekdayPicker({
  name,
  value,
  onChange,
  tone = "field",
}: {
  name: string;
  value: number[];
  onChange: (days: number[]) => void;
  tone?: ControlTone;
}) {
  const t = segmentTones[tone];
  return (
    <div className="flex justify-between gap-1">
      {WEEKDAYS.map((d) => {
        const on = value.includes(d.value);
        return (
          <button
            key={d.value}
            type="button"
            aria-pressed={on}
            aria-label={d.label}
            onClick={() => onChange(on ? value.filter((v) => v !== d.value) : [...value, d.value].sort())}
            className={cx("aspect-square max-w-12 min-w-0 flex-1 rounded-full text-[16px] font-bold transition", on ? t.on : tone === "field" ? "bg-field text-ink" : t.track + " " + t.off)}
          >
            {d.short}
          </button>
        );
      })}
      {value.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}
    </div>
  );
}

/** Pill-shaped segmented control. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  name,
  tone = "field",
  label,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
  name?: string;
  tone?: ControlTone;
  label?: string;
}) {
  const t = segmentTones[tone];
  return (
    <div className={cx("flex h-13 rounded-full p-1", t.track)} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx("min-w-0 flex-auto truncate rounded-full px-3 text-[16px] font-bold transition", value === o.value ? t.on : t.off)}
        >
          {o.label}
        </button>
      ))}
      {name && <input type="hidden" name={name} value={value} />}
    </div>
  );
}

export function switchClass(on: boolean) {
  return cx("relative h-8 w-[52px] shrink-0 rounded-full transition-colors", on ? "bg-ink" : "bg-switch-off");
}

export function SwitchKnob({ on }: { on: boolean }) {
  return <span className={cx("absolute top-1 size-6 rounded-full bg-white shadow-sm transition-all", on ? "left-[24px]" : "left-1")} aria-hidden />;
}

/** On/off switch. With `name`, it also submits "on"/"off" in its form. */
export function Switch({ checked, onChange, name, label }: { checked: boolean; onChange: (on: boolean) => void; name?: string; label: string }) {
  return (
    <>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={switchClass(checked)}>
        <SwitchKnob on={checked} />
      </button>
      {name && <input type="hidden" name={name} value={checked ? "on" : "off"} />}
    </>
  );
}

/** Bottom sheet used for pickers: slides over the page on the ground colour. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink/45" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" className="h-14 shrink-0" onClick={onClose} />
      <div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col rounded-t-tile bg-ground pb-safe">
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-switch-off" aria-hidden />
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
          <h2 className="display text-[38px]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex size-12 items-center justify-center rounded-full bg-card active:opacity-70">
            <X className="size-6" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-[18px] bg-danger-soft px-4 py-3 text-[15px] font-semibold text-danger">
      {message}
    </p>
  );
}
