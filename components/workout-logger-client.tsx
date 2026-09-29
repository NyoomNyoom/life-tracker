"use client";

import dynamic from "next/dynamic";

// The logger reads its draft from localStorage on first render, so it only renders in the browser.
export const WorkoutLoggerClient = dynamic(() => import("./workout-logger").then((m) => m.WorkoutLogger), {
  ssr: false,
  loading: () => <p className="p-10 text-center text-[15px] text-muted">Loading workout…</p>,
});
