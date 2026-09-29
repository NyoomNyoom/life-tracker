"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Plus, X } from "lucide-react";
import { formatDuration } from "@/lib/dates";
import type { ExerciseLite } from "@/lib/exercises";
import { createClient } from "@/lib/supabase/client";
import { ExercisePicker } from "./exercise-picker";
import { FormError } from "./form-controls";
import { Button, Field, Input, Textarea, cx, inputClasses } from "./ui";

export type RoutineItem = { key: string; exercise: ExerciseLite; target_sets: number; target_reps: number | null; rest_seconds: number };

const REST = [0, 30, 45, 60, 90, 120, 150, 180, 240, 300];

export function RoutineEditor({
  userId,
  exercises: initialExercises,
  initial,
}: {
  userId: string;
  exercises: ExerciseLite[];
  initial?: { id: string; name: string; notes: string | null; items: RoutineItem[] };
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [items, setItems] = useState<RoutineItem[]>(initial?.items ?? []);
  const [exercises, setExercises] = useState(initialExercises);
  const [picker, setPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function patch(key: string, p: Partial<RoutineItem>) {
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...p } : i)));
  }

  function move(index: number, dir: -1 | 1) {
    setItems((list) => {
      const to = index + dir;
      if (to < 0 || to >= list.length) return list;
      const next = [...list];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
  }

  async function save() {
    if (!name.trim()) return setError("Give the routine a name.");
    if (items.length === 0) return setError("Add at least one exercise.");
    setBusy(true);
    setError(null);
    const { error } = await createClient().rpc("save_routine", {
      p_routine: { id: initial?.id ?? null, name: name.trim(), notes },
      p_exercises: items.map((i) => ({
        exercise_id: i.exercise.id,
        target_sets: i.target_sets,
        target_reps: i.target_reps,
        rest_seconds: i.rest_seconds,
      })),
    });
    setBusy(false);
    if (error) return setError(error.message);
    router.push("/workouts");
    router.refresh();
  }

  return (
    <div className="space-y-2.5 px-3">
      <div className="space-y-4 rounded-tile bg-training p-5 text-training-ink">
        <Field label="Name">
          <Input onTile strong value={name} onChange={(e) => setName(e.target.value)} placeholder="Push Day" maxLength={60} />
        </Field>
        <Field label="Notes">
          <Textarea onTile value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" maxLength={1000} />
        </Field>
      </div>

      {items.map((item, index) => (
        <div key={item.key} className="rounded-tile bg-card p-5">
          <div className="flex items-center gap-1">
            <h3 className="min-w-0 flex-1 truncate text-[21px] font-extrabold tracking-tight">{item.exercise.name}</h3>
            <button type="button" onClick={() => move(index, -1)} className="flex size-10 items-center justify-center rounded-full active:bg-field" aria-label="Move up">
              <ArrowUp className="size-5" />
            </button>
            <button type="button" onClick={() => move(index, 1)} className="flex size-10 items-center justify-center rounded-full active:bg-field" aria-label="Move down">
              <ArrowDown className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => setItems((l) => l.filter((i) => i.key !== item.key))}
              className="-mr-2 flex size-10 items-center justify-center rounded-full text-danger active:bg-danger-soft"
              aria-label={`Remove ${item.exercise.name}`}
            >
              <X className="size-5" strokeWidth={2.5} />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Label text="Sets">
              <input
                inputMode="numeric"
                value={String(item.target_sets)}
                onChange={(e) => patch(item.key, { target_sets: Math.min(20, Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1)) })}
                className={cx(inputClasses({ size: "lg", strong: true }), "text-center")}
              />
            </Label>
            <Label text="Target reps">
              <input
                inputMode="numeric"
                placeholder="—"
                value={item.target_reps ?? ""}
                onChange={(e) => {
                  const n = Number(e.target.value.replace(/\D/g, ""));
                  patch(item.key, { target_reps: n > 0 ? Math.min(100, n) : null });
                }}
                className={cx(inputClasses({ size: "lg", strong: true }), "text-center")}
              />
            </Label>
            <Label text="Rest">
              <span className="relative block">
                <select
                  value={item.rest_seconds}
                  onChange={(e) => patch(item.key, { rest_seconds: Number(e.target.value) })}
                  className={cx(inputClasses({ size: "lg", strong: true }), "appearance-none pr-8")}
                >
                  {REST.map((s) => (
                    <option key={s} value={s}>
                      {s === 0 ? "None" : formatDuration(s)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" aria-hidden />
              </span>
            </Label>
          </div>
        </div>
      ))}

      <Button type="button" variant="white" size="xl" block onClick={() => setPicker(true)}>
        <Plus className="size-6" aria-hidden /> Add exercise
      </Button>
      <FormError message={error} />
      <Button type="button" size="xl" block onClick={save} disabled={busy}>
        {busy ? "Saving…" : "Save routine"}
      </Button>

      <ExercisePicker
        open={picker}
        onClose={() => setPicker(false)}
        exercises={exercises}
        userId={userId}
        onCreated={(e) => setExercises((l) => [...l, e])}
        onPick={(exercise) =>
          setItems((l) => [
            ...l,
            {
              key: crypto.randomUUID(),
              exercise,
              target_sets: exercise.kind === "weight_reps" || exercise.kind === "bodyweight_reps" ? 3 : 1,
              target_reps: exercise.kind === "weight_reps" ? 8 : null,
              rest_seconds: 90,
            },
          ])
        }
      />
    </div>
  );
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[14px] font-semibold text-muted">{text}</span>
      {children}
    </label>
  );
}
