import { describe, expect, it } from "vitest";
import { emptySet, fillBlanks, lacksDistance, parseSet, unreadableInput, type DraftSet } from "@/lib/workout-draft";

const set = (inputs: Partial<DraftSet>): DraftSet => ({ ...emptySet(), ...inputs });
const lastWalk = { weight: "", reps: "", duration: "15:00", distance: "1" };

describe("fillBlanks", () => {
  it("fills a cardio set's blank distance even when a time was typed", () => {
    const next = fillBlanks("distance_time", set({ duration: "15:00" }), lastWalk, "kg");
    expect(parseSet(next, "kg")).toMatchObject({ distance_m: 1000, duration_seconds: 900 });
  });

  it("fills a cardio set's blank time when a distance was typed", () => {
    const next = fillBlanks("distance_time", set({ distance: "2" }), lastWalk, "kg");
    expect(next).toMatchObject({ distance: "2", duration: "15:00" });
  });

  it("keeps what was typed", () => {
    const typed = set({ distance: "3", duration: "30:00" });
    expect(fillBlanks("distance_time", typed, lastWalk, "kg")).toBe(typed);
  });

  it("leaves a blank distance blank when there's nothing to fill it from", () => {
    const next = fillBlanks("distance_time", set({ duration: "20:00" }), { weight: "", reps: "", duration: "", distance: "" }, "kg");
    expect(next.distance).toBe("");
  });

  it("only fills strength sets that can't be saved as typed", () => {
    const source = { weight: "10", reps: "8", duration: "", distance: "" };
    // Bodyweight reps on their own are a complete set: don't add last time's extra weight.
    const bodyweight = set({ reps: "12" });
    expect(fillBlanks("bodyweight_reps", bodyweight, source, "kg")).toBe(bodyweight);
    expect(fillBlanks("weight_reps", set({ weight: "60" }), source, "kg")).toMatchObject({ weight: "60", reps: "8" });
  });
});

describe("unreadableInput", () => {
  it("flags a distance that isn't a number instead of dropping it", () => {
    expect(unreadableInput("distance_time", set({ distance: "1km", duration: "15:00" }), "kg")).toMatch(/kilometres/);
    expect(unreadableInput("distance_time", set({ distance: "1 mi" }), "lb")).toMatch(/miles/);
  });

  it("flags a time that can't be read", () => {
    expect(unreadableInput("distance_time", set({ distance: "1", duration: "15 min" }), "kg")).toMatch(/minutes:seconds/);
    expect(unreadableInput("duration", set({ duration: "1:xx" }), "kg")).toMatch(/minutes:seconds/);
  });

  it("accepts numbers, decimal commas and blanks", () => {
    expect(unreadableInput("distance_time", set({ distance: "2,5", duration: "25:00" }), "kg")).toBeNull();
    expect(unreadableInput("distance_time", set({ duration: "25:00" }), "kg")).toBeNull();
    expect(unreadableInput("weight_reps", set({ weight: "60", reps: "5" }), "kg")).toBeNull();
  });
});

describe("lacksDistance", () => {
  it("spots cardio saved with a time but no distance", () => {
    expect(lacksDistance("distance_time", set({ duration: "15:00" }), "kg")).toBe(true);
    expect(lacksDistance("distance_time", set({ distance: "0", duration: "15:00" }), "kg")).toBe(true);
    expect(lacksDistance("distance_time", set({ distance: "1", duration: "15:00" }), "kg")).toBe(false);
    expect(lacksDistance("distance_time", set({}), "kg")).toBe(false);
    expect(lacksDistance("duration", set({ duration: "1:00" }), "kg")).toBe(false);
  });
});
