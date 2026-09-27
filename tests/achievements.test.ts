import { describe, expect, it } from "vitest";
import { BADGES, allMedals, describeAchievement, qualifyingKeys, type AchievementStats } from "@/lib/achievements";

const none: AchievementStats = { workoutCount: 0, weekStreak: 0, hasPR: false, brushStreak: 0, flossStreak: 0, challenges: [] };

describe("qualifyingKeys", () => {
  it("awards nothing for a new user", () => {
    expect(qualifyingKeys(none)).toEqual([]);
  });

  it("awards every threshold that has been reached", () => {
    const keys = qualifyingKeys({ ...none, workoutCount: 12, weekStreak: 4, hasPR: true, brushStreak: 30, flossStreak: 7 });
    expect(keys).toEqual(
      expect.arrayContaining([
        "training:first-workout",
        "training:workouts-10",
        "training:weeks-4",
        "training:first-pr",
        "teeth:streak-7",
        "teeth:streak-30",
        "teeth:floss-7",
      ]),
    );
    expect(keys).not.toContain("training:workouts-50");
    expect(keys).not.toContain("teeth:streak-100");
  });

  it("awards checkpoints and the medal from challenge distance", () => {
    expect(qualifyingKeys({ ...none, challenges: [{ slug: "milford-track", distanceMeters: 22_000 }] })).toEqual([
      "challenge:milford-track:clinton-hut",
      "challenge:milford-track:mintaro-hut",
    ]);
    expect(qualifyingKeys({ ...none, challenges: [{ slug: "marathon", distanceMeters: 42_195 }] })).toContain("challenge:marathon:medal");
    expect(qualifyingKeys({ ...none, challenges: [{ slug: "no-such-thing", distanceMeters: 1e9 }] })).toEqual([]);
  });
});

describe("describeAchievement", () => {
  it("describes badges, checkpoints and medals, and rejects unknown keys", () => {
    expect(describeAchievement("teeth:streak-7")?.title).toBe("Fresh week");
    expect(describeAchievement("challenge:walk-to-mordor:rivendell")).toMatchObject({ group: "checkpoint", title: "Reached Rivendell" });
    expect(describeAchievement("challenge:te-araroa:medal")).toMatchObject({ group: "medal", title: "Te Araroa medal" });
    expect(describeAchievement("challenge:te-araroa:finish")).toBeNull();
    expect(describeAchievement("challenge:nope:medal")).toBeNull();
    expect(describeAchievement("nonsense")).toBeNull();
  });

  it("uses keys the database accepts", () => {
    const keys = [...BADGES.map((b) => b.key), ...allMedals().map((m) => m.key)];
    keys.forEach((k) => expect(k).toMatch(/^[a-z0-9:_-]{1,80}$/));
    expect(new Set(keys).size).toBe(keys.length);
  });
});
