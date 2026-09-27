import { describe, expect, it } from "vitest";
import { brushingStats, type BrushLog } from "@/lib/habits";

const log = (log_date: string, slot: "morning" | "night", flossed = false, mouthwash = false): BrushLog => ({ log_date, slot, flossed, mouthwash });
const both = (date: string, flossed = false) => [log(date, "morning"), log(date, "night", flossed)];

describe("brushingStats", () => {
  const today = "2026-09-27";

  it("counts complete days in a row, including today once it's complete", () => {
    const logs = [...both("2026-09-25"), ...both("2026-09-26"), ...both("2026-09-27")];
    expect(brushingStats(logs, today).streak).toBe(3);
  });

  it("doesn't break the streak just because tonight isn't done yet", () => {
    const logs = [...both("2026-09-25"), ...both("2026-09-26"), log(today, "morning")];
    const stats = brushingStats(logs, today);
    expect(stats.streak).toBe(2);
    expect(stats.today.morning).not.toBeNull();
    expect(stats.today.night).toBeNull();
  });

  it("breaks the streak on a day with only one brush", () => {
    const logs = [...both("2026-09-24"), log("2026-09-25", "morning"), ...both("2026-09-26")];
    expect(brushingStats(logs, today).streak).toBe(1);
  });

  it("tracks flossing streaks and the weekly summary", () => {
    const logs = [...both("2026-09-25", true), ...both("2026-09-26", true), log(today, "morning", true, true)];
    const stats = brushingStats(logs, today);
    expect(stats.flossStreak).toBe(3);
    expect(stats.week).toEqual({ complete: 2, flossed: 3, mouthwash: 1 });
  });

  it("handles no data", () => {
    expect(brushingStats([], today)).toMatchObject({ streak: 0, flossStreak: 0, week: { complete: 0, flossed: 0, mouthwash: 0 } });
  });
});
