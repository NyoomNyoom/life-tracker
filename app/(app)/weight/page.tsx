import type { Metadata } from "next";
import { Trash2 } from "lucide-react";
import { WeightChart } from "@/components/weight-chart";
import { WeightLogForm } from "@/components/weight-log-form";
import { Card, CardHeader, EmptyState } from "@/components/ui";
import { friendlyDate } from "@/lib/dates";
import { formatWeight, inputValue } from "@/lib/units";
import { getViewer } from "@/lib/viewer";
import { deleteWeight } from "./actions";

export const metadata: Metadata = { title: "Weight" };

export default async function WeightPage() {
  const { supabase, unit, today } = await getViewer();
  const { data: entries } = await supabase
    .from("weight_entries")
    .select("id, entry_date, weight_kg, note")
    .order("entry_date", { ascending: true });

  const list = entries ?? [];
  const latest = list.at(-1);
  const loggedToday = latest?.entry_date === today;

  return (
    <>
      <header className="px-4 pt-4 pb-3">
        <h1 className="text-[28px] font-bold tracking-tight">Weight</h1>
        {latest && (
          <p className="mt-0.5 text-[15px] text-muted">
            Latest <span className="font-semibold text-fg">{formatWeight(Number(latest.weight_kg), unit)}</span> ·{" "}
            {friendlyDate(latest.entry_date, today)}
          </p>
        )}
      </header>

      <Card>
        <CardHeader title={loggedToday ? "Update today" : "Log today"} />
        <div className="px-4 pb-4">
          <WeightLogForm unit={unit} today={today} showDate defaultValue={latest ? inputValue(Number(latest.weight_kg), unit) : undefined} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Trend" />
        <WeightChart entries={list.map((e) => ({ date: e.entry_date, kg: Number(e.weight_kg) }))} unit={unit} today={today} />
      </Card>

      <Card>
        <CardHeader title="History" />
        {list.length === 0 ? (
          <EmptyState title="No weigh-ins yet" body="Log your first one above. Weighing at the same time each morning gives the cleanest trend." />
        ) : (
          <ul className="divide-y divide-border">
            {[...list].reverse().map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-[16px] font-medium tabular">{formatWeight(Number(e.weight_kg), unit)}</div>
                  <div className="text-[13px] text-muted">{friendlyDate(e.entry_date, today)}</div>
                </div>
                <form action={deleteWeight}>
                  <input type="hidden" name="id" value={e.id} />
                  <button type="submit" className="p-2 text-faint active:text-danger" aria-label={`Delete entry for ${e.entry_date}`}>
                    <Trash2 className="size-4" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
