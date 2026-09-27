import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { todayIn } from "./dates";
import { createClient } from "./supabase/server";
import type { Tables } from "./supabase/database.types";
import type { Unit } from "./units";

export type Profile = Tables<"profiles"> & { unit: Unit };

async function loadViewer() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (!profile) return null;
  return {
    supabase,
    userId,
    profile: profile as Profile,
    unit: profile.unit as Unit,
    today: todayIn(profile.timezone),
  };
}

/** The signed-in user, their profile and "today" in their timezone. Cached per request. */
export const getViewer = cache(async () => {
  const viewer = await loadViewer();
  if (!viewer) redirect("/login");
  return viewer;
});

/** For server actions: same as getViewer but returns null instead of redirecting. */
export const getViewerOrNull = cache(loadViewer);

export type Viewer = NonNullable<Awaited<ReturnType<typeof loadViewer>>>;

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string } | null;
