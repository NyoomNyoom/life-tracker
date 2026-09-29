"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addDays } from "@/lib/dates";
import { formatWeight, parseWeightInput } from "@/lib/units";
import { getViewerOrNull, type ActionResult } from "@/lib/viewer";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date.");

export async function logWeight(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const viewer = await getViewerOrNull();
  if (!viewer) return { ok: false, error: "You've been signed out. Sign in again." };

  const kg = parseWeightInput(String(formData.get("weight") ?? ""), viewer.unit);
  if (kg == null || kg <= 0 || kg >= 1000) return { ok: false, error: "Enter your weight." };

  const date = isoDate.safeParse(formData.get("date") || viewer.today);
  if (!date.success) return { ok: false, error: date.error.issues[0].message };
  if (date.data > addDays(viewer.today, 1)) return { ok: false, error: "That date is in the future." };

  const note = String(formData.get("note") ?? "").trim().slice(0, 500) || null;

  // One entry per day: logging again for the same date replaces it.
  const { error } = await viewer.supabase
    .from("weight_entries")
    .upsert({ user_id: viewer.userId, entry_date: date.data, weight_kg: kg, note }, { onConflict: "user_id,entry_date" });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true, message: `Saved ${formatWeight(kg, viewer.unit)}` };
}

export async function deleteWeight(formData: FormData) {
  const viewer = await getViewerOrNull();
  if (!viewer) return;
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  await viewer.supabase.from("weight_entries").delete().eq("id", id.data);
  revalidatePath("/", "layout");
}
