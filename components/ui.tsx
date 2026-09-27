import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

// Small set of shared building blocks. Server-component friendly (no hooks here).

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function PageHeader({
  title,
  subtitle,
  action,
  back,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="px-4 pt-4 pb-3">
      {back && (
        <Link href={back.href} className="mb-1 inline-block text-[15px] text-accent">
          ‹ {back.label}
        </Link>
      )}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-[28px] leading-tight font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-0.5 text-[15px] text-muted">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0 pb-1">{action}</div>}
      </div>
    </header>
  );
}

export function Card({ children, className, ...rest }: ComponentProps<"section">) {
  return (
    <section className={cx("mx-4 mb-4 rounded-2xl bg-card", className)} {...rest}>
      {children}
    </section>
  );
}

export function CardHeader({ title, action, icon }: { title: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-1">
      <h2 className="flex items-center gap-2 text-[13px] font-semibold tracking-wide text-muted uppercase">
        {icon}
        {title}
      </h2>
      {action}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <h2 className="mx-8 mt-2 mb-1.5 text-[13px] font-medium tracking-wide text-muted uppercase">{children}</h2>;
}

export function ListRow({
  href,
  title,
  subtitle,
  right,
  icon,
}: {
  href?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  icon?: ReactNode;
}) {
  const inner = (
    <div className="flex min-h-[52px] items-center gap-3 px-4 py-2.5">
      {icon && <div className="shrink-0">{icon}</div>}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[16px]">{title}</div>
        {subtitle && <div className="truncate text-[13px] text-muted">{subtitle}</div>}
      </div>
      {right && <div className="shrink-0 text-[15px] text-muted">{right}</div>}
      {href && <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden />}
    </div>
  );
  return href ? (
    <Link href={href} className="block active:bg-card-pressed">
      {inner}
    </Link>
  ) : (
    inner
  );
}

/** Rows separated by inset hairlines, iOS table style. */
export function List({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("divide-y divide-border [&>*]:ml-0", className)}>{children}</div>;
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const buttonStyles: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-fg active:opacity-80",
  secondary: "bg-accent-soft text-accent active:opacity-70",
  ghost: "text-accent active:opacity-60",
  danger: "bg-danger-soft text-danger active:opacity-70",
};

export function buttonClass(variant: ButtonVariant = "primary", size: "md" | "sm" | "lg" = "md", block = false) {
  return cx(
    "inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition disabled:opacity-50",
    size === "lg" && "h-[50px] px-5 text-[17px]",
    size === "md" && "h-11 px-4 text-[16px]",
    size === "sm" && "h-8 px-3 text-[14px]",
    block && "w-full",
    buttonStyles[variant],
  );
}

export function Button({
  variant = "primary",
  size = "md",
  block,
  className,
  ...rest
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: "md" | "sm" | "lg"; block?: boolean }) {
  return <button className={cx(buttonClass(variant, size, block), className)} {...rest} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  block,
  className,
  ...rest
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: "md" | "sm" | "lg"; block?: boolean }) {
  return <Link className={cx(buttonClass(variant, size, block), className)} {...rest} />;
}

export const inputClass =
  "block w-full rounded-xl bg-field px-3.5 h-11 text-[16px] text-fg placeholder:text-faint outline-none focus:ring-2 focus:ring-accent/60";

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[14px] font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[13px] text-muted">{hint}</span>}
    </label>
  );
}

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={cx(inputClass, props.className)} />;
}

export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={cx(inputClass, "appearance-none pr-8", props.className)} />;
}

export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea {...props} className={cx(inputClass, "h-auto min-h-20 py-2.5", props.className)} />;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" | "warn" | "danger" | "pr" }) {
  const tones = {
    neutral: "bg-field text-muted",
    accent: "bg-accent-soft text-accent",
    warn: "bg-warn-soft text-warn",
    danger: "bg-danger-soft text-danger",
    pr: "bg-pr-soft text-pr",
  };
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold", tones[tone])}>{children}</span>;
}

export function EmptyState({ title, body, action }: { title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="px-6 py-8 text-center">
      <p className="text-[16px] font-semibold">{title}</p>
      {body && <p className="mt-1 text-[14px] text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Notice({ tone = "neutral", children }: { tone?: "neutral" | "warn" | "danger" | "accent"; children: ReactNode }) {
  const tones = {
    neutral: "bg-field text-fg",
    warn: "bg-warn-soft text-warn",
    danger: "bg-danger-soft text-danger",
    accent: "bg-accent-soft text-accent",
  };
  return <div className={cx("rounded-xl px-3.5 py-2.5 text-[14px]", tones[tone])}>{children}</div>;
}
