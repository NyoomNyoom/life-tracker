import "server-only";

import webpush from "web-push";
import { vapidConfig } from "../server-env";

export type PushPayload = { title: string; body: string; url: string; tag?: string };
export type PushTarget = { id: string; endpoint: string; p256dh: string; auth: string };
export type PushResult = { id: string; ok: boolean; gone: boolean; error?: string };

let configured = false;

export function pushEnabled(): boolean {
  const cfg = vapidConfig();
  if (!cfg) return false;
  if (!configured) {
    webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey);
    configured = true;
  }
  return true;
}

/** Sends to one device. `gone` means the subscription is dead (app removed, permission revoked) and should be deleted. */
export async function sendPush(target: PushTarget, payload: PushPayload): Promise<PushResult> {
  if (!pushEnabled()) return { id: target.id, ok: false, gone: false, error: "Push is not configured (VAPID keys missing)" };
  try {
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60, urgency: "high", topic: payload.tag?.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) },
    );
    return { id: target.id, ok: true, gone: false };
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    return {
      id: target.id,
      ok: false,
      gone: status === 404 || status === 410,
      error: `${status ?? ""} ${(err as Error).message}`.trim(),
    };
  }
}
