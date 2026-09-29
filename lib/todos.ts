import { isoWeekday, parseISODate } from "./dates";

export type TodoSchedule = "once" | "daily" | "weekly" | "monthly";

export type TodoLike = {
  schedule: TodoSchedule | string;
  due_date: string | null;
  weekdays: number[] | null;
  month_day: number | null;
  active: boolean;
};

/** Whether a to-do is due on the given day. Monthly to-dos on the 29th-31st fall on the last day of shorter months. */
export function occursOn(todo: TodoLike, date: string): boolean {
  if (!todo.active) return false;
  switch (todo.schedule) {
    case "once":
      return todo.due_date === date;
    case "daily":
      return true;
    case "weekly":
      return (todo.weekdays ?? []).includes(isoWeekday(date));
    case "monthly": {
      if (!todo.month_day) return false;
      const d = parseISODate(date);
      return d.day === Math.min(todo.month_day, d.daysInMonth!);
    }
    default:
      return false;
  }
}

/** A one-off to-do whose date has passed without being completed. */
export function isOverdue(todo: TodoLike, today: string, completed: boolean): boolean {
  return todo.active && todo.schedule === "once" && !!todo.due_date && todo.due_date < today && !completed;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function describeSchedule(todo: TodoLike, describeWeekdays: (d: number[]) => string): string {
  switch (todo.schedule) {
    case "once":
      return todo.due_date ? `Once on ${parseISODate(todo.due_date).toFormat("ccc d LLL")}` : "Once";
    case "daily":
      return "Every day";
    case "weekly":
      return describeWeekdays(todo.weekdays ?? []);
    case "monthly":
      return todo.month_day ? `Monthly on the ${ordinal(todo.month_day)}` : "Monthly";
    default:
      return "";
  }
}
