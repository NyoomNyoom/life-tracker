"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { parseISODate, shortDate } from "@/lib/dates";

// Small dependency-free time-series chart.
// Follows the dataviz rules: 2px lines, >=8px dots with a 2px surface ring, hairline recessive grid,
// a legend whenever there are 2+ series, a crosshair that snaps to the nearest date, and a tooltip
// listing every series at that date (also reachable with the arrow keys).

export type Series = {
  id: string;
  label: string;
  /** CSS color, e.g. "var(--weight)" */
  color: string;
  mark: "line" | "dots" | "line+dots";
  points: { date: string; value: number }[];
  /** Draw the last point larger, in these colours (and label it, if it's the end-label series). */
  lastPoint?: { fill: string; ring: string };
};

type Props = {
  series: Series[];
  formatValue: (v: number) => string;
  height?: number;
  /** Label the last point of this series at the right edge. */
  endLabelSeries?: string;
  /** Put the end label beside the last point (leaving room for it) or above it. */
  endLabelPosition?: "right" | "above";
  ariaLabel: string;
};

const BASE_PAD = { top: 22, right: 16, bottom: 30, left: 40 };

/** Round tick values whose range always contains [min, max], so no point is drawn outside the plot. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? 10 * mag;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let i = 0; start + i * step <= end + step * 1e-6; i++) ticks.push(Math.round((start + i * step) * 1000) / 1000);
  return ticks;
}

export function LineChart({ series, formatValue, height = 200, endLabelSeries, endLabelPosition = "above", ariaLabel }: Props) {
  const padRight = endLabelSeries && endLabelPosition === "right" ? 50 : BASE_PAD.right;
  const PAD = { ...BASE_PAD, right: padRight };
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const model = useMemo(() => {
    const dates = [...new Set(series.flatMap((s) => s.points.map((p) => p.date)))].sort();
    const values = series.flatMap((s) => s.points.map((p) => p.value));
    if (dates.length === 0 || width === 0) return null;
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const pad = Math.max((hi - lo) * 0.1, 0.5);
    const ticks = niceTicks(lo - pad, hi + pad);
    const yMin = ticks[0];
    const yMax = ticks[ticks.length - 1];
    const t0 = parseISODate(dates[0]).toMillis();
    const t1 = parseISODate(dates[dates.length - 1]).toMillis();
    const innerW = width - BASE_PAD.left - padRight;
    const innerH = height - BASE_PAD.top - BASE_PAD.bottom;
    const x = (date: string) => BASE_PAD.left + (t1 === t0 ? innerW / 2 : ((parseISODate(date).toMillis() - t0) / (t1 - t0)) * innerW);
    const y = (v: number) => BASE_PAD.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH;
    return { dates, ticks, x, y, xTicks: xTicksFor(dates), innerH };
  }, [series, width, height, padRight]);

  const activeDate = model && active != null ? model.dates[Math.min(active, model.dates.length - 1)] : null;

  function nearestIndex(clientX: number) {
    if (!model || !wrapRef.current) return null;
    const left = wrapRef.current.getBoundingClientRect().left;
    const px = clientX - left;
    let best = 0;
    let bestDist = Infinity;
    model.dates.forEach((d, i) => {
      const dist = Math.abs(model.x(d) - px);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    return best;
  }

  const legend = series.length > 1 && (
    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[15px] font-medium text-muted">
      {series.map((s) => (
        <li key={s.id} className="flex items-center gap-1.5">
          <svg width="18" height="10" aria-hidden>
            {s.mark === "dots" ? (
              <circle cx="9" cy="5" r="4.5" fill={s.color} />
            ) : (
              <line x1="1" y1="5" x2="17" y2="5" stroke={s.color} strokeWidth="3" strokeLinecap="round" />
            )}
          </svg>
          {s.label}
        </li>
      ))}
    </ul>
  );

  const endSeries = endLabelSeries ? series.find((s) => s.id === endLabelSeries) : undefined;
  const end = endSeries?.points.at(-1);

  return (
    <div>
      <div
        ref={wrapRef}
        className="relative touch-pan-y select-none"
        style={{ height }}
        onPointerMove={(e) => setActive(nearestIndex(e.clientX))}
        onPointerDown={(e) => setActive(nearestIndex(e.clientX))}
        onPointerLeave={() => setActive(null)}
      >
        {model && (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={ariaLabel}
            tabIndex={0}
            className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ink/50"
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") setActive((i) => Math.max(0, (i ?? model.dates.length) - 1));
              if (e.key === "ArrowRight") setActive((i) => Math.min(model.dates.length - 1, (i ?? -1) + 1));
              if (e.key === "Escape") setActive(null);
            }}
            onBlur={() => setActive(null)}
          >
            {model.ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={model.y(t)} y2={model.y(t)} stroke="var(--chart-grid)" strokeWidth="1" />
                <text x={PAD.left - 10} y={model.y(t)} dy="0.35em" textAnchor="end" className="fill-muted font-mono text-[12px]">
                  {formatValue(t)}
                </text>
              </g>
            ))}
            {model.xTicks.map((t, i) => (
              <text
                key={t.date}
                x={model.x(t.date)}
                y={height - 6}
                textAnchor={t.month ? (model.x(t.date) > width - PAD.right - 28 ? "end" : "start") : i === 0 && model.xTicks.length > 1 ? "start" : i === model.xTicks.length - 1 && model.xTicks.length > 1 ? "end" : "middle"}
                className="fill-muted font-mono text-[12px]"
              >
                {t.label}
              </text>
            ))}

            {activeDate && (
              <line x1={model.x(activeDate)} x2={model.x(activeDate)} y1={PAD.top} y2={PAD.top + model.innerH} stroke="var(--faint)" strokeWidth="1" />
            )}

            {series.map((s) => (
              <g key={s.id}>
                {s.mark !== "dots" && s.points.length > 1 && (
                  <polyline
                    points={s.points.map((p) => `${model.x(p.date)},${model.y(p.value)}`).join(" ")}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="3"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                )}
                {(s.mark !== "line" || s.points.length === 1) &&
                  s.points.map((p) =>
                    s.mark === "dots" ? (
                      <circle key={p.date} cx={model.x(p.date)} cy={model.y(p.value)} r="3.5" fill={s.color} />
                    ) : (
                      <circle key={p.date} cx={model.x(p.date)} cy={model.y(p.value)} r="4.5" fill="var(--chart-surface)" stroke={s.color} strokeWidth="2.5" />
                    ),
                  )}
                {s.lastPoint && s.points.length > 0 && (
                  <circle
                    cx={model.x(s.points[s.points.length - 1].date)}
                    cy={model.y(s.points[s.points.length - 1].value)}
                    r="6.5"
                    fill={s.lastPoint.fill}
                    stroke={s.lastPoint.ring}
                    strokeWidth="3"
                  />
                )}
                {activeDate &&
                  s.points
                    .filter((p) => p.date === activeDate)
                    .map((p) => (
                      <circle key="active" cx={model.x(p.date)} cy={model.y(p.value)} r="6" fill={s.color} stroke="var(--chart-surface)" strokeWidth="2" />
                    ))}
              </g>
            ))}

            {end && !activeDate && (
              <text
                x={endLabelPosition === "right" ? model.x(end.date) + 11 : Math.min(model.x(end.date) + 6, width - 2)}
                y={endLabelPosition === "right" ? model.y(end.value) : model.y(end.value) - 13}
                dy={endLabelPosition === "right" ? "0.35em" : undefined}
                textAnchor={endLabelPosition === "right" ? "start" : "end"}
                className="text-[15px] font-extrabold"
                fill={endSeries?.lastPoint?.fill ?? endSeries?.color}
              >
                {formatValue(end.value)}
              </text>
            )}
          </svg>
        )}

        {model && activeDate && (
          <div
            className="pointer-events-none absolute top-0 z-10 min-w-32 rounded-2xl bg-ink px-3.5 py-2.5 text-[14px] text-white shadow-lg"
            style={{
              left: Math.min(Math.max(model.x(activeDate) - 64, 0), Math.max(width - 140, 0)),
            }}
            role="status"
          >
            <div className="mb-1 text-[13px] text-white/70">{parseISODate(activeDate).toFormat("ccc d LLL yyyy")}</div>
            {series.map((s) => {
              const p = s.points.find((q) => q.date === activeDate);
              if (!p) return null;
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <svg width="12" height="6" aria-hidden>
                    <line x1="1" y1="3" x2="11" y2="3" stroke={s.color} strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  <span className="font-bold">{formatValue(p.value)}</span>
                  <span className="text-white/70">{s.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {legend}
    </div>
  );
}

/**
 * X-axis labels. Over two months or more, label the start of each month ("Jul", "Aug"; with the year when
 * the range crosses one); otherwise the first, middle and last dates.
 */
export function xTicksFor(dates: string[]): { date: string; label: string; month: boolean }[] {
  if (dates.length === 0) return [];
  const first = parseISODate(dates[0]);
  const last = parseISODate(dates[dates.length - 1]);
  if (last.diff(first, "days").days >= 55) {
    const multiYear = first.year !== last.year;
    const months: string[] = [];
    for (let m = first.startOf("month").plus({ months: first.day === 1 ? 0 : 1 }); m <= last; m = m.plus({ months: 1 })) months.push(m.toISODate()!);
    const step = Math.ceil(months.length / 5);
    return months
      .filter((_, i) => i % step === 0)
      .map((d) => ({ date: d, label: parseISODate(d).toFormat(multiYear ? "LLL yy" : "LLL"), month: true }));
  }
  const picks = dates.length <= 2 ? dates : [dates[0], dates[Math.floor((dates.length - 1) / 2)], dates[dates.length - 1]];
  return picks.map((d) => ({ date: d, label: shortDate(d), month: false }));
}
