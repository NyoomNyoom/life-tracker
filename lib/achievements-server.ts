import "server-only";

import { qualifyingKeys, describeAchievement } from "./achievements";
import { getChallenge } from "./challenges";
import { addDays } from "./dates";
import { brushingStats, type BrushLog } from "./habits";
import { sendPush, pushEnabled } from "./notify/push";
import { formatDistance, weeklyStats } from "./training";
import type { Viewer } from "./viewer";

/**
 * Works out what the user has newly earned, records it, marks finished challenges complete and
 * (if they want) sends a push for new checkpoints and medals. Idempotent: safe to call after
 * any change that could earn something. Returns the newly earned keys, for a celebration.
 */
export async function evaluateAchievements(viewer: Viewer): Promise<string[]> {
  const { supabase, userId, today, profile } = viewer;

  const [workouts, prs, brushing, challenges, existing] = await Promise.all([
    supabase.from("workouts").select("workout_date"),
    supabase.from("workout_sets").select("id", { count: "exact", head: true }).eq("is_pr", true),
    supabase.from("brushing_logs").select("log_date, slot, flossed, mouthwash").gte("log_date", addDays(today, -400)),
    supabase.rpc("challenge_distances"),
    supabase.from("achievements").select("key"),
  ]);
  if (workouts.error || brushing.error || challenges.error || existing.error) return [];

  const brush = brushingStats(brushing.data as BrushLog[], today);
  const qualifying = qualifyingKeys({
    workoutCount: workouts.data.length,
    weekStreak: weeklyStats(workouts.data.map((w) => w.workout_date), today, profile.weekly_workout_goal).streakWeeks,
    hasPR: (prs.count ?? 0) > 0,
    brushStreak: brush.streak,
    flossStreak: brush.flossStreak,
    challenges: challenges.data.map((c) => ({ slug: c.challenge_slug, distanceMeters: Number(c.distance_m) })),
  });

  const have = new Set(existing.data.map((a) => a.key));
  const fresh = qualifying.filter((k) => !have.has(k));
  if (fresh.length === 0) return [];

  const { data: inserted } = await supabase
    .from("achievements")
    .upsert(
      fresh.map((key) => ({ user_id: userId, key })),
      { onConflict: "user_id,key", ignoreDuplicates: true },
    )
    .select("key");
  const earned = (inserted ?? []).map((a) => a.key);

  const finished = earned.filter((k) => k.endsWith(":medal")).map((k) => k.split(":")[1]);
  if (finished.length) {
    await supabase
      .from("challenge_entries")
      .update({ completed_at: new Date().toISOString() })
      .in("challenge_slug", finished)
      .is("completed_at", null);
  }

  const journey = earned.filter((k) => k.startsWith("challenge:"));
  if (journey.length && profile.notify_milestones) await notifyJourney(viewer, journey);

  return earned;
}

/** One push per new checkpoint/medal (at most three, most significant last). */
async function notifyJourney({ supabase, unit }: Viewer, keys: string[]) {
  if (!pushEnabled()) return;
  const { data: subs } = await supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth");
  if (!subs?.length) return;

  const messages = keys.slice(-3).map((key) => {
    const a = describeAchievement(key)!;
    const challenge = getChallenge(a.challengeSlug!)!;
    if (a.group === "medal") {
      return { title: `🏅 ${challenge.name} complete!`, body: `You've earned the medal: ${challenge.checkpoints.at(-1)!.blurb}`, url: `/challenges/${challenge.slug}`, tag: key };
    }
    const cp = challenge.checkpoints.find((c) => key.endsWith(`:${c.id}`))!;
    return {
      title: `📍 You reached ${cp.name}`,
      body: `${challenge.name}, ${formatDistance(cp.km * 1000, unit)} in. ${cp.blurb}`,
      url: `/challenges/${challenge.slug}`,
      tag: key,
    };
  });

  const gone = new Set<string>();
  for (const message of messages) {
    const results = await Promise.all(subs.filter((s) => !gone.has(s.id)).map((s) => sendPush(s, message)));
    results.filter((r) => r.gone).forEach((r) => gone.add(r.id));
  }
  if (gone.size) await supabase.from("push_subscriptions").delete().in("id", [...gone]);
}
