/** Tiny trend line for a stat tile: de-emphasised line, latest point in the accent colour. No axes, no hover. */
export function Sparkline({ values, width = 96, height = 32 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 4;
  const x = (i: number) => pad + (i / (values.length - 1)) * (width - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / span) * (height - pad * 2);
  const last = values.length - 1;
  return (
    <svg width={width} height={height} aria-hidden className="shrink-0">
      <polyline
        points={values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
        fill="none"
        stroke="var(--faint)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={x(last)} cy={y(values[last])} r="4" fill="var(--chart-trend)" stroke="var(--card)" strokeWidth="2" />
    </svg>
  );
}
