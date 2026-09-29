"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ChevronRight, CloudOff } from "lucide-react";
import { BarbellIcon } from "./icons";
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
      className={`mx-3 mb-2.5 flex min-h-16 items-center gap-3.5 rounded-full py-3 pr-5 pl-6 active:opacity-85 ${draft.pendingSync ? "bg-todos text-ink" : "bg-ink text-todos"}`}
    >
      {draft.pendingSync ? <CloudOff className="size-6 shrink-0" aria-hidden /> : <BarbellIcon className="size-6 shrink-0" aria-hidden />}
      <span className="flex-1 text-[17px] leading-snug font-bold">
        {draft.pendingSync ? `“${draft.name}” is waiting to upload. Tap to retry.` : `“${draft.name}” in progress. Tap to resume.`}
      </span>
      <ChevronRight className="size-6 shrink-0" aria-hidden />
    </Link>
  );
}
