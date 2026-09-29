import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { buildMessage, findDue, GRACE_MINUTES, type ReminderRule, type SentEvent } from "@/lib/reminders/engine";

const NZ = "Pacific/Auckland";
const NY = "America/New_York";

function rule(overrides: Partial<ReminderRule> = {}): ReminderRule {
  return {
    id: "r1",
    kind: "weight",
    time_of_day: "09:00:00",
    weekdays: [1, 2, 3, 4, 5, 6, 7],
    follow_up_minutes: null,
    created_at: "2026-01-01T00:00:00Z",
    todo: null,
    ...overrides,
  };
}

const at = (iso: string, zone: string) => DateTime.fromISO(iso, { zone });

describe("findDue: initial reminder", () => {
  it("is not due before the local time", () => {
    expect(findDue(rule(), NZ, at("2026-09-28T08:59", NZ), [])).toBeNull();
  });

  it("is due at the local time in the user's timezone, not UTC", () => {
    // 09:00 in Auckland is 20:00 UTC the previous day.
    const now = DateTime.fromISO("2026-09-27T20:00:00Z");
    expect(findDue(rule(), NZ, now, [])).toEqual({ occurrenceDate: "2026-09-28", stage: "initial" });
  });

  it("stops trying after the grace window", () => {
    expect(findDue(rule(), NZ, at("2026-09-28T09:00", NZ).plus({ minutes: GRACE_MINUTES - 1 }), [])).not.toBeNull();
    expect(findDue(rule(), NZ, at("2026-09-28T09:00", NZ).plus({ minutes: GRACE_MINUTES }), [])).toBeNull();
  });

  it("does not repeat once sent", () => {
    const events: SentEvent[] = [{ occurrence_date: "2026-09-28", stage: "initial", created_at: "2026-09-27T20:00:30Z" }];
    expect(findDue(rule(), NZ, at("2026-09-28T09:20", NZ), events)).toBeNull();
  });

  it("respects weekdays (gym days)", () => {
    const gym = rule({ kind: "workout", time_of_day: "20:00", weekdays: [1, 3, 5] });
    expect(findDue(gym, NY, at("2026-09-28T20:05", NY), [])).not.toBeNull(); // Monday
    expect(findDue(gym, NY, at("2026-09-29T20:05", NY), [])).toBeNull(); // Tuesday
  });

  it("does not fire for a time that had already passed when the reminder was created", () => {
    const fresh = rule({ created_at: at("2026-09-28T09:30", NZ).toUTC().toISO()! });
    expect(findDue(fresh, NZ, at("2026-09-28T09:35", NZ), [])).toBeNull();
    expect(findDue(fresh, NZ, at("2026-09-29T09:05", NZ), [])).toEqual({ occurrenceDate: "2026-09-29", stage: "initial" });
  });

  it("still sends a late-evening reminder when the run lands just after midnight", () => {
    const late = rule({ time_of_day: "23:55" });
    expect(findDue(late, NZ, at("2026-09-29T00:02", NZ), [])).toEqual({ occurrenceDate: "2026-09-28", stage: "initial" });
  });

  it("is skipped for the day once dismissed", () => {
    const events: SentEvent[] = [{ occurrence_date: "2026-09-28", stage: "dismissed", created_at: "2026-09-27T18:00:00Z" }];
    expect(findDue(rule(), NZ, at("2026-09-28T09:05", NZ), events)).toBeNull();
  });
});

