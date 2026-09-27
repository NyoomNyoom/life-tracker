"use server";

import { verifyDismissToken } from "@/lib/links";
import { createAdminClient } from "@/lib/supabase/admin";

export type DismissState = { ok: boolean; message: string } | null;

// Public: the signed token is the authorisation, since email links usually open signed-out in Safari.
export async function dismissFromEmail(_prev: DismissState, formData: FormData): Promise<DismissState> {
  const token = verifyDismissToken(String(formData.get("token") ?? ""));
  if (!token) return { ok: false, message: "This link is invalid or has expired." };
  const db = createAdminClient();
  const { data: reminder } = await db.from("reminders").select("id, user_id").eq("id", token.reminderId).maybeSingle();
  if (!reminder) return { ok: false, message: "That reminder no longer exists." };
  const { error } = await db
    .from("reminder_events")
    .upsert(
      { reminder_id: reminder.id, user_id: reminder.user_id, occurrence_date: token.occurrenceDate, stage: "dismissed" },
      { onConflict: "reminder_id,occurrence_date,stage", ignoreDuplicates: true },
    );
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Done. No more reminders about this today." };
}
