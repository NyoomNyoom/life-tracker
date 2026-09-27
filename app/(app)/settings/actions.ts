"use server";

import { IANAZone } from "luxon";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { pushEnabled, sendPush } from "@/lib/notify/push";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewerOrNull, type ActionResult } from "@/lib/viewer";

export async function updateProfile(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const viewer = await getViewerOrNull();
  if (!viewer) return { ok: false, error: "You've been signed out. Sign in again." };
  const parsed = z
    .object({
      display_name: z.string().trim().max(60),
      unit: z.enum(["kg", "lb"]),
      timezone: z.string().refine((tz) => IANAZone.isValidZone(tz), "Pick a valid timezone."),
      weekly_workout_goal: z.coerce.number().int().min(1).max(14),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { error } = await viewer.supabase
    .from("profiles")
    .update({ ...parsed.data, display_name: parsed.data.display_name || null })
    .eq("id", viewer.userId);
  if (error) return { ok: false, error: error.message.includes("timezone") ? "That timezone isn't supported." : error.message };
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved" };
}

const subscriptionSchema = z.object({
  endpoint: z.url().max(2000),
  keys: z.object({ p256dh: z.string().min(1).max(500), auth: z.string().min(1).max(200) }),
});

export async function savePushSubscription(subscription: unknown, userAgent: string): Promise<ActionResult> {
  const viewer = await getViewerOrNull();
  if (!viewer) return { ok: false, error: "Signed out" };
  const sub = subscriptionSchema.safeParse(subscription);
  if (!sub.success) return { ok: false, error: "The browser returned an invalid subscription." };

  // A device endpoint belongs to whoever enabled it last (e.g. a shared phone switching accounts),
  // so drop any existing row for it before saving. The admin client is needed to see other users' rows.
  const admin = createAdminClient();
  await admin.from("push_subscriptions").delete().eq("endpoint", sub.data.endpoint);
  const { error } = await admin.from("push_subscriptions").insert({
    user_id: viewer.userId,
    endpoint: sub.data.endpoint,
    p256dh: sub.data.keys.p256dh,
    auth: sub.data.keys.auth,
    user_agent: userAgent.slice(0, 300),
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const viewer = await getViewerOrNull();
  if (!viewer) return;
  await viewer.supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  revalidatePath("/", "layout");
}

export async function sendTestPush(): Promise<ActionResult> {
  const viewer = await getViewerOrNull();
  if (!viewer) return { ok: false, error: "Signed out" };
  if (!pushEnabled()) return { ok: false, error: "Push isn't configured on the server (VAPID keys missing)." };
  const { data: subs } = await viewer.supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth");
  if (!subs?.length) return { ok: false, error: "No devices have notifications turned on." };
  const results = await Promise.all(subs.map((s) => sendPush(s, { title: "Test notification", body: "Notifications are working 🎉", url: "/settings" })));
  const gone = results.filter((r) => r.gone).map((r) => r.id);
  if (gone.length) await viewer.supabase.from("push_subscriptions").delete().in("id", gone);
  const ok = results.filter((r) => r.ok).length;
  return ok > 0
    ? { ok: true, message: `Sent to ${ok} device${ok === 1 ? "" : "s"}.` }
    : { ok: false, error: results[0]?.error ?? "Sending failed." };
}

export async function deleteAccount(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const viewer = await getViewerOrNull();
  if (!viewer) return { ok: false, error: "Signed out" };
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "DELETE") {
    return { ok: false, error: "Type DELETE to confirm." };
  }
  // Deleting the auth user cascades to the profile and every row that belongs to it.
  const { error } = await createAdminClient().auth.admin.deleteUser(viewer.userId);
  if (error) return { ok: false, error: error.message };
  await viewer.supabase.auth.signOut();
  redirect("/login?deleted=1");
}
