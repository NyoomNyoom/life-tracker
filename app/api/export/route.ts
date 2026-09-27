import type { NextRequest } from "next/server";
import { toCsv } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";

// CSV export of the signed-in user's data. Runs as the user, so RLS limits it to their rows.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) return new Response("Not signed in", { status: 401 });

  const type = request.nextUrl.searchParams.get("type");
  let csv: string;

  if (type === "weight") {
    const { data, error } = await supabase.from("weight_entries").select("entry_date, weight_kg, note").order("entry_date");
    if (error) return new Response(error.message, { status: 500 });
    csv = toCsv(
      ["date", "weight_kg", "weight_lb", "note"],
      data.map((r) => [r.entry_date, r.weight_kg, Math.round((Number(r.weight_kg) / 0.45359237) * 10) / 10, r.note]),
    );
  } else if (type === "workouts") {
    const { data, error } = await supabase
      .from("workout_sets")
      .select("exercise_position, set_number, reps, weight_kg, duration_seconds, distance_m, is_warmup, is_pr, exercise:exercises(name), workout:workouts(workout_date, name, notes)")
      .order("created_at");
    if (error) return new Response(error.message, { status: 500 });
    const rows = data
      .map((s) => [s.workout?.workout_date, s.workout?.name, s.exercise?.name, s.set_number, s.is_warmup, s.reps, s.weight_kg, s.duration_seconds, s.distance_m, s.is_pr, s.exercise_position] as const)
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])) || Number(a[10]) - Number(b[10]) || Number(a[3]) - Number(b[3]));
    csv = toCsv(
      ["date", "workout", "exercise", "set", "warmup", "reps", "weight_kg", "duration_seconds", "distance_m", "personal_record"],
      rows.map((r) => r.slice(0, 10) as (string | number | boolean | null | undefined)[]),
    );
  } else if (type === "todos") {
    const [{ data: todos, error }, { data: done }] = await Promise.all([
      supabase.from("todos").select("id, title, notes, schedule, due_date, weekdays, month_day, active, created_at").order("created_at"),
      supabase.from("todo_completions").select("todo_id, occurrence_date"),
    ]);
    if (error) return new Response(error.message, { status: 500 });
    csv = toCsv(
      ["title", "schedule", "due_date", "weekdays", "month_day", "active", "notes", "completed_on"],
      (todos ?? []).map((t) => [
        t.title,
        t.schedule,
        t.due_date,
        t.weekdays?.join(" "),
        t.month_day,
        t.active,
        t.notes,
        (done ?? []).filter((d) => d.todo_id === t.id).map((d) => d.occurrence_date).sort().join(" "),
      ]),
    );
  } else {
    return new Response("Unknown export type", { status: 400 });
  }

  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="life-tracker-${type}-${date}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
