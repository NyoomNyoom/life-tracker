"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { evaluateAchievements } from "@/lib/achievements-server";
import { getChallenge, QUICK_ACTIVITIES } from "@/lib/challenges";
import { addDays, parseOutingDuration } from "@/lib/dates";
import { getViewerOrNull } from "@/lib/viewer";

export async function joinChallenge(formData: FormData) {
  const viewer = await getViewerOrNull();
  if (!viewer) redirect("/login");
  const challenge = getChallenge(String(formData.get("slug") ?? ""));
  if (!challenge) redirect("/challenges");
  await viewer.supabase
    .from("challenge_entries")
    .upsert({ user_id: viewer.userId, challenge_slug: challenge.slug, start_date: viewer.today }, { onConflict: "user_id,challenge_slug", ignoreDuplicates: true });
  // Distance already logged today counts, so joining can earn a checkpoint straight away.
  const earned = await evaluateAchievements(viewer);
  revalidatePath("/", "layout");
  redirect(`/challenges/${challenge.slug}${earned.length ? `?earned=${earned.join(",")}` : ""}`);
}

export async function leaveChallenge(formData: FormData) {
  const viewer = await getViewerOrNull();
  if (!viewer) redirect("/login");
  const slug = String(formData.get("slug") ?? "");
  await viewer.supabase.from("challenge_entries").delete().eq("challenge_slug", slug);
  revalidatePath("/", "layout");
  redirect("/challenges");
}

export type LogDistanceState = { ok: boolean; message: string; earned: string[] } | null;

/** Logs a walk/run/ride without going through the full workout logger. */
export async function logDistance(_prev: LogDistanceState, formData: FormData): Promise<LogDistanceState> {
  const viewer = await getViewerOrNull();
  if (!viewer) return { ok: false, message: "You've been signed out. Sign in again.", earned: [] };

  const parsed = z
    .object({
      activity: z.enum(QUICK_ACTIVITIES),
      distance: z.coerce.number().positive("Enter how far you went.").max(1000, "That's a long way! Split it into several entries."),
      duration: z.string().trim().optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .safeParse({
      activity: formData.get("activity"),
      distance: String(formData.get("distance") ?? "").replace(",", ".") || undefined,
      duration: formData.get("duration") || undefined,
      date: formData.get("date") || viewer.today,
    });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message, earned: [] };
  const { activity, distance, date } = parsed.data;
  if (date > viewer.today || date < addDays(viewer.today, -365)) return { ok: false, message: "Pick a date in the past year.", earned: [] };
  const seconds = parsed.data.duration ? parseOutingDuration(parsed.data.duration) : null;
  if (parsed.data.duration && seconds == null) return { ok: false, message: "Write the time as minutes (45) or hours and minutes (1:30).", earned: [] };

  const { data: exercise } = await viewer.supabase.from("exercises").select("id").is("user_id", null).eq("name", activity).single();
  if (!exercise) return { ok: false, message: `The ${activity} exercise is missing from the library.`, earned: [] };

  const meters = Math.round(distance * (viewer.unit === "lb" ? 1609.344 : 1000) * 10) / 10;
  const { error } = await viewer.supabase.rpc("save_workout", {
    p_workout: { id: crypto.randomUUID(), workout_date: date, name: activity, routine_id: null, started_at: null, ended_at: null, notes: "" },
    p_sets: [{ exercise_id: exercise.id, exercise_position: 0, set_number: 1, distance_m: meters, duration_seconds: seconds, reps: null, weight_kg: null, is_warmup: false, is_pr: false }],
  });
  if (error) return { ok: false, message: error.message, earned: [] };

  const earned = await evaluateAchievements(viewer);
  revalidatePath("/", "layout");
  return { ok: true, message: `Logged ${distance} ${viewer.unit === "lb" ? "mi" : "km"} ${activity.toLowerCase()}.`, earned };
}
