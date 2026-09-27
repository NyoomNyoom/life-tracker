"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { CloudOff, Dumbbell } from "lucide-react";
import { draftStorageKey, type WorkoutDraft } from "@/lib/workout-draft";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("focus", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("focus", callback);
  };
}

/** Shows a "resume" banner when a workout is in progress (or waiting to upload) on this phone. */
export function PendingWorkoutBanner({ userId }: { userId: string }) {
  const key = draftStorageKey(userId);
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null,
  );
  if (!raw) return null;
  let draft: WorkoutDraft;
  try {
    draft = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!draft.exercises?.length && !draft.pendingSync) return null;

  return (
    <Link
      href="/workouts/new"
      className={`mx-4 mb-4 flex items-center gap-3 rounded-2xl px-4 py-3 ${draft.pendingSync ? "bg-warn-soft text-warn" : "bg-accent text-accent-fg"}`}
    >
      {draft.pendingSync ? <CloudOff className="size-5 shrink-0" aria-hidden /> : <Dumbbell className="size-5 shrink-0" aria-hidden />}
      <span className="flex-1 text-[15px] font-semibold">
        {draft.pendingSync ? `“${draft.name}” is waiting to upload. Tap to retry.` : `“${draft.name}” in progress. Tap to resume.`}
      </span>
    </Link>
  );
}
