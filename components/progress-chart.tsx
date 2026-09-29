"use client";

import { formatDuration } from "@/lib/dates";
import { formatDistance, type ExerciseKind } from "@/lib/training";
import { formatNumber, fromKg, type Unit } from "@/lib/units";
import { LineChart } from "./line-chart";

/** Single-series progress chart for one exercise (values arrive in stored units). */
export function ProgressChart({ points, kind, unit, label }: { points: { date: string; value: number }[]; kind: ExerciseKind; unit: Unit; label: string }) {
  const display = points.map((p) => ({ date: p.date, value: kind === "weight_reps" ? fromKg(p.value, unit) : p.value }));
  const format = (v: number) =>
    kind === "weight_reps" ? formatNumber(v, 1) : kind === "duration" ? formatDuration(v) : kind === "distance_time" ? formatDistance(v, unit) : String(Math.round(v));
  return (
    <LineChart
      ariaLabel={label}
      formatValue={format}
      endLabelSeries="metric"
      series={[{ id: "metric", label, color: "var(--training)", mark: "line+dots", points: display, lastPoint: { fill: "var(--ink)", ring: "var(--todos)" } }]}
    />
  );
}
