import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.CRON_SECRET = "test-secret-value";
});

describe("dismiss tokens", async () => {
  const { createDismissToken, isValidBearer, verifyDismissToken } = await import("@/lib/links");

  it("round-trips", () => {
    const token = createDismissToken("11111111-1111-1111-1111-111111111111", "2026-09-28");
    expect(verifyDismissToken(token)).toEqual({ reminderId: "11111111-1111-1111-1111-111111111111", occurrenceDate: "2026-09-28" });
  });

  it("rejects tampering and expiry", () => {
    const token = createDismissToken("r", "2026-09-28");
    const [payload, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ r: "other", d: "2026-09-28", e: 9999999999 })).toString("base64url");
    expect(verifyDismissToken(`${forged}.${sig}`)).toBeNull();
    expect(verifyDismissToken(`${payload}.${sig.slice(0, -2)}xx`)).toBeNull();
    expect(verifyDismissToken(createDismissToken("r", "2026-09-28", -1))).toBeNull();
    expect(verifyDismissToken("garbage")).toBeNull();
  });

  it("checks bearer tokens", () => {
    expect(isValidBearer("Bearer test-secret-value", "test-secret-value")).toBe(true);
    expect(isValidBearer("Bearer nope", "test-secret-value")).toBe(false);
    expect(isValidBearer(null, "test-secret-value")).toBe(false);
  });
});
