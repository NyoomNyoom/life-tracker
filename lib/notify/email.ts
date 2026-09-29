import "server-only";

import { Resend } from "resend";
import { emailConfig } from "../server-env";

export function emailEnabled(): boolean {
  return emailConfig() !== null;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export type ReminderEmail = {
  to: string;
  title: string;
  body: string;
  openUrl: string;
  dismissUrl?: string;
};

export function renderReminderEmail({ title, body, openUrl, dismissUrl }: Omit<ReminderEmail, "to">): { html: string; text: string } {
  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#18181b">
  <div style="max-width:440px;margin:0 auto;background:#ffffff;border-radius:16px;padding:24px">
    <p style="margin:0 0 4px;font-size:13px;color:#71717a">Life Tracker</p>
    <h1 style="margin:0 0 8px;font-size:20px">${escapeHtml(title)}</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.5">${escapeHtml(body)}</p>
    <a href="${escapeHtml(openUrl)}" style="display:inline-block;padding:12px 18px;background:#16a34a;color:#ffffff;border-radius:10px;text-decoration:none;font-weight:600">Open Life Tracker</a>
    ${dismissUrl ? `<p style="margin:20px 0 0;font-size:13px"><a href="${escapeHtml(dismissUrl)}" style="color:#71717a">Dismiss this reminder for today</a></p>` : ""}
  </div>
  <p style="max-width:440px;margin:12px auto 0;font-size:12px;color:#a1a1aa;text-align:center">You set up this reminder in Life Tracker. Change or turn it off under More → Reminders.</p>
</body></html>`;
  const text = `${title}\n\n${body}\n\nOpen: ${openUrl}${dismissUrl ? `\nDismiss for today: ${dismissUrl}` : ""}\n`;
  return { html, text };
}

export async function sendEmail(message: ReminderEmail): Promise<{ ok: boolean; error?: string }> {
  const cfg = emailConfig();
  if (!cfg) return { ok: false, error: "Email is not configured (RESEND_API_KEY / EMAIL_FROM missing)" };
  const { html, text } = renderReminderEmail(message);
  const resend = new Resend(cfg.apiKey);
  const { error } = await resend.emails.send({ from: cfg.from, to: message.to, subject: message.title, html, text });
  return error ? { ok: false, error: `${error.name}: ${error.message}` } : { ok: true };
}
