import { Flag } from "lucide-react";
import type { Challenge, ChallengeProgress } from "@/lib/challenges";
import { cx } from "./ui";

/** The route as a bar: filled to your position, with a dot for every checkpoint. */
export function ChallengeTrack({ challenge, progress, large = false }: { challenge: Challenge; progress: ChallengeProgress; large?: boolean }) {
  const reached = new Set(progress.reached.map((c) => c.id));
  const pct = progress.fraction * 100;
  return (
    <div
      className={cx("relative", large ? "h-4" : "h-2.5")}
      role="progressbar"
      aria-label={`${challenge.name} progress`}
      aria-valuemin={0}
      aria-valuemax={Math.round(challenge.km)}
      aria-valuenow={Math.round(progress.km)}
    >
      <div className="absolute inset-0 overflow-hidden rounded-full bg-field">
        <div className="h-full rounded-full bg-journey transition-[width]" style={{ width: `${pct}%` }} />
      </div>
      {challenge.checkpoints.slice(0, -1).map((cp) => (
        <span
          key={cp.id}
          className={cx(
            "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full",
            large ? "size-2" : "size-1.5",
            reached.has(cp.id) ? "bg-white/90" : "bg-faint",
          )}
          style={{ left: `${(cp.km / challenge.km) * 100}%` }}
          aria-hidden
        />
      ))}
      <Flag
        className={cx("absolute -top-[3px] right-0 translate-x-1/2", large ? "size-5" : "size-4", progress.complete ? "text-journey" : "text-faint")}
        aria-hidden
      />
    </div>
  );
}
