"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { KINDS, MUSCLE_GROUPS, muscleLabel, type ExerciseLite, EXERCISE_COLUMNS } from "@/lib/exercises";
import { createClient } from "@/lib/supabase/client";
import type { ExerciseKind } from "@/lib/training";
import { FormError, Sheet } from "./form-controls";
import { Badge, Button, Field, Input, Select, cx } from "./ui";

/** Searchable exercise list in a sheet, with inline creation of custom exercises. */
export function ExercisePicker({
  open,
  onClose,
  exercises,
  userId,
  onPick,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  exercises: ExerciseLite[];
  userId: string;
  onPick: (exercise: ExerciseLite) => void;
  onCreated: (exercise: ExerciseLite) => void;
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises
      .filter((e) => (!group || e.muscle_group === group) && (!q || e.name.toLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [exercises, query, group]);

  function pick(e: ExerciseLite) {
    onPick(e);
    setQuery("");
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Add exercise">
      <div className="sticky top-0 z-10 space-y-2.5 bg-ground px-3 pb-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-muted" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises"
            aria-label="Search exercises"
            className="block h-14 w-full rounded-full border-2 border-transparent bg-card pr-5 pl-13 text-[17px] font-medium outline-none placeholder:text-faint focus:border-ink"
          />
        </div>
        <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-0.5">
          {[{ value: null as string | null, label: "All" }, ...MUSCLE_GROUPS].map((g) => (
            <button
              key={g.label}
              type="button"
              onClick={() => setGroup(g.value)}
              className={cx("h-10 shrink-0 rounded-full px-4 text-[15px] font-bold", group === g.value ? "bg-ink text-white" : "bg-card text-ink")}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 pb-6">
        {creating ? (
          <CreateExerciseForm
            userId={userId}
            initialName={query}
            initialGroup={group ?? "other"}
            onCancel={() => setCreating(false)}
            onCreated={(e) => {
              onCreated(e);
              setCreating(false);
              pick(e);
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="mb-2.5 flex h-16 w-full items-center gap-3 rounded-full bg-training px-6 text-left text-[19px] font-extrabold text-training-ink active:opacity-85"
          >
            <Plus className="size-6" aria-hidden /> Create {query.trim() ? `“${query.trim()}”` : "a custom exercise"}
          </button>
        )}

        <ul className="divide-y divide-line rounded-[24px] bg-card px-5">
          {filtered.map((e) => (
            <li key={e.id}>
              <button type="button" onClick={() => pick(e)} className="flex min-h-16 w-full items-center gap-3 py-3 text-left active:opacity-70">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[18px] font-bold">{e.name}</span>
                  <span className="block text-[15px] font-medium text-muted">{muscleLabel(e.muscle_group)}</span>
                </span>
                {e.user_id && <Badge>Custom</Badge>}
              </button>
            </li>
          ))}
          {filtered.length === 0 && <li className="py-8 text-center text-[15px] font-medium text-muted">No matches. Create it above.</li>}
        </ul>
      </div>
    </Sheet>
  );
}

function CreateExerciseForm({
  userId,
  initialName,
  initialGroup,
  onCancel,
  onCreated,
}: {
  userId: string;
  initialName: string;
  initialGroup: string;
  onCancel: () => void;
  onCreated: (e: ExerciseLite) => void;
}) {
  const [name, setName] = useState(initialName.trim());
  const [group, setGroup] = useState(initialGroup);
  const [kind, setKind] = useState<ExerciseKind>(initialGroup === "cardio" ? "distance_time" : "weight_reps");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!name.trim()) return setError("Give it a name.");
    setBusy(true);
    setError(null);
    const { data, error } = await createClient()
      .from("exercises")
      .insert({ user_id: userId, name: name.trim(), muscle_group: group, kind })
      .select(EXERCISE_COLUMNS)
      .single();
    setBusy(false);
    if (error) {
      setError(error.code === "23505" ? "You already have an exercise with that name." : error.message);
      return;
    }
    onCreated(data as ExerciseLite);
  }

  return (
    <div className="mb-2.5 space-y-4 rounded-tile bg-card p-5">
      <Field label="Name">
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus />
      </Field>
      <Field label="Muscle group">
        <Select value={group} onChange={(e) => setGroup(e.target.value)}>
          {MUSCLE_GROUPS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="What you record" hint={KINDS.find((k) => k.value === kind)?.hint}>
        <Select value={kind} onChange={(e) => setKind(e.target.value as ExerciseKind)}>
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </Select>
      </Field>
      <FormError message={error} />
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="button" onClick={save} disabled={busy} className="flex-1">
          {busy ? "Saving…" : "Create"}
        </Button>
      </div>
    </div>
  );
}
