"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
    __turnstileLoading?: Promise<void>;
  }
}

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  window.__turnstileLoading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load the CAPTCHA"));
    document.head.appendChild(s);
  });
  return window.__turnstileLoading;
}

/**
 * Cloudflare Turnstile widget. Adds a hidden `cf-turnstile-response` input to the surrounding form.
 * Tokens are single-use, so pass the latest action result as `resetOn`: each new result renders a fresh widget.
 * Renders nothing when no site key is configured (local development).
 */
export function Turnstile({ siteKey, resetOn }: { siteKey?: string; resetOn?: unknown }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!siteKey || !ref.current) return;
    let widgetId: string | undefined;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        widgetId = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          theme: "auto",
          size: "flexible",
          appearance: "interaction-only",
        });
      })
      .catch(console.error);
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey, resetOn]);

  if (!siteKey) return null;
  return <div ref={ref} className="min-h-0" />;
}
