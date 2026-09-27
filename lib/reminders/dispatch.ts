import "server-only";

import { DateTime } from "luxon";
import { siteUrl } from "../env";
import { createDismissToken } from "../links";
import { emailEnabled, sendEmail } from "../notify/email";
import { pushEnabled, sendPush } from "../notify/push";
import { createAdminClient } from "../supabase/admin";
import { buildMessage, findDue, type ReminderKind, type SentEvent, type Stage } from "./engine";

// Runs every 5 minutes (Supabase pg_cron -> POST /api/cron/reminders). Uses the secret key because
// it works across all users; every query below is scoped explicitly by user or reminder id.

type Channel = "push" | "email" | "both";

export type DispatchSummary = {
  at: string;
  rules: number;
  due: number;
  alreadyDone: number;
  sent: number;
  skippedDuplicate: number;
  failures: { reminderId: string; error: string }[];
};

type DueItem = {
  reminderId: string;
  userId: string;
  kind: ReminderKind;
  channel: Channel;
  label: string | null;
  todoId: string | null;
  todoTitle: string | null;
  email: string;
  occurrenceDate: string;
  stage: Stage;
};

export async function dispatchReminders(now: DateTime = DateTime.utc()): Promise<DispatchSummary> {
  const db = createAdminClient();
  const summary: DispatchSummary = {
    at: now.toISO()!,
    rules: 0,
    due: 0,
    alreadyDone: 0,
    sent: 0,
    skippedDuplicate: 0,
    failures: [],
  };

  const { data: rules, error: rulesError } = await db
    .from("reminders")
    .select(
      "id, user_id, kind, label, time_of_day, weekdays, channel, follow_up_minutes, created_at, todo_id, " +
        "todo:todos(title, schedule, due_date, weekdays, month_day, active), profile:profiles(timezone, email)",
    )
    .eq("enabled", true)
    .returns<
      {
        id: string;
        user_id: string;
        kind: ReminderKind;
        label: string | null;
        time_of_day: string;
        weekdays: number[];
        channel: Channel;
        follow_up_minutes: number | null;
        created_at: string;
        todo_id: string | null;
        todo: { title: string; schedule: string; due_date: string | null; weekdays: number[] | null; month_day: number | null; active: boolean } | null;
        profile: { timezone: string; email: string } | null;
      }[]
    >();
  if (rulesError) throw new Error(`Loading reminders failed: ${rulesError.message}`);
  summary.rules = rules.length;
  if (rules.length === 0) return summary;

  // Events from the last few days are enough: the engine only looks at today and yesterday (local).
  const { data: events, error: eventsError } = await db
    .from("reminder_events")
    .select("reminder_id, occurrence_date, stage, created_at")
    .gte("occurrence_date", now.minus({ days: 3 }).toISODate()!);
  if (eventsError) throw new Error(`Loading reminder history failed: ${eventsError.message}`);

  const eventsByReminder = new Map<string, SentEvent[]>();
  for (const e of events) {
    const list = eventsByReminder.get(e.reminder_id) ?? [];
    list.push({ occurrence_date: e.occurrence_date, stage: e.stage as SentEvent["stage"], created_at: e.created_at });
    eventsByReminder.set(e.reminder_id, list);
  }

  const due: DueItem[] = [];
  for (const rule of rules) {
    if (!rule.profile) continue;
    const hit = findDue(
      {
        id: rule.id,
        kind: rule.kind,
        time_of_day: rule.time_of_day,
        weekdays: rule.weekdays,
        follow_up_minutes: rule.follow_up_minutes,
        created_at: rule.created_at,
        todo: rule.todo,
      },
      rule.profile.timezone,
      now,
      eventsByReminder.get(rule.id) ?? [],
    );
    if (hit) {
      due.push({
        reminderId: rule.id,
        userId: rule.user_id,
        kind: rule.kind,
        channel: rule.channel,
        label: rule.label,
        todoId: rule.todo_id,
        todoTitle: rule.todo?.title ?? null,
        email: rule.profile.email,
        occurrenceDate: hit.occurrenceDate,
        stage: hit.stage,
      });
    }
  }
  summary.due = due.length;
  if (due.length === 0) return summary;

  const done = await findAlreadyDone(db, due);
  const toSend = due.filter((d) => !done.has(doneKey(d)));
  summary.alreadyDone = due.length - toSend.length;
  if (toSend.length === 0) return summary;

  const userIds = [...new Set(toSend.map((d) => d.userId))];
  const { data: subs } = await db
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);

  await Promise.all(
    toSend.map(async (item) => {
      // Claim the send first. The unique (reminder, date, stage) constraint makes this safe even if
      // two dispatcher runs overlap: only one of them gets the row back.
      const { data: claimed, error: claimError } = await db
        .from("reminder_events")
        .upsert(
          { reminder_id: item.reminderId, user_id: item.userId, occurrence_date: item.occurrenceDate, stage: item.stage },
          { onConflict: "reminder_id,occurrence_date,stage", ignoreDuplicates: true },
        )
        .select("id");
      if (claimError) {
        summary.failures.push({ reminderId: item.reminderId, error: claimError.message });
        return;
      }
      if (!claimed || claimed.length === 0) {
        summary.skippedDuplicate++;
        return;
      }

      const result = await deliver(db, item, (subs ?? []).filter((s) => s.user_id === item.userId));
      await db
        .from("reminder_events")
        .update({ delivered_via: result.deliveredVia, error: result.errors.join("; ") || null })
        .eq("id", claimed[0].id);

      if (result.deliveredVia.length > 0) summary.sent++;
      else summary.failures.push({ reminderId: item.reminderId, error: result.errors.join("; ") || "No delivery channel available" });
    }),
  );

  return summary;
}

