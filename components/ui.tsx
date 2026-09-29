import Link from "next/link";
import { Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

// Shared building blocks for the Colour Block design. Server-component friendly (no hooks here).
// Rules of thumb: one colour per tracker, ink pills for primary actions, one big number per tile.

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export type Tone =
  | "card"
  | "field"
  | "ink"
  | "done"
  | "danger"
  | "weight"
  | "training"
  | "trainingSoft"
  | "teeth"
  | "challenges"
  | "todos"
  | "reminders"
  | "achievements";

/** Background + text colour for each tone. A tracker's colour always comes with its own ink. */
export const TONES: Record<Tone, string> = {
  card: "bg-card text-ink",
  field: "bg-field text-ink",
  ink: "bg-ink text-white",
  done: "bg-done text-done-ink",
  danger: "bg-danger-soft text-danger",
  weight: "bg-weight text-weight-ink",
  training: "bg-training text-training-ink",
  trainingSoft: "bg-training-soft text-ink",
  teeth: "bg-teeth text-teeth-ink",
  challenges: "bg-challenges text-challenges-ink",
  todos: "bg-todos text-todos-ink",
  reminders: "bg-reminders text-reminders-ink",
  achievements: "bg-achievements text-achievements-ink",
};

export function PageHeader({
  title,
  subtitle,
  action,
  back,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="px-5 pt-4 pb-4">
      {back && <BackLink href={back.href} label={back.label} className="mb-3" />}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="display text-[38px] break-words">{title}</h1>
          {subtitle && <p className="mt-1.5 text-[16px] font-medium text-muted">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0 pb-0.5">{action}</div>}
      </div>
    </header>
  );
}

export function BackLink({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <Link href={href} className={cx("inline-flex h-11 items-center gap-1 rounded-full bg-card pr-4 pl-3 text-[16px] font-semibold active:opacity-70", className)}>
      <ChevronLeft className="size-5" aria-hidden />
      {label}
    </Link>
  );
}

/**
 * A block of one flat colour: the basic surface of every screen. 12px from the edges, 10px apart.
 * `flush` drops the outer margins, for tiles laid out in a grid.
 */
export function Tile({ tone = "card", flush = false, className, children, ...rest }: ComponentProps<"section"> & { tone?: Tone; flush?: boolean }) {
  return (
    <section className={cx(!flush && "mx-3 mb-2.5", "rounded-tile p-5", TONES[tone], className)} {...rest}>
      {children}
    </section>
  );
}

/** The small label that names a tile, with an optional link or button on the right. */
export function TileHeader({ title, action, tight = false }: { title: ReactNode; action?: ReactNode; tight?: boolean }) {
  return (
    <div className={cx("flex min-h-7 items-center justify-between gap-2", !tight && "mb-2")}>
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {action}
    </div>
  );
}

export function TileLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={cx("text-[15px] font-bold underline underline-offset-4 active:opacity-60", className)}>
      {children}
    </Link>
  );
}

/** Rows separated by hairlines in the surrounding text colour, so they work on any tile. */
export function Rows({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("divide-y divide-current/12", className)}>{children}</div>;
}

