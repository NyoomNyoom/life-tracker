"use client";

import { useEffect, useState } from "react";
import { Share, SquarePlus } from "lucide-react";
import { removePushSubscription, savePushSubscription, sendTestPush } from "@/app/(app)/settings/actions";
import { Button, Notice } from "./ui";

type Support = "checking" | "unsupported" | "needs-install" | "ready";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function detectSupport(): Support {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  // On iPhone, web push only exists for sites added to the Home Screen (iOS 16.4+).
  if (ios && !standalone) return "needs-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  return "ready";
}

/** Turns notifications on/off for the current device and sends a test. */
export function PushSettings({ vapidKey, deviceCount }: { vapidKey?: string; deviceCount: number }) {
  const [support, setSupport] = useState<Support>("checking");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "accent" | "danger" | "neutral"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const s = detectSupport();
    (async () => {
      let sub: PushSubscription | null = null;
      if (s === "ready") {
        const reg = await navigator.serviceWorker.ready;
        sub = await reg.pushManager.getSubscription();
      }
      if (!cancelled) {
        setSupport(s);
        setSubscription(sub);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    if (!vapidKey) return;
    setBusy(true);
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage({ tone: "danger", text: "Notifications are blocked. Allow them in iPhone Settings → Notifications → Tracker." });
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) });
      const res = await savePushSubscription(sub.toJSON(), navigator.userAgent);
      if (!res?.ok) {
        await sub.unsubscribe();
        setMessage({ tone: "danger", text: res && !res.ok ? res.error : "Couldn't save." });
        return;
      }
      setSubscription(sub);
      setMessage({ tone: "accent", text: "Notifications are on for this device." });
    } catch (err) {
      setMessage({ tone: "danger", text: `Couldn't turn on notifications: ${(err as Error).message}` });
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (!subscription) return;
    setBusy(true);
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe().catch(() => {});
    await removePushSubscription(endpoint);
    setSubscription(null);
    setBusy(false);
    setMessage({ tone: "neutral", text: "Notifications are off for this device." });
  }

  async function test() {
    setBusy(true);
    const res = await sendTestPush();
    setBusy(false);
    setMessage(res?.ok ? { tone: "accent", text: res.message ?? "Sent." } : { tone: "danger", text: res && !res.ok ? res.error : "Failed." });
  }

  return (
    <div className="space-y-3 p-4">
      {support === "checking" && <p className="text-[15px] text-muted">Checking this device…</p>}
      {support === "needs-install" && (
        <div className="space-y-2 text-[15px]">
          <p>To get notifications on iPhone, add this app to your Home Screen first:</p>
          <p className="text-muted">
            In Safari tap <Share className="inline size-4 align-[-2px]" aria-label="Share" />, then{" "}
            <SquarePlus className="inline size-4 align-[-2px]" aria-hidden /> <b>Add to Home Screen</b>. Open it from there and come back to this page.
          </p>
        </div>
      )}
      {support === "unsupported" && <p className="text-[15px] text-muted">This browser can&apos;t receive push notifications. Email reminders still work.</p>}
      {support === "ready" && !vapidKey && <Notice tone="warn">Push isn&apos;t configured on the server yet (VAPID keys). See docs/SETUP.md.</Notice>}
      {support === "ready" && vapidKey && (
        <>
          <p className="text-[15px]">{subscription ? "This device will get reminder notifications." : "Get reminders as notifications on this device."}</p>
          {subscription ? (
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={test} disabled={busy} className="flex-1">
                Send test
              </Button>
              <Button type="button" variant="danger" onClick={disable} disabled={busy} className="flex-1">
                Turn off
              </Button>
            </div>
          ) : (
            <Button type="button" onClick={enable} disabled={busy} block>
              {busy ? "Turning on…" : "Turn on notifications"}
            </Button>
          )}
        </>
      )}
      <p className="text-[13px] text-muted">
        {deviceCount} device{deviceCount === 1 ? "" : "s"} with notifications on for your account.
      </p>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
    </div>
  );
}
