"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Smartphone, X } from "lucide-react";

const KEY = "lt:install-hint-dismissed";
const noop = () => () => {};

function shouldShow(): boolean {
  try {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    return ios && !standalone && localStorage.getItem(KEY) !== "1";
  } catch {
    return false;
  }
}

/** On iPhone Safari (not yet installed), nudges the user to add the app to the Home Screen. */
export function InstallHint() {
  const show = useSyncExternalStore(noop, shouldShow, () => false);
  if (!show) return null;
  return (
    <div className="mx-3 mb-2.5 flex items-center gap-3 rounded-[22px] bg-card py-3 pr-3 pl-5">
      <Smartphone className="size-5 shrink-0" aria-hidden />
      <Link href="/welcome" className="flex-1 text-[15px] leading-snug font-semibold">
        Add Tracker to your Home Screen for notifications and a full-screen app.
      </Link>
      <button
        type="button"
        aria-label="Dismiss"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-field"
        onClick={(e) => {
          try {
            localStorage.setItem(KEY, "1");
          } catch {}
          (e.currentTarget.parentElement as HTMLElement).style.display = "none";
        }}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
