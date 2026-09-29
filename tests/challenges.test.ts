import { describe, expect, it } from "vitest";
import { CHALLENGES, challengeProgress, daysToFinish, getChallenge } from "@/lib/challenges";

describe("challenge catalog", () => {
  it("is internally consistent", () => {
    const slugs = new Set<string>();
    for (const c of CHALLENGES) {
      expect(slugs.has(c.slug)).toBe(false);
      slugs.add(c.slug);
      expect(c.slug).toMatch(/^[a-z0-9-]{1,40}$/); // matches the database check
      const kms = c.checkpoints.map((cp) => cp.km);
      expect([...kms].sort((a, b) => a - b)).toEqual(kms); // ascending
      expect(new Set(kms).size).toBe(kms.length);
      expect(c.checkpoints.at(-1)).toMatchObject({ id: "finish", km: c.km });
      expect(new Set(c.checkpoints.map((cp) => cp.id)).size).toBe(c.checkpoints.length);
      c.checkpoints.forEach((cp) => expect(cp.id).toMatch(/^[a-z0-9-]+$/));
    }
  });

  it("has checkpoints no more than 350 km apart on the long journeys", () => {
    for (const c of CHALLENGES.filter((x) => x.km > 1000)) {
      let prev = 0;
      for (const cp of c.checkpoints) {
        expect(cp.km - prev).toBeLessThanOrEqual(350);
        prev = cp.km;
      }
    }
  });
});

describe("challengeProgress", () => {
  const mordor = getChallenge("walk-to-mordor")!;

  it("finds reached and next checkpoints", () => {
    const p = challengeProgress(mordor, 250_000);
    expect(p.reached.map((c) => c.id)).toEqual(["bucklebury-ferry", "bree"]);
    expect(p.next?.id).toBe("weathertop");
    expect(p.toNextKm).toBeCloseTo(130);
    expect(p.complete).toBe(false);
    expect(p.fraction).toBeCloseTo(250 / 2863);
  });

  it("counts a checkpoint as reached exactly on its distance, and caps at 100%", () => {
    expect(challengeProgress(mordor, 217_000).reached.at(-1)?.id).toBe("bree");
    const done = challengeProgress(mordor, 3_000_000);
    expect(done.complete).toBe(true);
    expect(done.fraction).toBe(1);
    expect(done.next).toBeNull();
    expect(done.remainingKm).toBe(0);
  });

  it("estimates days to finish from recent pace", () => {
    expect(daysToFinish(100, 30, 30)).toBe(100);
    expect(daysToFinish(100, 0)).toBeNull();
    expect(daysToFinish(0, 0)).toBe(0);
  });
});

describe("formatJourney", async () => {
  const { formatJourney } = await import("@/lib/challenges");
  it("formats in the user's unit with separators", () => {
    expect(formatJourney(2863, "kg")).toBe("2,863 km");
    expect(formatJourney(2863, "lb")).toBe("1,779 mi");
    expect(formatJourney(4.3, "kg")).toBe("4.3 km");
    expect(formatJourney(0, "kg")).toBe("0 km");
    expect(formatJourney(21.5, "kg")).toBe("21.5 km");
    expect(formatJourney(42.195, "kg")).toBe("42.2 km");
    expect(formatJourney(102.96, "kg")).toBe("103 km");
  });
});