describe("findDue: follow-up", () => {
  const withFollowUp = rule({ follow_up_minutes: 60 });
  const sent: SentEvent[] = [{ occurrence_date: "2026-09-28", stage: "initial", created_at: at("2026-09-28T09:02", NZ).toUTC().toISO()! }];

  it("waits the configured delay after the first reminder was actually sent", () => {
    expect(findDue(withFollowUp, NZ, at("2026-09-28T10:01", NZ), sent)).toBeNull();
    expect(findDue(withFollowUp, NZ, at("2026-09-28T10:02", NZ), sent)).toEqual({ occurrenceDate: "2026-09-28", stage: "follow_up" });
  });

  it("sends only one follow-up", () => {
    const both: SentEvent[] = [...sent, { occurrence_date: "2026-09-28", stage: "follow_up", created_at: at("2026-09-28T10:05", NZ).toUTC().toISO()! }];
    expect(findDue(withFollowUp, NZ, at("2026-09-28T10:30", NZ), both)).toBeNull();
  });

  it("is not sent if the reminder has no follow-up", () => {
    expect(findDue(rule(), NZ, at("2026-09-28T10:30", NZ), sent)).toBeNull();
  });
});

describe("findDue: daylight saving", () => {
  it("fires at 09:00 local on both sides of a DST change", () => {
    // New York leaves DST on 2026-11-01.
    const before = findDue(rule(), NY, DateTime.fromISO("2026-10-31T13:00:00Z"), []); // 09:00 EDT
    const after = findDue(rule(), NY, DateTime.fromISO("2026-11-02T14:00:00Z"), []); // 09:00 EST
    expect(before?.occurrenceDate).toBe("2026-10-31");
    expect(after?.occurrenceDate).toBe("2026-11-02");
    expect(findDue(rule(), NY, DateTime.fromISO("2026-11-02T13:30:00Z"), [])).toBeNull(); // 08:30 EST
  });

  it("still fires when the time falls in the spring-forward gap", () => {
    // Auckland skips 02:00-03:00 on 2026-09-27.
    const gap = rule({ time_of_day: "02:30" });
    expect(findDue(gap, NZ, DateTime.fromISO("2026-09-26T14:35:00Z"), [])).toEqual({ occurrenceDate: "2026-09-27", stage: "initial" });
  });
});

describe("findDue: to-do reminders", () => {
  const todo = { schedule: "weekly", due_date: null, weekdays: [2], month_day: null, active: true };

  it("follows the to-do's schedule instead of the rule's weekdays", () => {
    const r = rule({ kind: "todo", time_of_day: "08:00", weekdays: [1], todo });
    expect(findDue(r, NY, at("2026-09-29T08:01", NY), [])).not.toBeNull(); // Tuesday
    expect(findDue(r, NY, at("2026-09-28T08:01", NY), [])).toBeNull(); // Monday
  });

  it("does nothing for paused to-dos", () => {
    const r = rule({ kind: "todo", time_of_day: "08:00", todo: { ...todo, active: false } });
    expect(findDue(r, NY, at("2026-09-29T08:01", NY), [])).toBeNull();
  });
});

describe("buildMessage", () => {
  it("uses the custom label as the title when set", () => {
    expect(buildMessage("weight", "initial", "Step on the scale", null).title).toBe("Step on the scale");
    expect(buildMessage("todo", "initial", null, "Take creatine")).toMatchObject({ title: "Take creatine", path: "/todos" });
    expect(buildMessage("workout", "follow_up", null, null).path).toBe("/workouts/new");
  });
});

describe("teeth reminders", () => {
  it("apply on their weekdays like weigh-ins", () => {
    const r = rule({ kind: "teeth", time_of_day: "21:30", weekdays: [1, 2, 3, 4, 5, 6, 7] });
    expect(findDue(r, NZ, at("2026-09-28T21:31", NZ), [])).toEqual({ occurrenceDate: "2026-09-28", stage: "initial" });
  });

  it("word morning and night reminders differently and open the teeth page", () => {
    expect(buildMessage("teeth", "initial", null, null, "morning")).toMatchObject({ title: "Brush your teeth", path: "/teeth" });
    expect(buildMessage("teeth", "initial", null, null, "night").title).toBe("Time to brush");
    expect(buildMessage("teeth", "follow_up", null, null, "night").body).toContain("streak");
  });
});
