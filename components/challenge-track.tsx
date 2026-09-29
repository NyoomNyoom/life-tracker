import { Flag } from "lucide-react";
import type { Challenge, ChallengeProgress } from "@/lib/challenges";
import { cx } from "./ui";

/**
 * The route as a bar: filled to your position, with a dot for every checkpoint.
 * `onDark` draws it for the green challenges tile (mint fill, flag at the end); otherwise green on a light card.
 */
export function ChallengeTrack({
  challenge,
  progress,
  onDark = false,
  large = false,
  dots = true,
}: {
  challenge: Challenge;
  progress: ChallengeProgress;
  onDark?: boolean;
  large?: boolean;
  dots?: boolean;
}) {
  const reached = new Set(progress.reached.map((c) => c.id));
  const pct = progress.fraction * 100;
  return (
    <div
      className={cx("relative", large ? "mr-7 h-4" : "h-3.5")}
      role="progressbar"
      aria-label={`${challenge.name} progress`}
      aria-valuemin={0}
      aria-valuemax={Math.round(challenge.km)}
      aria-valuenow={Math.round(progress.km)}
    >
      <div className={cx("absolute inset-0 overflow-hidden rounded-full", onDark ? "bg-challenges-dim" : "bg-field")}>
        <div className={cx("h-full rounded-full transition-[width]", onDark ? "bg-challenges-ink" : "bg-challenges")} style={{ width: `${pct}%` }} />
      </div>
      {dots &&
        challenge.checkpoints.slice(0, -1).map((cp) => {
          const on = reached.has(cp.id);
          return (
            <span
              key={cp.id}
              className={cx(
                "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full",
                large ? "size-2" : "size-1.5",
                onDark ? (on ? "bg-challenges" : "bg-challenges-ink/45") : on ? "bg-challenges-ink" : "bg-faint/70",
              )}
              style={{ left: `${(cp.km / challenge.km) * 100}%` }}
              aria-hidden
            />
          );
        })}
      {large && <Flag className="absolute top-1/2 -right-7 size-5 -translate-y-1/2 text-challenges-ink" aria-hidden />}
    </div>
  );
}

/** A winding trail for the Today tile: walked part solid mint, the rest faded, a butter dot where you are. */
export function ChallengeRoute({ fraction, label }: { fraction: number; label: string }) {
  const W = 300;
  const H = 44;
  const N = 80;
  const pts = Array.from({ length: N + 1 }, (_, i) => {
    const t = i / N;
    return { x: 8 + t * (W - 20), y: H / 2 + 11 * Math.sin(t * Math.PI * 2.4 - 0.3 * Math.PI) };
  });
  // Walk the polyline to find where `fraction` of its length falls.
  const seg = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y));
  const total = seg.reduce((a, b) => a + b, 0);
  let remaining = Math.min(Math.max(fraction, 0), 1) * total;
  let at = pts[0];
  let walked = [pts[0]];
  for (let i = 0; i < seg.length; i++) {
    if (remaining <= seg[i]) {
      const f = seg[i] === 0 ? 0 : remaining / seg[i];
      at = { x: pts[i].x + (pts[i + 1].x - pts[i].x) * f, y: pts[i].y + (pts[i + 1].y - pts[i].y) * f };
      walked = [...pts.slice(0, i + 1), at];
      break;
    }
    remaining -= seg[i];
    at = pts[i + 1];
    walked = pts.slice(0, i + 2);
  }
  const line = (p: { x: number; y: number }[]) => p.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" ");
  const end = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={label}>
      <polyline points={line(pts)} fill="none" stroke="var(--challenges-dim)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={line(walked)} fill="none" stroke="var(--challenges-ink)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={end.x} cy={end.y} r="5.5" fill="var(--challenges)" stroke="var(--challenges-ink)" strokeWidth="3" />
      <circle cx={at.x} cy={at.y} r="8" fill="var(--todos)" />
    </svg>
  );
}
