"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { MUSCLE_GROUPS, type ExerciseLite } from "@/lib/exercises";
import { Badge, Input } from "./ui";

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
      <div className="relative mx-4 mb-4">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" aria-hidden />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" aria-label="Search exercises" className="bg-card pl-9" />
      </div>
      {groups.map((g) => (
        <section key={g.value} className="mb-4">
          <h2 className="mx-8 mb-1.5 text-[13px] font-medium tracking-wide text-muted uppercase">{g.label}</h2>
          <ul className="mx-4 divide-y divide-border overflow-hidden rounded-2xl bg-card">
            {g.items.map((e) => (
              <li key={e.id}>
                <Link href={`/exercises/${e.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-card-pressed">
                  <span className="min-w-0 flex-1 truncate text-[16px]">{e.name}</span>
                  {e.user_id && <Badge>Custom</Badge>}
                  {used[e.id] ? <span className="text-[13px] text-muted">{used[e.id]}×</span> : null}
                  <ChevronRight className="size-4 text-faint" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {groups.length === 0 && <p className="px-4 py-10 text-center text-muted">No exercises match “{query}”.</p>}
      <p className="mx-4 mt-2 text-center text-[13px] text-muted">Add your own exercises from the workout logger or a routine.</p>
    </div>
  );
}
