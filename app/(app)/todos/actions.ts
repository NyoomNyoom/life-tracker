"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { readReminderFields, readWeekdays } from "@/lib/reminder-form";
import { getViewerOrNull, type ActionResult } from "@/lib/viewer";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const todoSchema = z
  .object({
    title: z.string().trim().min(1, "Give it a title.").max(120),
    notes: z.string().trim().max(1000),
    schedule: z.enum(["once", "daily", "weekly", "monthly"]),
    due_date: isoDate.nullable(),
    weekdays: z.array(z.number().int().min(1).max(7)),
    month_day: z.number().int().min(1).max(31).nullable(),
  })
  .superRefine((t, ctx) => {
    if (t.schedule === "once" && !t.due_date) ctx.addIssue({ code: "custom", message: "Pick the date it's due." });
    if (t.schedule === "weekly" && t.weekdays.length === 0) ctx.addIssue({ code: "custom", message: "Pick at least one day." });
    if (t.schedule === "monthly" && !t.month_day) ctx.addIssue({ code: "custom", message: "Pick a day of the month." });
  });

export async function saveTodo(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const viewer = await getViewerOrNull();
  if (!viewer) return { ok: false, error: "You've been signed out. Sign in again." };
  const { supabase, userId } = viewer;

  const id = z.uuid().safeParse(formData.get("id")).data;
  const parsed = todoSchema.safeParse({
    title: formData.get("title") ?? "",
    notes: formData.get("notes") ?? "",
    schedule: formData.get("schedule"),
    due_date: formData.get("due_date") || null,
    weekdays: readWeekdays(formData),
    month_day: formData.get("month_day") ? Number(formData.get("month_day")) : null,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const t = parsed.data;

  const row = {
    title: t.title,
    notes: t.notes || null,
    schedule: t.schedule,
    due_date: t.schedule === "once" ? t.due_date : null,
    weekdays: t.schedule === "weekly" ? t.weekdays : null,
    month_day: t.schedule === "monthly" ? t.month_day : null,
    active: formData.get("active") !== "off",
  };

  let todoId = id;
  if (todoId) {
    const { error } = await supabase.from("todos").update(row).eq("id", todoId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data, error } = await supabase.from("todos").insert({ ...row, user_id: userId }).select("id").single();
    if (error) return { ok: false, error: error.message };
    todoId = data.id;
  }

  // Optional reminder, stored as a 'todo' reminder linked to this to-do.
  const { data: existing } = await supabase.from("reminders").select("id").eq("todo_id", todoId).maybeSingle();
  if (formData.get("remind") === "on") {
    const fields = readReminderFields(formData);
    if (!fields.success) return { ok: false, error: fields.error.issues[0].message };
    const reminder = {
      time_of_day: fields.data.time_of_day,
      channel: fields.data.channel,
      follow_up_minutes: fields.data.follow_up_minutes || null,
      enabled: true,
    };
    const { error } = existing
      ? await supabase.from("reminders").update(reminder).eq("id", existing.id)
      : await supabase.from("reminders").insert({ ...reminder, user_id: userId, kind: "todo", todo_id: todoId });
    if (error) return { ok: false, error: error.message };
  } else if (existing) {
    await supabase.from("reminders").delete().eq("id", existing.id);
  }

  revalidatePath("/", "layout");
  redirect("/todos");
}

export async function toggleTodo(todoId: string, date: string, done: boolean) {
  const viewer = await getViewerOrNull();
  if (!viewer) return;
  if (!z.uuid().safeParse(todoId).success || !isoDate.safeParse(date).success) return;
  if (done) {
    await viewer.supabase
      .from("todo_completions")
      .upsert({ todo_id: todoId, user_id: viewer.userId, occurrence_date: date }, { onConflict: "todo_id,occurrence_date", ignoreDuplicates: true });
  } else {
    await viewer.supabase.from("todo_completions").delete().eq("todo_id", todoId).eq("occurrence_date", date);
  }
  revalidatePath("/", "layout");
}

export async function deleteTodo(formData: FormData) {
  const viewer = await getViewerOrNull();
  if (!viewer) redirect("/login");
  const id = z.uuid().safeParse(formData.get("id"));
  if (id.success) await viewer.supabase.from("todos").delete().eq("id", id.data);
  revalidatePath("/", "layout");
  redirect("/todos");
}
