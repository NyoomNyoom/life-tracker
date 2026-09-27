import { z } from "zod";

// Shared parsing for the reminder fields that appear on both the reminder and to-do forms.

export const FOLLOW_UP_OPTIONS = [
  { value: 0, label: "No follow-up" },
  { value: 15, label: "After 15 min" },
  { value: 30, label: "After 30 min" },
  { value: 60, label: "After 1 hour" },
  { value: 120, label: "After 2 hours" },
  { value: 180, label: "After 3 hours" },
];

export const reminderFieldsSchema = z.object({
  time_of_day: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Pick a time."),
  channel: z.enum(["push", "email", "both"]),
  follow_up_minutes: z.coerce.number().int().min(0).max(720),
});

export function readReminderFields(formData: FormData) {
  return reminderFieldsSchema.safeParse({
    time_of_day: formData.get("time_of_day"),
    channel: formData.get("channel") ?? "push",
    follow_up_minutes: formData.get("follow_up_minutes") ?? 0,
  });
}

export function readWeekdays(formData: FormData): number[] {
  return [...new Set(formData.getAll("weekdays").map(Number))].filter((d) => d >= 1 && d <= 7).sort();
}
