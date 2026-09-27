"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { evaluateAchievements } from "@/lib/achievements-server";
import { getViewerOrNull } from "@/lib/viewer";

export async function deleteWorkout(formData: FormData) {
  const viewer = await getViewerOrNull();
  if (!viewer) redirect("/login");
  const id = z.uuid().safeParse(formData.get("id"));
  if (id.success) await viewer.supabase.from("workouts").delete().eq("id", id.data);
  revalidatePath("/", "layout");
  redirect("/workouts");
}

/** Called by the logger after a workout is saved: awards badges, checkpoints and medals. */
export async function afterWorkoutSaved(): Promise<string[]> {
  const viewer = await getViewerOrNull();
  if (!viewer) return [];
  const earned = await evaluateAchievements(viewer);
  revalidatePath("/", "layout");
  return earned;
}
