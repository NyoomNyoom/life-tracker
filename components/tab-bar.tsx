"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Ellipsis, House, ListChecks } from "lucide-react";
import { BarbellIcon, ScaleIcon } from "./icons";
import { cx } from "./ui";

const TABS = [
  { href: "/", label: "Today", icon: House, match: (p: string) => p === "/" },
  { href: "/workouts", label: "Train", icon: BarbellIcon, match: (p: string) => /^\/(workouts|routines|exercises|challenges)/.test(p) },
  { href: "/weight", label: "Weight", icon: ScaleIcon, match: (p: string) => p.startsWith("/weight") },
  { href: "/todos", label: "To-dos", icon: ListChecks, match: (p: string) => p.startsWith("/todos") },
  { href: "/more", label: "More", icon: Ellipsis, match: (p: string) => /^\/(more|settings|reminders|teeth|achievements)/.test(p) },
];

/**
 * Floating ink bar. The active tab is the one butter pill with a label; the rest are icons.
 * The pill moves the moment a tab is tapped, before the new page arrives from the server.
 */
export function TabBar() {
  const pathname = usePathname();
  // The tab tapped from this path. Once navigation lands the path changes and this no longer applies.
  const [pending, setPending] = useState<{ href: string; from: string } | null>(null);
  const pendingHref = pending?.from === pathname ? pending.href : null;
  return (
    <nav className="fixed inset-x-4 bottom-[var(--tabbar-bottom)] z-40 mx-auto max-w-[540px]" aria-label="Main">
      <ul className="flex h-[var(--tabbar-h)] items-center gap-1 rounded-full bg-ink p-2 shadow-[0_10px_30px_rgba(23,21,15,0.22)]">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = pendingHref ? pendingHref === href : match(pathname);
          return (
            <li key={href} className={cx("flex h-full", active ? "flex-[2.2]" : "flex-1")}>
              <Link
                href={href}
                // Tabs are fully prefetched, so a tap shows the real page from the client cache.
                prefetch
                aria-current={active && !pendingHref ? "page" : undefined}
                data-pending={pendingHref === href || undefined}
                aria-label={label}
                onNavigate={() => setPending({ href, from: pathname })}
                className={cx(
                  "flex w-full items-center justify-center gap-2 rounded-full text-[17px] font-bold transition-colors",
                  active ? "bg-todos text-ink" : "text-ground/85 active:text-white",
                )}
              >
                <Icon className="size-6 shrink-0" strokeWidth={2} aria-hidden />
                {active && <span className="truncate">{label}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
