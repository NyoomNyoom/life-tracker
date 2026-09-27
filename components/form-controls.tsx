"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps, ReactNode } from "react";
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
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "sm" | "lg";
  block?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || rest.disabled} className={cx(buttonClass(variant, size, block), className)} {...rest}>
      {pending ? (pendingText ?? "Saving…") : children}
    </button>
  );
}

/** Seven toggle chips for picking days of the week (ISO 1-7). Renders hidden inputs named `name`. */
export function WeekdayPicker({ name, value, onChange }: { name: string; value: number[]; onChange: (days: number[]) => void }) {
  return (
    <div className="flex justify-between gap-1.5">
      {WEEKDAYS.map((d) => {
        const on = value.includes(d.value);
        return (
          <button
            key={d.value}
            type="button"
            aria-pressed={on}
            aria-label={d.label}
            onClick={() => onChange(on ? value.filter((v) => v !== d.value) : [...value, d.value].sort())}
            className={cx(
              "h-10 flex-1 rounded-full text-[15px] font-semibold transition",
              on ? "bg-accent text-accent-fg" : "bg-field text-muted",
            )}
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

/** iOS-style segmented control. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  name,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
  name?: string;
}) {
  return (
    <div className="flex rounded-[10px] bg-field p-0.5" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "h-8 flex-1 rounded-lg text-[14px] font-medium transition",
            value === o.value ? "bg-card text-fg shadow-sm" : "text-muted",
          )}
        >
          {o.label}
        </button>
      ))}
      {name && <input type="hidden" name={name} value={value} />}
    </div>
  );
}

/** Bottom sheet / full-height modal used for pickers. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/40" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" className="h-10 shrink-0" onClick={onClose} />
      <div className="flex min-h-0 flex-1 flex-col rounded-t-2xl bg-bg pb-safe">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="text-[17px] font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="text-[16px] font-semibold text-accent">
            Done
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
    <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-[14px] text-danger">
      {message}
    </p>
  );
}
