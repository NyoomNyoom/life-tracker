"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, ChevronDown, CloudOff, Ellipsis, Plus, Timer, Trash2, Trophy } from "lucide-react";
import { formatDuration } from "@/lib/dates";
import type { ExerciseLite } from "@/lib/exercises";
import { afterWorkoutSaved } from "@/app/(app)/workouts/actions";
import { createClient } from "@/lib/supabase/client";
import { EMPTY_BESTS, estimate1RM, type SetValues } from "@/lib/training";
import { formatWeight, type Unit } from "@/lib/units";
import {
  buildPayload,
  computePRs,
  distanceUnitLabel,
  emptySet,
  fillBlanks,
  hasInput,
  isLoggable,
  lacksDistance,
  newKey,
  parseSet,
  previousHint,
  toInputs,
  unreadableInput,
  type DraftExercise,
  type DraftSet,
  type ExerciseSnapshot,
  type WorkoutDraft,
} from "@/lib/workout-draft";
import { ExercisePicker } from "./exercise-picker";
import { FormError } from "./form-controls";
import { Button, Notice, buttonClass, cx } from "./ui";

type Props = {
  userId: string;
  unit: Unit;
  exercises: ExerciseLite[];
  initialDraft: WorkoutDraft;
  storageKey: string;
};

const REST_OPTIONS = [0, 30, 45, 60, 90, 120, 150, 180, 240, 300];

function loadStored(key: string): WorkoutDraft | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorkoutDraft;
    return parsed?.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

function startRest(seconds: number) {
  return { endsAt: Date.now() + seconds * 1000, total: seconds };
}

function isNetworkError(message: string) {
  return (typeof navigator !== "undefined" && !navigator.onLine) || /fetch|network|load failed|timed? ?out/i.test(message);
}

