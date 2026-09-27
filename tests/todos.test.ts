import { describe, expect, it } from "vitest";
import { describeWeekdays } from "@/lib/dates";
import { describeSchedule, isOverdue, occursOn } from "@/lib/todos";

const base = { due_date: null, weekdays: null, month_day: null, active: true };

describe("occursOn", () => {
  it("handles one-off, daily and weekly schedules", () => {
    expect(occursOn({ ...base, schedule: "once", due_date: "2026-10-01" }, "2026-10-01")).toBe(true);
    expect(occursOn({ ...base, schedule: "once", due_date: "2026-10-01" }, "2026-10-02")).toBe(false);
    expect(occursOn({ ...base, schedule: "daily" }, "2026-10-02")).toBe(true);
    // 2026-09-28 is a Monday
    expect(occursOn({ ...base, schedule: "weekly", weekdays: [1, 3, 5] }, "2026-09-28")).toBe(true);
    expect(occursOn({ ...base, schedule: "weekly", weekdays: [1, 3, 5] }, "2026-09-29")).toBe(false);
  });

  it("moves monthly to-dos on the 29th-31st to the last day of short months", () => {
    const monthly31 = { ...base, schedule: "monthly", month_day: 31 };
    expect(occursOn(monthly31, "2026-02-28")).toBe(true);
    expect(occursOn(monthly31, "2026-04-30")).toBe(true);
    expect(occursOn(monthly31, "2026-05-30")).toBe(false);
    expect(occursOn(monthly31, "2026-05-31")).toBe(true);
    expect(occursOn({ ...base, schedule: "monthly", month_day: 29 }, "2028-02-29")).toBe(true);
  });

  it("never fires for paused to-dos", () => {
    expect(occursOn({ ...base, schedule: "daily", active: false }, "2026-10-02")).toBe(false);
  });
});

describe("helpers", () => {
  it("detects overdue one-off to-dos", () => {
    const t = { ...base, schedule: "once", due_date: "2026-09-20" };
    expect(isOverdue(t, "2026-09-27", false)).toBe(true);
    expect(isOverdue(t, "2026-09-27", true)).toBe(false);
    expect(isOverdue({ ...base, schedule: "daily" }, "2026-09-27", false)).toBe(false);
  });

  it("describes schedules", () => {
    expect(describeSchedule({ ...base, schedule: "weekly", weekdays: [1, 3, 5] }, describeWeekdays)).toBe("Mon, Wed, Fri");
    expect(describeSchedule({ ...base, schedule: "weekly", weekdays: [1, 2, 3, 4, 5] }, describeWeekdays)).toBe("Weekdays");
    expect(describeSchedule({ ...base, schedule: "monthly", month_day: 1 }, describeWeekdays)).toBe("Monthly on the 1st");
    expect(describeSchedule({ ...base, schedule: "monthly", month_day: 22 }, describeWeekdays)).toBe("Monthly on the 22nd");
    expect(describeSchedule({ ...base, schedule: "monthly", month_day: 13 }, describeWeekdays)).toBe("Monthly on the 13th");
  });
});
