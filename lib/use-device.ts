"use client";

import { useSyncExternalStore } from "react";
import type { Unit } from "./units";

// Device facts read after hydration (the server renders the fallback), so server and client HTML match.

const noopSubscribe = () => () => {};
const EMPTY: string[] = [];
let zones: string[] | null = null;

export function useDeviceTimezone(): string | null {
  return useSyncExternalStore(noopSubscribe, () => Intl.DateTimeFormat().resolvedOptions().timeZone || null, () => null);
}

export function useDeviceUnit(): Unit {
  return useSyncExternalStore(noopSubscribe, () => (navigator.language === "en-US" ? "lb" : "kg"), () => "kg" as Unit);
}

export function useTimezones(): string[] {
  return useSyncExternalStore(
    noopSubscribe,
    () => (zones ??= typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : EMPTY),
    () => EMPTY,
  );
}
