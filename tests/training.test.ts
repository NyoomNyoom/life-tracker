import { describe, expect, it } from "vitest";
import {
  EMPTY_BESTS,
  estimate1RM,
  formatSet,
  isPersonalRecord,
  isSetComplete,
  mergeBests,
  movingAverage,
  weeklyStats,
} from "@/lib/training";

describe("estimate1RM", () => {
  it("uses Epley for 2-12 reps and the weight itself for a single", () => {
    expect(estimate1RM(100, 1)).toBe(100);
    expect(estimate1RM(100, 5)).toBeCloseTo(116.67, 2);
    expect(estimate1RM(100, 13)).toBeNull();
    expect(estimate1RM(0, 5)).toBeNull();
    expect(estimate1RM(100, 0)).toBeNull();
  });
});

describe("personal records", () => {
  const bests = { ...EMPTY_BESTS, weight_kg: 100, e1rm_kg: estimate1RM(100, 5), reps: 5 };

  it("never flags the first time you do an exercise", () => {
    expect(isPersonalRecord("weight_reps", { weight_kg: 200, reps: 5 }, EMPTY_BESTS, false)).toBe(false);
  });

  it("flags a heavier weight or a better estimated max", () => {
    expect(isPersonalRecord("weight_reps", { weight_kg: 102.5, reps: 1 }, bests, true)).toBe(true);
    expect(isPersonalRecord("weight_reps", { weight_kg: 100, reps: 6 }, bests, true)).toBe(true);
    expect(isPersonalRecord("weight_reps", { weight_kg: 100, reps: 5 }, bests, true)).toBe(false);
    expect(isPersonalRecord("weight_reps", { weight_kg: 90, reps: 8 }, bests, true)).toBe(false);
  });

  it("does not flag a repeat of a set just logged in the same session", () => {
    const set = { weight_kg: 105, reps: 5 };
    expect(isPersonalRecord("weight_reps", set, bests, true)).toBe(true);
    const updated = mergeBests(bests, set);
    expect(isPersonalRecord("weight_reps", set, updated, true)).toBe(false);
  });

  it("handles bodyweight, duration and distance exercises", () => {
    expect(isPersonalRecord("bodyweight_reps", { reps: 12 }, { ...EMPTY_BESTS, reps: 10 }, true)).toBe(true);
    expect(isPersonalRecord("duration", { duration_seconds: 95 }, { ...EMPTY_BESTS, duration_seconds: 90 }, true)).toBe(true);
    expect(isPersonalRecord("distance_time", { distance_m: 4000 }, { ...EMPTY_BESTS, distance_m: 5000 }, true)).toBe(false);
  });
});

describe("set helpers", () => {
  it("formats each kind of set", () => {
    expect(formatSet("weight_reps", { weight_kg: 80, reps: 5 }, "kg")).toBe("80 kg × 5");
    expect(formatSet("bodyweight_reps", { reps: 12 }, "kg")).toBe("BW × 12");
    expect(formatSet("bodyweight_reps", { reps: 8, weight_kg: 10 }, "kg")).toBe("+10 kg × 8");
    expect(formatSet("duration", { duration_seconds: 90 }, "kg")).toBe("1:30");
    expect(formatSet("distance_time", { distance_m: 5000, duration_seconds: 1500 }, "kg")).toBe("5 km · 25:00");
  });

  it("knows when a set is complete", () => {
    expect(isSetComplete("weight_reps", { weight_kg: 0, reps: 5 })).toBe(true);
    expect(isSetComplete("weight_reps", { reps: 5 })).toBe(false);
    expect(isSetComplete("bodyweight_reps", { reps: 0 })).toBe(false);
    expect(isSetComplete("distance_time", { duration_seconds: 600 })).toBe(true);
  });
});

describe("weeklyStats", () => {
  // 2026-09-27 is a Sunday; weeks start Monday.
  const today = "2026-09-27";

  it("counts this week and consecutive weeks meeting the goal", () => {
    const dates = [
      "2026-09-22", "2026-09-24", "2026-09-26", // this week: 3
      "2026-09-15", "2026-09-17", "2026-09-19", // last week: 3
      "2026-09-09", // two weeks ago: 1 (breaks the streak)
      "2026-09-01", "2026-09-02", "2026-09-03",
    ];
    expect(weeklyStats(dates, today, 3)).toEqual({ thisWeek: 3, goal: 3, streakWeeks: 2, daysSinceLast: 1 });
  });

  it("keeps last week's streak alive while this week is still in progress", () => {
    const dates = ["2026-09-21", "2026-09-15", "2026-09-17", "2026-09-19"];
    expect(weeklyStats(dates, today, 3)).toMatchObject({ thisWeek: 1, streakWeeks: 1 });
  });

  it("handles no workouts", () => {
    expect(weeklyStats([], today, 3)).toEqual({ thisWeek: 0, goal: 3, streakWeeks: 0, daysSinceLast: null });
  });
});

describe("movingAverage", () => {
  it("averages over the trailing calendar window, not the last N entries", () => {
    const pts = [
      { date: "2026-09-01", value: 80 },
      { date: "2026-09-02", value: 82 },
      { date: "2026-09-20", value: 90 },
    ];
    expect(movingAverage(pts, 7).map((p) => p.value)).toEqual([80, 81, 90]);
  });
});
