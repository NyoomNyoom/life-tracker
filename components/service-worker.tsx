"use client";

import { useEffect } from "react";

/** Registers /sw.js, which handles push notifications and the offline fallback page. */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((err) => {
      console.warn("Service worker registration failed", err);
    });
  }, []);
  return null;
}
