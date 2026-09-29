import type { Metadata } from "next";
import { Trash2 } from "lucide-react";
import { WeightChart } from "@/components/weight-chart";
import { WeightLogForm } from "@/components/weight-log-form";
import { EmptyState, PageHeader, Rows, Tile, TileHeader } from "@/components/ui";
import { friendlyDate } from "@/lib/dates";
import { formatWeight, inputValue, type Unit } from "@/lib/units";
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
      <PageHeader
        title="Weight"
        subtitle={
          latest && (
            <>
              Latest <span className="font-extrabold text-ink">{formatWeight(Number(latest.weight_kg), unit)}</span> · {friendlyDate(latest.entry_date, today)}
            </>
          )
        }
      />

      <Tile tone="weight">
        <TileHeader title={loggedToday ? "Update today" : "Log today"} />
        <WeightLogForm unit={unit} today={today} showDate defaultValue={latest ? inputValue(Number(latest.weight_kg), unit) : undefined} />
      </Tile>

      <Tile>
        <TileHeader title="Trend" />
        <WeightChart entries={list.map((e) => ({ date: e.entry_date, kg: Number(e.weight_kg) }))} unit={unit} today={today} />
      </Tile>

      <Tile>
        <TileHeader title="History" />
        {list.length === 0 ? (
          <EmptyState title="No weigh-ins yet" body="Log your first one above. Weighing at the same time each morning gives the cleanest trend." />
        ) : (
          <>
            <WeightHistory entries={[...list].reverse().slice(0, 14)} unit={unit} today={today} />
            {list.length > 14 && (
              <details className="group">
                <summary className="cursor-pointer list-none border-t border-current/12 pt-4 pb-1 text-center text-[17px] font-bold underline underline-offset-4 group-open:hidden">
                  Show all {list.length} weigh-ins
                </summary>
                <div className="border-t border-current/12">
                  <WeightHistory entries={[...list].reverse().slice(14)} unit={unit} today={today} />
                </div>
              </details>
            )}
          </>
        )}
      </Tile>
    </>
  );
}

function WeightHistory({
  entries,
  unit,
  today,
}: {
  entries: { id: string; entry_date: string; weight_kg: number }[];
  unit: Unit;
  today: string;
}) {
  return (
    <Rows>
      {entries.map((e) => (
        <div key={e.id} className="flex items-center gap-3 py-3">
          <div className="min-w-0 flex-1">
            <div className="text-[19px] font-extrabold tracking-tight">{formatWeight(Number(e.weight_kg), unit)}</div>
            <div className="text-[15px] font-medium text-muted">{friendlyDate(e.entry_date, today)}</div>
          </div>
          <form action={deleteWeight}>
            <input type="hidden" name="id" value={e.id} />
            <button
              type="submit"
              className="-mr-2 flex size-11 items-center justify-center rounded-full text-muted active:bg-danger-soft active:text-danger"
              aria-label={`Delete entry for ${e.entry_date}`}
            >
              <Trash2 className="size-5" />
            </button>
          </form>
        </div>
      ))}
    </Rows>
  );
}
