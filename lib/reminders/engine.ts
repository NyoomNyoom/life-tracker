import { DateTime } from "luxon";
import { addDays, isoWeekday } from "../dates";
import { occursOn, type TodoLike } from "../todos";

// Pure scheduling logic for reminders: given a rule, the user's timezone, the current instant and
// what has already been sent, decide whether a notification is due. No I/O here, so it's unit-tested.

export type ReminderKind = "weight" | "workout" | "todo";
export type Stage = "initial" | "follow_up";

export type ReminderRule = {
  id: string;
  kind: ReminderKind;
  time_of_day: string; // "HH:MM" or "HH:MM:SS", local to the user
  weekdays: number[]; // ISO 1..7; ignored for to-do reminders (the to-do's own schedule applies)
  follow_up_minutes: number | null;
  created_at: string; // ISO instant
  todo: TodoLike | null;
};

export type SentEvent = {
  occurrence_date: string;
  stage: Stage | "dismissed";
  created_at: string; // ISO instant
};

export type DueReminder = {
  occurrenceDate: string;
  stage: Stage;
};

/** How late a notification may still go out, e.g. if the scheduler was briefly down. */
export const GRACE_MINUTES = 90;

/** Whether the rule applies on a given local date at all. */
export function appliesOn(rule: ReminderRule, date: string): boolean {
  if (rule.kind === "todo") return rule.todo != null && occursOn(rule.todo, date);
  return rule.weekdays.includes(isoWeekday(date));
}

/** The instant a rule fires on a local date. Times inside a DST gap move forward (luxon's behaviour). */
export function dueInstant(rule: ReminderRule, date: string, timezone: string): DateTime {
  const time = rule.time_of_day.length === 5 ? `${rule.time_of_day}:00` : rule.time_of_day;
  return DateTime.fromISO(`${date}T${time}`, { zone: timezone });
}

/**
 * Returns the notification that should be sent now for this rule, or null.
 * Checks today and yesterday (local), so a 23:55 reminder still goes out if the run lands after midnight.
 * Whether the thing has already been done (weight logged etc.) is checked separately by the dispatcher.
 */
export function findDue(rule: ReminderRule, timezone: string, now: DateTime, events: SentEvent[]): DueReminder | null {
  const today = now.setZone(timezone).toISODate()!;
  const createdAt = DateTime.fromISO(rule.created_at);

  for (const date of [today, addDays(today, -1)]) {
    if (!appliesOn(rule, date)) continue;

    const dueAt = dueInstant(rule, date, timezone);
    // A reminder created after its time has passed today starts tomorrow.
    if (dueAt < createdAt) continue;

    const forDate = events.filter((e) => e.occurrence_date === date);
    if (forDate.some((e) => e.stage === "dismissed")) continue;

    const initial = forDate.find((e) => e.stage === "initial");
    if (!initial) {
      if (now >= dueAt && now < dueAt.plus({ minutes: GRACE_MINUTES })) {
        return { occurrenceDate: date, stage: "initial" };
      }
      continue;
    }

    if (rule.follow_up_minutes && !forDate.some((e) => e.stage === "follow_up")) {
      const sentAt = DateTime.fromISO(initial.created_at);
      const followAt = (sentAt > dueAt ? sentAt : dueAt).plus({ minutes: rule.follow_up_minutes });
      if (now >= followAt && now < followAt.plus({ minutes: GRACE_MINUTES })) {
        return { occurrenceDate: date, stage: "follow_up" };
      }
    }
  }
  return null;
}

export type ReminderMessage = { title: string; body: string; path: string };

export function buildMessage(
  kind: ReminderKind,
  stage: Stage,
  label: string | null,
  todoTitle: string | null,
): ReminderMessage {
  const again = stage === "follow_up";
  switch (kind) {
    case "weight":
      return {
        title: label || (again ? "Still time to weigh in" : "Log your weight"),
        body: again ? "You haven't logged your weight yet today." : "You haven't logged your weight today. It takes 5 seconds.",
        path: "/weight",
      };
    case "workout":
      return {
        title: label || (again ? "Gym day reminder" : "It's a gym day"),
        body: again ? "Still no workout logged today. Even a short session counts." : "No workout logged yet today. Time to train?",
        path: "/workouts/new",
      };
    case "todo":
      return {
        title: label || todoTitle || "To-do",
        body: again ? `Still to do today: ${todoTitle ?? "your task"}` : `Due today: ${todoTitle ?? "your task"}`,
        path: "/todos",
      };
  }
}
