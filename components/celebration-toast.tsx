"use client";

import { useEffect } from "react";
import { Celebration } from "./celebration";

/** Floating celebration shown after an action earns something; dismisses itself. */
export function CelebrationToast({ keys, onDone }: { keys: string[]; onDone: () => void }) {
  useEffect(() => {
    if (keys.length === 0) return;
    const t = window.setTimeout(onDone, 6000);
    return () => window.clearTimeout(t);
  }, [keys, onDone]);
  if (keys.length === 0) return null;
  return (
    <div className="fixed inset-x-0 top-[calc(env(safe-area-inset-top)+8px)] z-50 mx-auto max-w-xl px-3" onClick={onDone}>
      <div className="rounded-tile shadow-[0_16px_40px_rgba(23,21,15,0.3)]">
        <Celebration keys={keys} floating />
      </div>
    </div>
  );
}
