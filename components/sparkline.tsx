/** Tiny trend line for a tile: a line in the tile's ink, with the latest point as a butter dot. No axes, no hover. */
export function Sparkline({ values, width = 150, height = 40, className }: { values: number[]; width?: number; height?: number; className?: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 6;
  const x = (i: number) => pad + (i / (values.length - 1)) * (width - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / span) * (height - pad * 2);
  const last = values.length - 1;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} aria-hidden className={className ?? "block h-auto w-full"}>
      <polyline
        points={values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={x(last)} cy={y(values[last])} r="5" fill="var(--todos)" />
    </svg>
  );
}