function doneKey(d: Pick<DueItem, "kind" | "userId" | "todoId" | "occurrenceDate">) {
  return `${d.kind}|${d.kind === "todo" ? d.todoId : d.userId}|${d.occurrenceDate}`;
}

/** Which due items are already satisfied (weight logged, workout logged, to-do ticked off). */
async function findAlreadyDone(db: ReturnType<typeof createAdminClient>, due: DueItem[]): Promise<Set<string>> {
  const done = new Set<string>();
  const dates = [...new Set(due.map((d) => d.occurrenceDate))];

  const weightUsers = [...new Set(due.filter((d) => d.kind === "weight").map((d) => d.userId))];
  if (weightUsers.length) {
    const { data, error } = await db.from("weight_entries").select("user_id, entry_date").in("user_id", weightUsers).in("entry_date", dates);
    if (error) throw new Error(`Checking weight entries failed: ${error.message}`);
    data.forEach((r) => done.add(`weight|${r.user_id}|${r.entry_date}`));
  }

  const workoutUsers = [...new Set(due.filter((d) => d.kind === "workout").map((d) => d.userId))];
  if (workoutUsers.length) {
    const { data, error } = await db.from("workouts").select("user_id, workout_date").in("user_id", workoutUsers).in("workout_date", dates);
    if (error) throw new Error(`Checking workouts failed: ${error.message}`);
    data.forEach((r) => done.add(`workout|${r.user_id}|${r.workout_date}`));
  }

  const todoIds = [...new Set(due.filter((d) => d.kind === "todo" && d.todoId).map((d) => d.todoId!))];
  if (todoIds.length) {
    const { data, error } = await db.from("todo_completions").select("todo_id, occurrence_date").in("todo_id", todoIds).in("occurrence_date", dates);
    if (error) throw new Error(`Checking to-dos failed: ${error.message}`);
    data.forEach((r) => done.add(`todo|${r.todo_id}|${r.occurrence_date}`));
  }

  return done;
}

async function deliver(
  db: ReturnType<typeof createAdminClient>,
  item: DueItem,
  subs: { id: string; endpoint: string; p256dh: string; auth: string }[],
): Promise<{ deliveredVia: string[]; errors: string[] }> {
  const message = buildMessage(item.kind, item.stage, item.label, item.todoTitle);
  const deliveredVia: string[] = [];
  const errors: string[] = [];

  if (item.channel === "push" || item.channel === "both") {
    if (!pushEnabled()) {
      errors.push("push: not configured");
    } else if (subs.length === 0) {
      errors.push("push: no devices subscribed");
    } else {
      const results = await Promise.all(
        subs.map((s) =>
          sendPush(s, { title: message.title, body: message.body, url: message.path, tag: `${item.reminderId}` }),
        ),
      );
      const ok = results.filter((r) => r.ok).map((r) => r.id);
      const gone = results.filter((r) => r.gone).map((r) => r.id);
      if (ok.length) {
        deliveredVia.push("push");
        await db.from("push_subscriptions").update({ last_used_at: new Date().toISOString() }).in("id", ok);
      }
      if (gone.length) await db.from("push_subscriptions").delete().in("id", gone);
      results.filter((r) => !r.ok).forEach((r) => errors.push(`push: ${r.error}`));
    }
  }

  // Email if asked for, or as the fallback when a push-only reminder couldn't reach any device.
  const wantsEmail = item.channel === "email" || item.channel === "both";
  const fallback = item.channel === "push" && !deliveredVia.includes("push");
  if (wantsEmail || fallback) {
    if (!emailEnabled()) {
      errors.push("email: not configured");
    } else {
      const base = siteUrl();
      const token = createDismissToken(item.reminderId, item.occurrenceDate);
      const res = await sendEmail({
        to: item.email,
        title: message.title,
        body: message.body,
        openUrl: `${base}${message.path}`,
        dismissUrl: `${base}/dismiss?token=${encodeURIComponent(token)}`,
      });
      if (res.ok) deliveredVia.push(fallback ? "email_fallback" : "email");
      else errors.push(`email: ${res.error}`);
    }
  }

  return { deliveredVia, errors };
}
