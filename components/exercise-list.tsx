"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { MUSCLE_GROUPS, type ExerciseLite } from "@/lib/exercises";
import { Badge, GroupLabel } from "./ui";

export function ExerciseList({ exercises, used }: { exercises: ExerciseLite[]; used: Record<string, number> }) {
  const [query, setQuery] = useState("");
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matching = exercises.filter((e) => !q || e.name.toLowerCase().includes(q));
    return MUSCLE_GROUPS.map((g) => ({
      ...g,
      items: matching
        .filter((e) => e.muscle_group === g.value)
        // Exercises you've actually done first, then alphabetical.
        .sort((a, b) => (used[b.id] ?? 0) - (used[a.id] ?? 0) || a.name.localeCompare(b.name)),
    })).filter((g) => g.items.length > 0);
  }, [exercises, used, query]);

  return (
    <div>
      <div className="relative mx-3 mb-1">
        <Search className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-muted" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          aria-label="Search exercises"
          className="block h-14 w-full rounded-full border-2 border-transparent bg-card pr-5 pl-13 text-[17px] font-medium outline-none placeholder:text-faint focus:border-ink"
        />
      </div>
      {groups.map((g) => (
        <section key={g.value}>
          <GroupLabel>{g.label}</GroupLabel>
          <ul className="mx-3 rounded-[24px] bg-card px-5 py-1.5">
            {g.items.map((e) => (
              <li key={e.id}>
                <Link href={`/exercises/${e.id}`} className="flex min-h-14 items-center gap-3 py-2 active:opacity-70">
                  <span className="min-w-0 flex-1 truncate text-[18px] font-bold">{e.name}</span>
                  {e.user_id && <Badge>Custom</Badge>}
                  {used[e.id] ? <span className="font-mono text-[15px] text-muted">{used[e.id]}×</span> : null}
                  <ChevronRight className="size-5 text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {groups.length === 0 && <p className="px-5 py-10 text-center text-[16px] font-medium text-muted">No exercises match “{query}”.</p>}
      <p className="mx-5 mt-5 text-center text-[15px] font-medium text-muted">Add your own exercises from the workout logger or a routine.</p>
    </div>
  );
}
