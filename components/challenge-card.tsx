import Link from "next/link";
import { formatJourney } from "@/lib/challenges";
import type { JoinedChallenge } from "@/lib/challenge-data";
import type { Unit } from "@/lib/units";
import { Medal } from "./achievement-icon";
import { ChallengeTrack } from "./challenge-track";

/** One joined challenge on a white card: medal, the route bar and what's next. */
export function ChallengeCard({ entry, unit }: { entry: JoinedChallenge; unit: Unit }) {
  const { challenge, progress } = entry;
  return (
    <Link href={`/challenges/${challenge.slug}`} className="flex items-center gap-4 py-4 active:opacity-70">
      <Medal challenge={challenge} earned={progress.complete} size={48} />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[20px] font-extrabold tracking-tight">{challenge.name}</span>
          <span className="shrink-0 font-mono text-[14px] text-muted">{Math.floor(progress.fraction * 100)}%</span>
        </div>
        <ChallengeTrack challenge={challenge} progress={progress} />
        <p className="text-[15px] font-medium text-muted">
          {progress.complete
            ? "Complete! Medal earned 🏅"
            : `${formatJourney(progress.km, unit)} of ${formatJourney(challenge.km, unit)} · ${progress.next!.id === "finish" ? "finish" : progress.next!.name} in ${formatJourney(progress.toNextKm, unit)}`}
        </p>
      </div>
    </Link>
  );
}
