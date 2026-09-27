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
  /** CSS color, e.g. "var(--chart-trend)" */
  color: string;
  mark: "line" | "dots" | "line+dots";
  points: { date: string; value: number }[];
};

type Props = {
  series: Series[];
  formatValue: (v: number) => string;
  height?: number;
  /** Label the last point of this series at the right edge. */
  endLabelSeries?: string;
  ariaLabel: string;
};

const PAD = { top: 12, right: 14, bottom: 26, left: 44 };

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? 10 * mag;
  const ticks: number[] = [];
  for (let t = Math.floor(min / step) * step; t <= max + step * 0.001; t += step) ticks.push(Math.round(t * 1000) / 1000);
  return ticks;
}

export function LineChart({ series, formatValue, height = 200, endLabelSeries, ariaLabel }: Props) {
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
    const innerW = width - PAD.left - PAD.right;
    const innerH = height - PAD.top - PAD.bottom;
    const x = (date: string) => PAD.left + (t1 === t0 ? innerW / 2 : ((parseISODate(date).toMillis() - t0) / (t1 - t0)) * innerW);
    const y = (v: number) => PAD.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH;
    const xTicks = dates.length <= 2 ? dates : [dates[0], dates[Math.floor((dates.length - 1) / 2)], dates[dates.length - 1]];
    return { dates, ticks, x, y, xTicks, innerH };
  }, [series, width, height]);

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
    <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
      {series.map((s) => (
        <li key={s.id} className="flex items-center gap-1.5">
          <svg width="18" height="10" aria-hidden>
            {s.mark === "dots" ? (
              <circle cx="9" cy="5" r="4" fill={s.color} />
            ) : (
              <line x1="1" y1="5" x2="17" y2="5" stroke={s.color} strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
          {s.label}
        </li>
      ))}
    </ul>
  );

  const end = endLabelSeries ? series.find((s) => s.id === endLabelSeries)?.points.at(-1) : undefined;

  return (
    <div>
      {legend}
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
            className="block outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded-lg"
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
                <text x={PAD.left - 8} y={model.y(t)} dy="0.35em" textAnchor="end" className="fill-muted text-[11px] tabular">
                  {formatValue(t)}
                </text>
              </g>
            ))}
            {model.xTicks.map((d, i) => (
              <text
                key={d}
                x={model.x(d)}
                y={height - 6}
                textAnchor={i === 0 && model.xTicks.length > 1 ? "start" : i === model.xTicks.length - 1 && model.xTicks.length > 1 ? "end" : "middle"}
                className="fill-muted text-[11px]"
              >
                {shortDate(d)}
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
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                )}
                {(s.mark !== "line" || s.points.length === 1) &&
                  s.points.map((p) => (
                    <circle key={p.date} cx={model.x(p.date)} cy={model.y(p.value)} r="4" fill={s.color} stroke="var(--chart-surface)" strokeWidth="2" />
                  ))}
                {activeDate &&
                  s.points
                    .filter((p) => p.date === activeDate)
                    .map((p) => (
                      <circle key="active" cx={model.x(p.date)} cy={model.y(p.value)} r="5.5" fill={s.color} stroke="var(--chart-surface)" strokeWidth="2" />
                    ))}
              </g>
            ))}

            {end && !activeDate && (
              <text x={width - PAD.right} y={model.y(end.value) - 10} textAnchor="end" className="fill-fg text-[12px] font-semibold tabular">
                {formatValue(end.value)}
              </text>
            )}
          </svg>
        )}

        {model && activeDate && (
          <div
            className="pointer-events-none absolute top-0 z-10 min-w-32 rounded-xl bg-card px-3 py-2 text-[13px] shadow-lg ring-1 ring-border"
            style={{
              left: Math.min(Math.max(model.x(activeDate) - 64, 0), Math.max(width - 140, 0)),
            }}
            role="status"
          >
            <div className="mb-1 text-[12px] text-muted">{parseISODate(activeDate).toFormat("ccc d LLL yyyy")}</div>
            {series.map((s) => {
              const p = s.points.find((q) => q.date === activeDate);
              if (!p) return null;
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <svg width="12" height="6" aria-hidden>
                    <line x1="1" y1="3" x2="11" y2="3" stroke={s.color} strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <span className="font-semibold tabular">{formatValue(p.value)}</span>
                  <span className="text-muted">{s.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
