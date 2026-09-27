"use client";

import { useMemo, useState } from "react";
import { addDays } from "@/lib/dates";
import { movingAverage } from "@/lib/training";
import { formatNumber, fromKg, type Unit } from "@/lib/units";
import { Segmented } from "./form-controls";
import { LineChart } from "./line-chart";

type Range = "30" | "90" | "365" | "all";

export function WeightChart({ entries, unit, today }: { entries: { date: string; kg: number }[]; unit: Unit; today: string }) {
  const [range, setRange] = useState<Range>("90");

  const { raw, avg, change } = useMemo(() => {
    const all = entries.map((e) => ({ date: e.date, value: fromKg(e.kg, unit) }));
    // Average over the full history, then cut to the range, so the first days of the range are still averaged.
    const allAvg = movingAverage(all, 7);
    const from = range === "all" ? "0000-00-00" : addDays(today, -Number(range) + 1);
    const raw = all.filter((p) => p.date >= from);
    const avg = allAvg.filter((p) => p.date >= from);
    const change = avg.length > 1 ? avg[avg.length - 1].value - avg[0].value : null;
    return { raw, avg, change };
  }, [entries, unit, range, today]);

  return (
    <div className="space-y-3 px-4 pb-4">
      <Segmented
        value={range}
        onChange={setRange}
        options={[
          { value: "30", label: "30 days" },
          { value: "90", label: "90 days" },
          { value: "365", label: "1 year" },
          { value: "all", label: "All" },
        ]}
      />
      {raw.length === 0 ? (
        <p className="py-10 text-center text-[14px] text-muted">No weigh-ins in this range.</p>
      ) : (
        <>
          {change != null && (
            <p className="text-[14px] text-muted">
              7-day average {change <= 0 ? "down" : "up"}{" "}
              <span className="font-semibold text-fg tabular">
                {formatNumber(Math.abs(change), 1)} {unit}
              </span>{" "}
              over this range
            </p>
          )}
          <LineChart
            ariaLabel={`Body weight in ${unit}, daily weigh-ins and 7-day average`}
            formatValue={(v) => formatNumber(v, 1)}
            endLabelSeries="avg"
            series={[
              { id: "raw", label: "Daily weigh-in", color: "var(--chart-raw)", mark: "dots", points: raw },
              { id: "avg", label: "7-day average", color: "var(--chart-trend)", mark: "line", points: avg },
            ]}
          />
        </>
      )}
    </div>
  );
}
