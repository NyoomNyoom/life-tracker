import { CHALLENGES, challengeProgress, getChallenge } from "./challenges";

// Every badge, checkpoint and medal you can earn, and the rules for earning them.
// Keys are stored in the achievements table, so never rename one once shipped.
//   challenge:<slug>:<checkpoint-id>   a checkpoint on a distance challenge
//   challenge:<slug>:medal             finishing the challenge
//   training:* / teeth:*               the badges below

export type AchievementGroup = "medal" | "checkpoint" | "training" | "teeth";

export type Achievement = {
  key: string;
  group: AchievementGroup;
  title: string;
  description: string;
  /** Lucide-style glyph name the UI maps to an icon. */
  glyph: "dumbbell" | "flame" | "trophy" | "sparkles" | "smile" | "medal" | "flag" | "map-pin";
};

export const BADGES: Achievement[] = [
  { key: "training:first-workout", group: "training", title: "Day one", description: "Log your first workout.", glyph: "dumbbell" },
  { key: "training:workouts-10", group: "training", title: "Ten down", description: "Log 10 workouts.", glyph: "dumbbell" },
  { key: "training:workouts-50", group: "training", title: "Regular", description: "Log 50 workouts.", glyph: "dumbbell" },
  { key: "training:workouts-100", group: "training", title: "Centurion", description: "Log 100 workouts.", glyph: "dumbbell" },
  { key: "training:workouts-250", group: "training", title: "Gym rat", description: "Log 250 workouts.", glyph: "dumbbell" },
  { key: "training:weeks-4", group: "training", title: "A month strong", description: "Hit your weekly workout goal 4 weeks in a row.", glyph: "flame" },
  { key: "training:weeks-12", group: "training", title: "Quarter of consistency", description: "Hit your weekly workout goal 12 weeks in a row.", glyph: "flame" },
  { key: "training:weeks-26", group: "training", title: "Half-year habit", description: "Hit your weekly workout goal 26 weeks in a row.", glyph: "flame" },
  { key: "training:first-pr", group: "training", title: "New best", description: "Set your first personal record.", glyph: "trophy" },
  { key: "teeth:streak-7", group: "teeth", title: "Fresh week", description: "Brush morning and night for 7 days in a row.", glyph: "smile" },
  { key: "teeth:streak-30", group: "teeth", title: "Month of minty", description: "Brush morning and night for 30 days in a row.", glyph: "smile" },
  { key: "teeth:streak-100", group: "teeth", title: "Hundred-day smile", description: "Brush morning and night for 100 days in a row.", glyph: "smile" },
  { key: "teeth:streak-365", group: "teeth", title: "Dentist's favourite", description: "Brush morning and night for a whole year in a row.", glyph: "smile" },
  { key: "teeth:floss-7", group: "teeth", title: "Floss boss", description: "Floss 7 days in a row.", glyph: "sparkles" },
  { key: "teeth:floss-30", group: "teeth", title: "Floss legend", description: "Floss 30 days in a row.", glyph: "sparkles" },
];

export const medalKey = (slug: string) => `challenge:${slug}:medal`;
export const checkpointKey = (slug: string, checkpointId: string) => `challenge:${slug}:${checkpointId}`;

/** Looks up any achievement key, including challenge checkpoints and medals. */
export function describeAchievement(key: string): (Achievement & { challengeSlug?: string }) | null {
  const badge = BADGES.find((b) => b.key === key);
  if (badge) return badge;
  const [prefix, slug, id] = key.split(":");
  if (prefix !== "challenge") return null;
  const challenge = getChallenge(slug);
  if (!challenge) return null;
  if (id === "medal") {
    return { key, group: "medal", title: `${challenge.name} medal`, description: `Finished ${challenge.name}.`, glyph: "medal", challengeSlug: slug };
  }
  const cp = challenge.checkpoints.find((c) => c.id === id && c.id !== "finish");
  if (!cp) return null;
  return { key, group: "checkpoint", title: `Reached ${cp.name}`, description: `${challenge.name}: ${cp.blurb}`, glyph: "map-pin", challengeSlug: slug };
}

export type AchievementStats = {
  workoutCount: number;
  /** Consecutive weeks meeting the weekly workout goal (see weeklyStats). */
  weekStreak: number;
  hasPR: boolean;
  brushStreak: number;
  flossStreak: number;
  /** Distance logged toward each joined challenge. */
  challenges: { slug: string; distanceMeters: number }[];
};

/** Every achievement the stats currently qualify for (already-earned ones included). */
export function qualifyingKeys(stats: AchievementStats): string[] {
  const keys: string[] = [];
  const at = (value: number, thresholds: [number, string][]) => thresholds.forEach(([n, key]) => value >= n && keys.push(key));

  at(stats.workoutCount, [
    [1, "training:first-workout"],
    [10, "training:workouts-10"],
    [50, "training:workouts-50"],
    [100, "training:workouts-100"],
    [250, "training:workouts-250"],
  ]);
  at(stats.weekStreak, [
    [4, "training:weeks-4"],
    [12, "training:weeks-12"],
    [26, "training:weeks-26"],
  ]);
  if (stats.hasPR) keys.push("training:first-pr");
  at(stats.brushStreak, [
    [7, "teeth:streak-7"],
    [30, "teeth:streak-30"],
    [100, "teeth:streak-100"],
    [365, "teeth:streak-365"],
  ]);
  at(stats.flossStreak, [
    [7, "teeth:floss-7"],
    [30, "teeth:floss-30"],
  ]);

  for (const { slug, distanceMeters } of stats.challenges) {
    const challenge = getChallenge(slug);
    if (!challenge) continue;
    const progress = challengeProgress(challenge, distanceMeters);
    for (const cp of progress.reached) keys.push(cp.id === "finish" ? medalKey(slug) : checkpointKey(slug, cp.id));
  }
  return keys;
}

/** Every medal, for the trophy shelf. */
export function allMedals(): Achievement[] {
  return CHALLENGES.map((c) => describeAchievement(medalKey(c.slug))!);
}