export function ListRow({
  href,
  title,
  subtitle,
  right,
  icon,
  className,
}: {
  href?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  const inner = (
    <div className={cx("flex min-h-12 items-center gap-3.5 py-3", className)}>
      {icon && <div className="shrink-0">{icon}</div>}
      <div className="min-w-0 flex-1">
        <div className="text-[17px] leading-snug font-bold">{title}</div>
        {subtitle && <div className="text-[14px] leading-snug font-medium opacity-70">{subtitle}</div>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
      {href && <ChevronRight className="size-5 shrink-0 opacity-50" aria-hidden />}
    </div>
  );
  return href ? (
    <Link href={href} className="block active:opacity-70">
      {inner}
    </Link>
  ) : (
    inner
  );
}

/** A tracker-coloured square holding an icon, used at the start of list rows. */
export function IconSquare({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx("flex size-11 items-center justify-center rounded-[14px] [&>svg]:size-[22px]", TONES[tone], className)} aria-hidden>
      {children}
    </span>
  );
}

/** `bare` sets no colours, for a tracker-coloured button (pass its bg/text classes). */
type ButtonVariant = "primary" | "secondary" | "outline" | "white" | "danger" | "ghost" | "bare";
type ButtonSize = "sm" | "md" | "lg" | "xl";

const buttonStyles: Record<ButtonVariant, string> = {
  primary: "bg-ink text-white",
  secondary: "bg-field text-ink",
  outline: "border-2 border-current bg-transparent",
  white: "bg-card text-ink",
  danger: "bg-danger-soft text-danger",
  ghost: "bg-transparent",
  bare: "",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", block = false) {
  return cx(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-bold transition active:scale-[0.98] active:opacity-85 disabled:opacity-50",
    size === "xl" && "h-16 px-6 text-[19px]",
    size === "lg" && "h-14 px-6 text-[18px]",
    size === "md" && "h-12 px-5 text-[16px]",
    size === "sm" && "h-10 px-4 text-[15px]",
    block && "w-full",
    buttonStyles[variant],
  );
}

type ButtonProps = { variant?: ButtonVariant; size?: ButtonSize; block?: boolean };

export function Button({ variant = "primary", size = "md", block, className, ...rest }: ComponentProps<"button"> & ButtonProps) {
  return <button className={cx(buttonClass(variant, size, block), className)} {...rest} />;
}

export function LinkButton({ variant = "primary", size = "md", block, className, ...rest }: ComponentProps<typeof Link> & ButtonProps) {
  return <Link className={cx(buttonClass(variant, size, block), className)} {...rest} />;
}

export type InputOptions = {
  /** Inside a coloured tile: a white field instead of the warm grey one. */
  onTile?: boolean;
  /** "lg" is the 56px field used for the main input of a form. */
  size?: "md" | "lg";
  /** Bold value text, for names and numbers. */
  strong?: boolean;
  multiline?: boolean;
  /** Red outline for a value that fails a check. */
  invalid?: boolean;
};

/** Field style: warm grey on white cards, white inside coloured tiles, an ink outline when focused. */
export function inputClasses({ onTile = false, size = "md", strong = false, multiline = false, invalid = false }: InputOptions = {}) {
  return cx(
    "block w-full rounded-2xl border-2 px-4 text-ink outline-none placeholder:font-normal placeholder:text-faint",
    invalid ? "border-danger" : "border-transparent focus:border-ink",
    multiline ? "min-h-28 py-3" : size === "lg" ? "h-14" : "h-13",
    size === "lg" ? "text-[18px]" : "text-[17px]",
    strong ? "font-bold" : "font-medium",
    onTile ? "bg-card" : "bg-field focus:bg-card",
  );
}

export const inputClass = inputClasses();

export function Field({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[15px] font-bold">{label}</span>
      {children}
      {hint && <span className="mt-2 block text-[14px] font-medium opacity-70">{hint}</span>}
    </label>
  );
}

// `className` on these is for layout extras (padding for an icon, alignment); size and weight go through the options.
export function Input({ onTile, size, strong, invalid, className, ...props }: Omit<ComponentProps<"input">, "size"> & Omit<InputOptions, "multiline">) {
  return <input {...props} aria-invalid={invalid || undefined} className={cx(inputClasses({ onTile, size, strong, invalid }), className)} />;
}

export function Select({ onTile, size, strong, className, ...props }: Omit<ComponentProps<"select">, "size"> & Omit<InputOptions, "multiline">) {
  return (
    <span className="relative block">
      <select {...props} className={cx(inputClasses({ onTile, size, strong }), "appearance-none pr-11", className)} />
      <ChevronDown className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-ink" aria-hidden />
    </span>
  );
}

export function Textarea({ onTile, className, ...props }: ComponentProps<"textarea"> & { onTile?: boolean }) {
  return <textarea {...props} className={cx(inputClasses({ onTile, multiline: true }), className)} />;
}

export type ChipTone = "neutral" | "overdue" | "done" | "pr" | "time" | "timeDark" | "error" | "teeth" | "white";

const chipTones: Record<ChipTone, string> = {
  neutral: "bg-field text-muted",
  overdue: "bg-ink text-todos",
  done: "bg-done text-done-ink",
  pr: "bg-todos text-ink",
  time: "bg-reminders text-reminders-ink font-mono font-medium",
  timeDark: "bg-ink text-todos font-mono font-medium",
  error: "bg-danger-soft text-danger",
  teeth: "bg-teeth-ink text-teeth",
  white: "bg-card text-ink",
};

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: ChipTone; className?: string }) {
  return (
    <span className={cx("inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-3 text-[13px] font-bold whitespace-nowrap", chipTones[tone], className)}>
      {children}
    </span>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="py-3">
      <p className="text-[17px] font-bold">{title}</p>
      {body && <p className="mt-1 text-[15px] font-medium opacity-70">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export type NoticeTone = "neutral" | "success" | "warn" | "danger" | "reminders";

const noticeTones: Record<NoticeTone, string> = {
  neutral: "bg-field text-ink",
  success: "bg-done text-done-ink",
  warn: "bg-todos text-ink",
  danger: "bg-danger-soft text-danger",
  reminders: "bg-reminders text-reminders-ink",
};

/** A rounded message block. Success notices lead with a tick. */
export function Notice({ tone = "neutral", children, className }: { tone?: NoticeTone; children: ReactNode; className?: string }) {
  return (
    <div className={cx("flex items-start gap-3 rounded-[22px] px-5 py-4 text-[16px] leading-snug font-semibold", noticeTones[tone], className)}>
      {tone === "success" && <Check className="mt-0.5 size-5 shrink-0" strokeWidth={2.5} aria-hidden />}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Heading above a group of cards on the ground (e.g. muscle groups). */
export function GroupLabel({ children }: { children: ReactNode }) {
  return <h2 className="mx-5 mt-5 mb-2 text-[17px] font-extrabold">{children}</h2>;
}