export function WorkoutLogger({ userId, unit, exercises: initialExercises, initialDraft, storageKey }: Props) {
  const router = useRouter();
  // Rendered client-only (see workout-logger-client.tsx), so reading localStorage here is safe.
  const [stored] = useState(() => loadStored(storageKey));
  const [draft, setDraft] = useState<WorkoutDraft>(() => stored ?? initialDraft);
  const [resumed, setResumed] = useState(() => stored != null && initialDraft.mode === "new" && stored.exercises.length > 0);
  const [exercises, setExercises] = useState(initialExercises);
  const [snapshots, setSnapshots] = useState<Record<string, ExerciseSnapshot | undefined>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [rest, setRest] = useState<{ endsAt: number; total: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const finished = useRef(false);
  const savingRef = useRef(false);
  const requested = useRef(new Set<string>());
  const audio = useRef<AudioContext | null>(null);

  // Persist every change so a reload, crash or dropped connection never loses sets.
  useEffect(() => {
    if (finished.current) return;
    try {
      if (draft.exercises.length > 0 || draft.pendingSync || draft.mode === "edit") {
        localStorage.setItem(storageKey, JSON.stringify({ ...draft, updatedAt: new Date().toISOString() }));
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch {
      // Storage full or disabled (private mode): the workout still works, just without the safety net.
    }
  }, [draft, storageKey]);

  // Fetch "last time" + personal bests for any exercise we haven't looked up yet.
  const exerciseIds = useMemo(() => [...new Set(draft.exercises.map((e) => e.exercise.id))], [draft.exercises]);
  useEffect(() => {
    const missing = exerciseIds.filter((id) => !requested.current.has(id));
    if (missing.length === 0) return;
    missing.forEach((id) => requested.current.add(id));
    createClient()
      .rpc("exercise_snapshot", { p_exercise_ids: missing, p_exclude_workout: draft.id })
      .then(({ data, error }) => {
        if (error || !data) {
          missing.forEach((id) => requested.current.delete(id));
          return;
        }
        setSnapshots((prev) => {
          const next = { ...prev };
          for (const id of missing) {
            const row = data.find((r) => r.exercise_id === id);
            next[id] = row
              ? {
                  hasHistory: true,
                  lastDate: row.last_date,
                  lastSets: ((row.last_sets as SetValues[] | null) ?? []).map((s) => ({
                    reps: s.reps,
                    weight_kg: s.weight_kg != null ? Number(s.weight_kg) : null,
                    duration_seconds: s.duration_seconds,
                    distance_m: s.distance_m != null ? Number(s.distance_m) : null,
                  })),
                  bests: {
                    weight_kg: row.best_weight_kg != null ? Number(row.best_weight_kg) : null,
                    e1rm_kg: row.best_e1rm_kg != null ? Number(row.best_e1rm_kg) : null,
                    reps: row.best_reps,
                    duration_seconds: row.best_duration_seconds,
                    distance_m: row.best_distance_m != null ? Number(row.best_distance_m) : null,
                  },
                }
              : { hasHistory: false, lastDate: null, lastSets: [], bests: EMPTY_BESTS };
          }
          return next;
        });
      });
  }, [exerciseIds, draft.id]);

  const prs = useMemo(() => computePRs(draft, snapshots, unit), [draft, snapshots, unit]);

  const update = useCallback((fn: (d: WorkoutDraft) => WorkoutDraft) => setDraft((d) => fn(d)), []);
  const updateExercise = useCallback(
    (key: string, fn: (e: DraftExercise) => DraftExercise) =>
      update((d) => ({ ...d, exercises: d.exercises.map((e) => (e.key === key ? fn(e) : e)) })),
    [update],
  );

  function addExercise(ex: ExerciseLite) {
    const count = ex.kind === "weight_reps" || ex.kind === "bodyweight_reps" ? 3 : 1;
    update((d) => ({
      ...d,
      exercises: [
        ...d.exercises,
        { key: newKey(), exercise: ex, restSeconds: 90, targetReps: null, sets: Array.from({ length: count }, emptySet) },
      ],
    }));
  }

  function beep() {
    try {
      const ctx = audio.current;
      if (!ctx) return;
      [0, 0.25].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.25, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.2);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.2);
      });
    } catch {
      // Audio is a nice-to-have.
    }
  }

  function toggleDone(ex: DraftExercise, setIndex: number) {
    // Unlock audio during this tap so the rest-timer beep can play later (iOS requires a gesture).
    if (!audio.current && typeof window !== "undefined" && "AudioContext" in window) audio.current = new AudioContext();
    void audio.current?.resume();

    const set = ex.sets[setIndex];
    if (set.done) {
      updateExercise(ex.key, (e) => ({ ...e, sets: e.sets.map((s, i) => (i === setIndex ? { ...s, done: false } : s)) }));
      return;
    }

    // Ticking fills the blanks from the previous set in this session, else from the same set last
    // time (what the placeholders show), else the routine's target reps.
    const prevInSession = ex.sets.slice(0, setIndex).findLast((s) => hasInput(s));
    const lastTime = snapshots[ex.exercise.id]?.lastSets[setIndex] ?? snapshots[ex.exercise.id]?.lastSets.at(-1);
    const source = prevInSession ?? (lastTime ? toInputs(lastTime, unit) : { weight: "", reps: ex.targetReps ? String(ex.targetReps) : "", duration: "", distance: "" });
    const next: DraftSet = fillBlanks(ex.exercise.kind, set, source, unit);
    const unreadable = unreadableInput(ex.exercise.kind, next, unit);
    if (unreadable || !isLoggable(ex.exercise.kind, next, unit)) {
      setError(unreadable ?? (ex.exercise.kind === "weight_reps" ? "Enter the weight and reps first." : "Enter this set's numbers first."));
      return;
    }
    setError(null);
    updateExercise(ex.key, (e) => ({ ...e, sets: e.sets.map((s, i) => (i === setIndex ? { ...next, done: true } : s)) }));
    if (ex.restSeconds > 0) setRest(startRest(ex.restSeconds));
  }

  const upload = useCallback(
    async (d: WorkoutDraft) => {
      if (savingRef.current) return;
      savingRef.current = true;
      setSaving(true);
      const payload = buildPayload(d, unit, computePRs(d, snapshots, unit), d.endedAt);
      const { error } = await createClient().rpc("save_workout", { p_workout: payload.workout, p_sets: payload.sets });
      if (error) {
        savingRef.current = false;
        setSaving(false);
        if (isNetworkError(error.message)) {
          setOffline(true);
          return;
        }
        setOffline(false);
        setDraft((cur) => ({ ...cur, pendingSync: false }));
        setError(
          /jwt|not signed in|28000/i.test(`${error.message} ${error.code}`)
            ? "You've been signed out. Sign in again; this workout is kept on your phone."
            : `Couldn't save: ${error.message}`,
        );
        return;
      }
      finished.current = true;
      try {
        localStorage.removeItem(storageKey);
      } catch {}
      // Badges, checkpoints and medals are a bonus: never let them block leaving the logger.
      const earned = await afterWorkoutSaved().catch(() => [] as string[]);
      router.replace(`/workouts/${payload.workout.id}?saved=1${earned.length ? `&earned=${earned.join(",")}` : ""}`);
      router.refresh();
    },
    [router, snapshots, storageKey, unit],
  );

  // A finished-but-unsent workout retries when the connection comes back, and every 30s.
  useEffect(() => {
    if (!draft.pendingSync) return;
    const retry = () => void upload(draft);
    window.addEventListener("online", retry);
    const timer = window.setInterval(retry, 30_000);
    return () => {
      window.removeEventListener("online", retry);
      window.clearInterval(timer);
    };
  }, [draft, upload]);

  function finish() {
    // Sets are saved whether or not they're ticked, so check what can't be read before anything else.
    for (const e of draft.exercises) {
      const unreadable = e.sets.map((s) => unreadableInput(e.exercise.kind, s, unit)).find(Boolean);
      if (unreadable) {
        setError(`${e.exercise.name}: ${unreadable}`);
        return;
      }
    }
    const loggable = draft.exercises.reduce((n, e) => n + e.sets.filter((s) => isLoggable(e.exercise.kind, s, unit)).length, 0);
    if (loggable === 0 && !window.confirm("No sets logged. Save this as a gym visit anyway?")) return;
    const unticked = draft.exercises.reduce((n, e) => n + e.sets.filter((s) => !s.done && hasInput(s) && isLoggable(e.exercise.kind, s, unit)).length, 0);
    if (unticked > 0 && !window.confirm(`${unticked} set${unticked === 1 ? " has" : "s have"} numbers but aren't ticked. They'll be saved too. Finish?`)) return;
    // Only for exercises you usually log a distance for: an elliptical session is often time only.
    const noDistance = [
      ...new Set(
        draft.exercises
          .filter((e) => snapshots[e.exercise.id]?.bests.distance_m != null && e.sets.some((s) => lacksDistance(e.exercise.kind, s, unit)))
          .map((e) => e.exercise.name),
      ),
    ];
    if (
      noDistance.length > 0 &&
      !window.confirm(
        `${noDistance.join(", ")} ${noDistance.length === 1 ? "has" : "have"} a time but no distance, so ${noDistance.length === 1 ? "it won't" : "they won't"} count toward distance challenges. Finish anyway?`,
      )
    )
      return;
    const next = { ...draft, endedAt: draft.mode === "new" ? new Date().toISOString() : draft.endedAt, pendingSync: true };
    setDraft(next);
    void upload(next);
  }

  function discard() {
    const message = draft.mode === "new" ? "Discard this workout? Nothing will be saved." : "Discard your changes to this workout?";
    if (!window.confirm(message)) return;
    finished.current = true;
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    router.replace(draft.mode === "new" ? "/workouts" : `/workouts/${draft.id}`);
  }

  const doneSets = draft.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);

  return (
    <div className={rest ? "pb-24" : undefined}>
      <header className="px-5 pt-4 pb-4">
        <input
          value={draft.name}
          onChange={(e) => update((d) => ({ ...d, name: e.target.value }))}
          aria-label="Workout name"
          maxLength={80}
          className="display w-full bg-transparent text-[38px] outline-none"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[15px]">
          <input
            type="date"
            value={draft.date}
            onChange={(e) => e.target.value && update((d) => ({ ...d, date: e.target.value }))}
            aria-label="Workout date"
            className="h-11 rounded-full bg-card px-4 font-mono text-[15px] text-ink outline-none focus:ring-2 focus:ring-ink"
          />
          {draft.mode === "new" && (
            <span className="flex h-11 items-center rounded-full bg-training px-4 text-training-ink">
              <Elapsed since={draft.startedAt} />
            </span>
          )}
          <span className="flex h-11 items-center rounded-full bg-card px-4">
            {doneSets} set{doneSets === 1 ? "" : "s"} done
          </span>
        </div>
      </header>

      <div className="space-y-2.5 px-3 empty:hidden">
        {resumed && (
          <div className="flex items-center justify-between gap-3 rounded-[22px] bg-todos py-2.5 pr-2.5 pl-5 text-[16px] font-semibold">
            <span>Picked up your workout in progress.</span>
            <button type="button" className="h-11 shrink-0 rounded-full bg-ink px-5 text-[15px] font-bold text-white" onClick={() => setResumed(false)}>
              OK
            </button>
          </div>
        )}
        {draft.pendingSync && offline && (
          <Notice tone="warn">
            <span className="flex items-start gap-2">
              <CloudOff className="mt-0.5 size-5 shrink-0" aria-hidden />
              <span>No connection. Your workout is saved on this phone and will upload automatically when you&apos;re back online.</span>
            </span>
          </Notice>
        )}
        <FormError message={error} />
      </div>

      <div className="mt-2.5 space-y-2.5">
        {draft.exercises.map((ex, exIndex) => (
          <ExerciseCard
            key={ex.key}
            ex={ex}
            unit={unit}
            snapshot={snapshots[ex.exercise.id]}
            prs={prs}
            menuOpen={menuFor === ex.key}
            onToggleMenu={() => setMenuFor((m) => (m === ex.key ? null : ex.key))}
            onChangeSet={(i, patch) =>
              updateExercise(ex.key, (e) => ({ ...e, sets: e.sets.map((s, j) => (j === i ? { ...s, ...patch } : s)) }))
            }
            onToggleDone={(i) => toggleDone(ex, i)}
            onAddSet={() => updateExercise(ex.key, (e) => ({ ...e, sets: [...e.sets, emptySet()] }))}
            onRemoveSet={() => updateExercise(ex.key, (e) => ({ ...e, sets: e.sets.slice(0, -1) }))}
            onRest={(seconds) => updateExercise(ex.key, (e) => ({ ...e, restSeconds: seconds }))}
            onMove={(dir) =>
              update((d) => {
                const list = [...d.exercises];
                const to = exIndex + dir;
                if (to < 0 || to >= list.length) return d;
                [list[exIndex], list[to]] = [list[to], list[exIndex]];
                return { ...d, exercises: list };
              })
            }
            onRemove={() => {
              if (ex.sets.some((s) => s.done) && !window.confirm(`Remove ${ex.exercise.name} and its sets?`)) return;
              update((d) => ({ ...d, exercises: d.exercises.filter((e) => e.key !== ex.key) }));
            }}
          />
        ))}
      </div>

      <div className="mt-2.5 space-y-2.5 px-3">
        <Button type="button" size="xl" variant="bare" block onClick={() => setPickerOpen(true)} className="bg-training text-training-ink">
          <Plus className="size-6" aria-hidden /> Add exercise
        </Button>
        <textarea
          value={draft.notes}
          onChange={(e) => update((d) => ({ ...d, notes: e.target.value }))}
          placeholder="Notes (how it felt, what to change next time)"
          aria-label="Notes"
          maxLength={2000}
          className="block min-h-32 w-full rounded-[24px] border-2 border-transparent bg-card px-5 py-4 text-[17px] font-medium outline-none placeholder:text-faint focus:border-ink"
        />
        <Button type="button" size="xl" block onClick={finish} disabled={saving}>
          {saving ? "Saving…" : draft.pendingSync ? "Try saving again" : draft.mode === "new" ? "Finish workout" : "Save changes"}
        </Button>
        <button type="button" onClick={discard} className={cx(buttonClass("ghost", "md", true), "text-danger")}>
          {draft.mode === "new" ? "Discard workout" : "Discard changes"}
        </button>
      </div>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        exercises={exercises}
        userId={userId}
        onPick={addExercise}
        onCreated={(e) => setExercises((list) => [...list, e])}
      />

      {rest && <RestTimer rest={rest} onChange={setRest} onDone={beep} />}
    </div>
  );
}

