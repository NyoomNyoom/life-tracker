import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cronSecret } from "./server-env";

// Signed, expiring links for the "dismiss for today" button in reminder emails. Email links open
// in Safari, where the user usually isn't signed in (iPhone home-screen apps keep separate
// cookies), so the link itself carries a signature instead of relying on a session.

function key(): Buffer {
  return createHmac("sha256", cronSecret()).update("life-tracker:dismiss-link:v1").digest();
}

function sign(payload: string): string {
  return createHmac("sha256", key()).update(payload).digest("base64url");
}

export function createDismissToken(reminderId: string, occurrenceDate: string, ttlHours = 48): string {
  const exp = Math.floor(Date.now() / 1000) + ttlHours * 3600;
  const payload = Buffer.from(JSON.stringify({ r: reminderId, d: occurrenceDate, e: exp })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyDismissToken(token: string): { reminderId: string; occurrenceDate: string } | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const { r, d, e } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof r !== "string" || typeof d !== "string" || typeof e !== "number") return null;
    if (e < Date.now() / 1000) return null;
    return { reminderId: r, occurrenceDate: d };
  } catch {
    return null;
  }
}

/** Constant-time check of an `Authorization: Bearer <secret>` header. */
export function isValidBearer(header: string | null, secret: string): boolean {
  if (!header?.startsWith("Bearer ")) return false;
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
