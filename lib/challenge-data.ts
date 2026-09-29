import "server-only";

import { CHALLENGES, challengeProgress, getChallenge, type Challenge, type ChallengeProgress } from "./challenges";
import { addDays, daysBetween } from "./dates";
import type { Viewer } from "./viewer";

export type JoinedChallenge = {
  challenge: Challenge;
  startDate: string;
  completedAt: string | null;
  progress: ChallengeProgress;
  /** km counted toward this challenge over the last `paceDays` days, for a pace estimate. */
  recentKm: number;
  /** Days the pace is measured over: up to 30, fewer for a challenge started recently. */
  paceDays: number;
};

/** The user's joined challenges with progress, plus the ones they haven't started. */
export async function loadChallenges({ supabase, today }: Viewer) {
  const since = addDays(today, -29);
  const [{ data: entries }, { data: recent }] = await Promise.all([
    supabase.rpc("challenge_distances"),
    supabase
      .from("workout_sets")
      .select("distance_m, workout:workouts!inner(workout_date)")
      .gt("distance_m", 0)
      .gte("workout.workout_date", since),
  ]);

  const joined: JoinedChallenge[] = [];
  for (const e of entries ?? []) {
    const challenge = getChallenge(e.challenge_slug);
    if (!challenge) continue;
    const recentKm =
      (recent ?? [])
        .filter((s) => s.workout && s.workout.workout_date >= e.start_date)
        .reduce((sum, s) => sum + Number(s.distance_m), 0) / 1000;
    const paceDays = Math.min(30, daysBetween(e.start_date, today) + 1);
    joined.push({
      challenge,
      startDate: e.start_date,
      completedAt: e.completed_at,
      progress: challengeProgress(challenge, Number(e.distance_m)),
      recentKm,
      paceDays,
    });
  }
  // Closest to its next checkpoint first, finished ones last.
  joined.sort((a, b) => Number(a.progress.complete) - Number(b.progress.complete) || b.progress.fraction - a.progress.fraction);
  const joinedSlugs = new Set(joined.map((j) => j.challenge.slug));
  return { joined, available: CHALLENGES.filter((c) => !joinedSlugs.has(c.slug)) };
}
