"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, Ellipsis, House, ListChecks, Scale } from "lucide-react";
import { cx } from "./ui";

const TABS = [
  { href: "/", label: "Today", icon: House, match: (p: string) => p === "/" },
  { href: "/workouts", label: "Train", icon: Dumbbell, match: (p: string) => /^\/(workouts|routines|exercises|challenges)/.test(p) },
  { href: "/weight", label: "Weight", icon: Scale, match: (p: string) => p.startsWith("/weight") },
  { href: "/todos", label: "To-dos", icon: ListChecks, match: (p: string) => p.startsWith("/todos") },
  { href: "/more", label: "More", icon: Ellipsis, match: (p: string) => /^\/(more|settings|reminders|teeth|achievements)/.test(p) },
];

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/85 pb-safe backdrop-blur-xl"
      aria-label="Main"
    >
      <ul className="mx-auto flex max-w-xl">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cx("flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[10.5px] font-medium", active ? "text-accent" : "text-faint")}
              >
                <Icon className="size-6" strokeWidth={active ? 2.3 : 1.8} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
