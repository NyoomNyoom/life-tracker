import Link from "next/link";
import { formatJourney } from "@/lib/challenges";
import type { JoinedChallenge } from "@/lib/challenge-data";
import type { Unit } from "@/lib/units";
import { Medal } from "./achievement-icon";
import { ChallengeTrack } from "./challenge-track";

/** One joined challenge: medal, distance so far, the route bar and what's next. */
export function ChallengeCard({ entry, unit }: { entry: JoinedChallenge; unit: Unit }) {
  const { challenge, progress } = entry;
  return (
    <Link href={`/challenges/${challenge.slug}`} className="flex items-center gap-3 px-4 py-3 active:bg-card-pressed">
      <Medal challenge={challenge} earned={progress.complete} size={40} />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[16px] font-semibold">{challenge.name}</span>
          <span className="shrink-0 text-[13px] text-muted tabular">{Math.floor(progress.fraction * 100)}%</span>
        </div>
        <ChallengeTrack challenge={challenge} progress={progress} />
        <p className="text-[13px] text-muted">
          {progress.complete
            ? "Complete! Medal earned 🏅"
            : `${formatJourney(progress.km, unit)} of ${formatJourney(challenge.km, unit)} · ${progress.next!.id === "finish" ? "finish" : progress.next!.name} in ${formatJourney(progress.toNextKm, unit)}`}
        </p>
      </div>
    </Link>
  );
}