function Elapsed({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  const minutes = Math.max(0, Math.floor((now - new Date(since).getTime()) / 60000));
  return <span>{minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`}</span>;
}

function ExerciseCard({
  ex,
  unit,
  snapshot,
  prs,
  menuOpen,
  onToggleMenu,
  onChangeSet,
  onToggleDone,
  onAddSet,
  onRemoveSet,
  onRest,
  onMove,
  onRemove,
}: {
  ex: DraftExercise;
  unit: Unit;
  snapshot: ExerciseSnapshot | undefined;
  prs: Set<string>;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onChangeSet: (index: number, patch: Partial<DraftSet>) => void;
  onToggleDone: (index: number) => void;
  onAddSet: () => void;
  onRemoveSet: () => void;
  onRest: (seconds: number) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const kind = ex.exercise.kind;
  const bestLine =
    snapshot?.hasHistory && kind === "weight_reps" && snapshot.bests.e1rm_kg
      ? `Best est. 1RM ${formatWeight(snapshot.bests.e1rm_kg, unit)}`
      : snapshot?.hasHistory && kind === "bodyweight_reps" && snapshot.bests.reps
        ? `Best ${snapshot.bests.reps} reps`
        : snapshot && !snapshot.hasHistory
          ? "First time: this session sets your baseline"
          : null;

  const columns =
    kind === "weight_reps"
      ? [unit, "Reps"]
      : kind === "bodyweight_reps"
        ? [`+${unit}`, "Reps"]
        : kind === "duration"
          ? ["Time"]
          : [distanceUnitLabel(unit), "Time"];

  return (
    <section className="mx-3 rounded-tile bg-card px-3 pt-5 pb-3">
      <div className="flex items-start gap-2 px-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-[23px] leading-tight font-extrabold tracking-tight">{ex.exercise.name}</h3>
          {bestLine && <p className="mt-0.5 text-[14px] font-medium text-muted">{bestLine}</p>}
        </div>
        <button
          type="button"
          onClick={onToggleMenu}
          aria-label={`Options for ${ex.exercise.name}`}
          aria-expanded={menuOpen}
          className={cx("-mt-1.5 -mr-1 flex size-11 items-center justify-center rounded-full", menuOpen ? "bg-field" : "text-muted")}
        >
          <Ellipsis className="size-6" />
        </button>
      </div>

      {menuOpen && (
        <div className="mt-3 flex items-center gap-2 rounded-full bg-field p-1.5">
          <label className="relative flex h-11 items-center gap-1.5 rounded-full bg-card pr-8 pl-3.5 text-[16px] font-bold">
            <Timer className="size-5 text-muted" aria-hidden />
            <span className="sr-only">Rest time</span>
            <select value={ex.restSeconds} onChange={(e) => onRest(Number(e.target.value))} className="appearance-none bg-transparent font-bold outline-none">
              {REST_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === 0 ? "Off" : formatDuration(s)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 size-4" aria-hidden />
          </label>
          <button type="button" onClick={() => onMove(-1)} className="flex size-11 items-center justify-center rounded-full bg-card" aria-label="Move up">
            <ArrowUp className="size-5" />
          </button>
          <button type="button" onClick={() => onMove(1)} className="flex size-11 items-center justify-center rounded-full bg-card" aria-label="Move down">
            <ArrowDown className="size-5" />
          </button>
          <button type="button" onClick={onRemove} className="ml-auto flex h-11 items-center gap-1.5 rounded-full bg-card px-4 text-[16px] font-bold text-danger">
            <Trash2 className="size-5" aria-hidden /> Remove
          </button>
        </div>
      )}

      <div className="mt-3">
        <div
          className="grid items-center gap-1.5 px-2 pb-1.5 font-mono text-[12px] tracking-[0.08em] text-muted uppercase"
          style={{ gridTemplateColumns: gridFor(columns.length) }}
        >
          <span className="text-center">Set</span>
          <span>Previous</span>
          {columns.map((c) => (
            <span key={c} className="text-center">
              {c}
            </span>
          ))}
          <span className="sr-only">Done</span>
        </div>
        <div className="space-y-1.5">
          {ex.sets.map((set, i) => {
            const prev = snapshot?.lastSets[i];
            const placeholder = prev ? toInputs(prev, unit) : { weight: "", reps: ex.targetReps ? String(ex.targetReps) : "", duration: "", distance: "" };
            const isPR = prs.has(set.key) && set.done;
            const workingIndex = ex.sets.slice(0, i + 1).filter((s) => !s.warmup).length;
            const tone = isPR ? "pr" : set.done ? "done" : "open";
            return (
              <div
                key={set.key}
                className={cx("grid items-center gap-1.5 rounded-[20px] px-2 py-1.5", tone === "pr" && "bg-todos", tone === "done" && "bg-done")}
                style={{ gridTemplateColumns: gridFor(columns.length) }}
              >
                <button
                  type="button"
                  onClick={() => onChangeSet(i, { warmup: !set.warmup })}
                  aria-label={set.warmup ? "Warm-up set (tap to make a working set)" : `Set ${workingIndex} (tap to mark as warm-up)`}
                  className={cx("flex h-11 items-center justify-center text-[18px] font-extrabold", set.warmup && "text-danger")}
                >
                  {isPR ? <Trophy className="size-5" aria-label="Personal record" /> : set.warmup ? "W" : workingIndex}
                </button>
                <span className="truncate font-mono text-[14px] text-muted">{previousHint(kind, prev, unit)}</span>
                {(kind === "weight_reps" || kind === "bodyweight_reps") && (
                  <>
                    <SetInput tone={tone} value={set.weight} placeholder={placeholder.weight || (kind === "bodyweight_reps" ? "0" : "")} inputMode="decimal" label="Weight" onChange={(v) => onChangeSet(i, { weight: v })} />
                    <SetInput tone={tone} value={set.reps} placeholder={placeholder.reps} inputMode="numeric" label="Reps" onChange={(v) => onChangeSet(i, { reps: v.replace(/\D/g, "") })} />
                  </>
                )}
                {kind === "duration" && (
                  <SetInput tone={tone} value={set.duration} placeholder={placeholder.duration || "m:ss"} inputMode="text" label="Time" onChange={(v) => onChangeSet(i, { duration: v })} />
                )}
                {kind === "distance_time" && (
                  <>
                    <SetInput tone={tone} value={set.distance} placeholder={placeholder.distance} inputMode="decimal" label="Distance" onChange={(v) => onChangeSet(i, { distance: v })} />
                    <SetInput tone={tone} value={set.duration} placeholder={placeholder.duration || "m:ss"} inputMode="text" label="Time" onChange={(v) => onChangeSet(i, { duration: v })} />
                  </>
                )}
                <button
                  type="button"
                  onClick={() => onToggleDone(i)}
                  aria-pressed={set.done}
                  aria-label={set.done ? "Mark set not done" : "Mark set done"}
                  className={cx(
                    "flex h-11 w-full items-center justify-center rounded-[14px] transition active:scale-95",
                    tone === "pr" ? "bg-ink text-todos" : tone === "done" ? "bg-done-ink text-done" : "border-2 border-ink bg-card text-ink",
                  )}
                >
                  <Check className="size-5" strokeWidth={3} />
                </button>
              </div>
            );
          })}
        </div>
        {ex.sets.length > 0 && <SetSummary kind={kind} sets={ex.sets} unit={unit} />}
        <div className="flex gap-2 pt-3">
          <button type="button" onClick={onAddSet} className="h-12 flex-1 rounded-full bg-field text-[16px] font-bold active:opacity-80">
            + Add set
          </button>
          {ex.sets.length > 0 && (
            <button type="button" onClick={onRemoveSet} className="h-12 rounded-full bg-field px-5 text-[16px] font-bold text-muted active:opacity-80" aria-label="Remove last set">
              − Set
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function gridFor(inputColumns: number) {
  return inputColumns === 2
    ? "2rem minmax(3rem,1fr) minmax(0,1.15fr) minmax(0,0.85fr) 2.75rem"
    : "2rem minmax(3rem,1fr) minmax(0,1.6fr) 2.75rem";
}

/** One-line recap of the best working set so far, e.g. "Top set 82.5 kg × 5 · est. 1RM 96 kg". */
function SetSummary({ kind, sets, unit }: { kind: DraftExercise["exercise"]["kind"]; sets: DraftSet[]; unit: Unit }) {
  if (kind !== "weight_reps") return null;
  const done = sets.filter((s) => s.done && !s.warmup).map((s) => parseSet(s, unit));
  const best = done.reduce<{ v: SetValues; e: number } | null>((acc, v) => {
    const e = estimate1RM(v.weight_kg, v.reps) ?? 0;
    return !acc || e > acc.e ? { v, e } : acc;
  }, null);
  if (!best || best.e === 0) return null;
  return (
    <p className="px-2 pt-2.5 text-[14px] font-medium text-muted">
      Top set {formatWeight(best.v.weight_kg ?? 0, unit)} × {best.v.reps} · est. 1RM {formatWeight(best.e, unit)}
    </p>
  );
}

function SetInput({
  value,
  placeholder,
  inputMode,
  label,
  tone,
  onChange,
}: {
  value: string;
  placeholder: string;
  inputMode: "decimal" | "numeric" | "text";
  label: string;
  tone: "open" | "done" | "pr";
  onChange: (v: string) => void;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      inputMode={inputMode}
      aria-label={label}
      autoComplete="off"
      onChange={(e) => onChange(e.target.value)}
      onFocus={(e) => e.target.select()}
      className={cx(
        "h-11 w-full min-w-0 rounded-[14px] border-2 border-transparent px-1 text-center text-[18px] font-extrabold outline-none placeholder:font-semibold placeholder:text-faint focus:border-ink",
        tone === "open" ? "bg-field" : "bg-white/55",
      )}
    />
  );
}

function RestTimer({
  rest,
  onChange,
  onDone,
}: {
  rest: { endsAt: number; total: number };
  onChange: (r: { endsAt: number; total: number } | null) => void;
  onDone: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const fired = useRef(false);
  const remaining = Math.ceil((rest.endsAt - now) / 1000);

  useEffect(() => {
    fired.current = false;
  }, [rest.endsAt]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (remaining <= 0 && !fired.current) {
      fired.current = true;
      onDone();
      const hide = window.setTimeout(() => onChange(null), 4000);
      return () => window.clearTimeout(hide);
    }
  }, [remaining, onDone, onChange]);

  const pct = Math.max(0, Math.min(1, remaining / rest.total));
  return (
    <div className="fixed inset-x-3 bottom-[calc(var(--tabbar-bottom)+var(--tabbar-h)+10px)] z-30 mx-auto max-w-[552px]">
      <div className="overflow-hidden rounded-[26px] bg-ink text-white shadow-[0_10px_30px_rgba(23,21,15,0.25)]">
        <div className="h-1.5 bg-white/15">
          <div className="h-full bg-training transition-[width] duration-200" style={{ width: `${pct * 100}%` }} />
        </div>
        <div className="flex items-center gap-2 py-2.5 pr-2.5 pl-4">
          <Timer className="size-6 text-training" aria-hidden />
          <span className="flex-1 text-[28px] font-extrabold tracking-tight" role="timer" aria-live="off">
            {remaining > 0 ? formatDuration(remaining) : "Rest done"}
          </span>
          <button type="button" className="h-11 rounded-full bg-white/15 px-4 text-[16px] font-bold" onClick={() => onChange({ ...rest, endsAt: rest.endsAt - 15_000 })}>
            −15
          </button>
          <button
            type="button"
            className="h-11 rounded-full bg-white/15 px-4 text-[16px] font-bold"
            onClick={() => onChange({ endsAt: Math.max(rest.endsAt, Date.now()) + 15_000, total: rest.total + 15 })}
          >
            +15
          </button>
          <button type="button" className="h-11 rounded-full bg-training px-4 text-[16px] font-bold text-training-ink" onClick={() => onChange(null)}>
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
