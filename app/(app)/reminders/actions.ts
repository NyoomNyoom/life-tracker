"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { readReminderFields, readWeekdays } from "@/lib/reminder-form";
import { getViewerOrNull, type ActionResult } from "@/lib/viewer";

export async function saveReminder(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const viewer = await getViewerOrNull();
  if (!viewer) return { ok: false, error: "You've been signed out. Sign in again." };

  const id = z.uuid().safeParse(formData.get("id")).data;
  const kind = z.enum(["weight", "workout"]).safeParse(formData.get("kind"));
  if (!id && !kind.success) return { ok: false, error: "Unknown reminder type." };

  const fields = readReminderFields(formData);
  if (!fields.success) return { ok: false, error: fields.error.issues[0].message };
  const weekdays = readWeekdays(formData);
  if (weekdays.length === 0) return { ok: false, error: "Pick at least one day." };

  const row = {
    label: String(formData.get("label") ?? "").trim().slice(0, 80) || null,
    time_of_day: fields.data.time_of_day,
    weekdays,
    channel: fields.data.channel,
    follow_up_minutes: fields.data.follow_up_minutes || null,
    enabled: formData.get("enabled") !== "off",
  };

  const { error } = id
    ? await viewer.supabase.from("reminders").update(row).eq("id", id)
    : await viewer.supabase.from("reminders").insert({ ...row, user_id: viewer.userId, kind: kind.data! });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  redirect("/reminders");
}

export async function setReminderEnabled(id: string, enabled: boolean) {
  const viewer = await getViewerOrNull();
  if (!viewer || !z.uuid().safeParse(id).success) return;
  await viewer.supabase.from("reminders").update({ enabled }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function deleteReminder(formData: FormData) {
  const viewer = await getViewerOrNull();
  if (!viewer) redirect("/login");
  const id = z.uuid().safeParse(formData.get("id"));
  if (id.success) await viewer.supabase.from("reminders").delete().eq("id", id.data);
  revalidatePath("/", "layout");
  redirect("/reminders");
}

/** "Skip today": no (more) notifications for this reminder on the given day. */
export async function skipReminder(id: string, date: string, skip: boolean) {
  const viewer = await getViewerOrNull();
  if (!viewer || !z.uuid().safeParse(id).success || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  if (skip) {
    await viewer.supabase
      .from("reminder_events")
      .upsert(
        { reminder_id: id, user_id: viewer.userId, occurrence_date: date, stage: "dismissed" },
        { onConflict: "reminder_id,occurrence_date,stage", ignoreDuplicates: true },
      );
  } else {
    await viewer.supabase.from("reminder_events").delete().eq("reminder_id", id).eq("occurrence_date", date).eq("stage", "dismissed");
  }
  revalidatePath("/", "layout");
}
