import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, Flag, MapPin } from "lucide-react";
import { Medal } from "@/components/achievement-icon";
import { Celebration } from "@/components/celebration";
import { ChallengeTrack } from "@/components/challenge-track";
import { ConfirmButton } from "@/components/confirm-button";
import { SubmitButton } from "@/components/form-controls";
import { Notice, PageHeader, Tile, TileHeader, cx } from "@/components/ui";
import { checkpointKey, medalKey } from "@/lib/achievements";
import { loadChallenges } from "@/lib/challenge-data";
import { challengeProgress, daysToFinish, formatJourney, getChallenge } from "@/lib/challenges";
import { addDays, friendlyDate, localDateOf, parseISODate } from "@/lib/dates";
import { getViewer } from "@/lib/viewer";
import { joinChallenge, leaveChallenge } from "../actions";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: getChallenge(slug)?.name ?? "Challenge" };
}

export default async function ChallengePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ earned?: string }> }) {
  const [{ slug }, { earned }] = await Promise.all([params, searchParams]);
  const challenge = getChallenge(slug);
  if (!challenge) notFound();

  const viewer = await getViewer();
  const { unit, today, supabase, profile } = viewer;
  const [{ joined }, { data: awards }] = await Promise.all([
    loadChallenges(viewer),
    supabase.from("achievements").select("key, awarded_at").like("key", `challenge:${slug}:%`),
  ]);
  const entry = joined.find((j) => j.challenge.slug === slug);
  const progress = entry?.progress ?? challengeProgress(challenge, 0);
  const awardedAt = new Map((awards ?? []).map((a) => [a.key, a.awarded_at]));
  const medalDate = awardedAt.get(medalKey(slug));
  // Only project a finish date once there's at least a week of history to base it on.
  const days = entry && !progress.complete && entry.paceDays >= 7 ? daysToFinish(progress.remainingKm, entry.recentKm, entry.paceDays) : null;

  const reachedOn = (iso: string | undefined) => (iso ? friendlyDate(localDateOf(iso, profile.timezone), today) : null);

  const [kmText, kmUnit] = (() => {
    const t = formatJourney(Math.min(progress.km, challenge.km), unit);
    const i = t.lastIndexOf(" ");
    return [t.slice(0, i), t.slice(i + 1)];
  })();

  return (
    <>
      <PageHeader back={{ href: "/challenges", label: "Challenges" }} title={challenge.name} subtitle={challenge.tagline} />
      {earned && <Celebration keys={earned.split(",")} />}

      <Tile tone="challenges">
        <div className="text-white">
          <div className="flex items-center gap-4">
            <span className="text-challenges-ink">
              <Medal challenge={challenge} earned={Boolean(medalDate)} size={64} outline={!medalDate} />
            </span>
            <div className="min-w-0">
              <p className="flex items-baseline gap-1 text-challenges-ink">
                <span className="tile-number text-[60px]">{kmText}</span>
                <span className="text-[24px] font-bold">{kmUnit}</span>
              </p>
              <p className="mt-1 text-[16px] font-semibold">
                of {formatJourney(challenge.km, unit)}
                {entry ? ` · started ${friendlyDate(entry.startDate, today)}` : ""}
              </p>
              {medalDate && <p className="mt-1 text-[16px] font-bold text-challenges-ink">Medal earned {reachedOn(medalDate)} 🏅</p>}
            </div>
          </div>
          <div className="mt-5">
            <ChallengeTrack challenge={challenge} progress={progress} onDark large />
          </div>
          {entry && !progress.complete && (
            <p className="mt-4 text-[17px] leading-snug font-semibold">
              {progress.next!.id === "finish" ? "Finish" : progress.next!.name} in{" "}
              <b className="font-extrabold text-challenges-ink">{formatJourney(progress.toNextKm, unit)}</b>
              {days != null
                ? ` · at your recent pace you'll finish around ${parseISODate(addDays(today, days)).toFormat(days > 300 ? "LLLL yyyy" : "d LLLL")}`
                : entry.paceDays < 7
                  ? " · after a week you'll see a projected finish date"
                  : ""}
            </p>
          )}
          <p className="mt-4 text-[15px] leading-relaxed font-medium text-white/80">{challenge.description}</p>
        </div>
      </Tile>

      {!entry && (
        <form action={joinChallenge} className="mx-3 mb-2.5">
          <input type="hidden" name="slug" value={challenge.slug} />
          <SubmitButton pendingText="Starting…" size="xl">
            Start this challenge
          </SubmitButton>
          <p className="mt-2 text-center text-[14px] font-medium text-muted">Distance from today onwards counts, including anything you&apos;ve logged today.</p>
        </form>
      )}

      <Tile className="px-4">
        <div className="px-1">
          <TileHeader title="Checkpoints" />
        </div>
        <ol>
          {challenge.checkpoints.map((cp, i) => {
            const isFinish = cp.id === "finish";
            const key = isFinish ? medalKey(slug) : checkpointKey(slug, cp.id);
            const reached = progress.km >= cp.km;
            const when = reachedOn(awardedAt.get(key));
            const isNext = progress.next?.id === cp.id && Boolean(entry);
            const last = i === challenge.checkpoints.length - 1;
            return (
              <li key={cp.id} className="flex gap-3">
                <div className="flex w-9 shrink-0 flex-col items-center">
                  <span
                    className={cx(
                      "mt-2 flex size-9 shrink-0 items-center justify-center rounded-full",
                      reached
                        ? "bg-challenges text-challenges-ink"
                        : isNext
                          ? "border-[2.5px] border-training bg-card text-training"
                          : isFinish
                            ? "bg-ink text-todos"
                            : "bg-field text-faint",
                    )}
                  >
                    {reached ? (
                      <Check className="size-5" strokeWidth={3} aria-hidden />
                    ) : isFinish ? (
                      <Flag className="size-4" aria-hidden />
                    ) : (
                      <MapPin className="size-4" aria-hidden />
                    )}
                  </span>
                  {!last && <span className={cx("w-1 flex-1 rounded-full", reached ? "bg-challenges" : "bg-field")} aria-hidden />}
                </div>
                <div className={cx("mb-2 min-w-0 flex-1 rounded-[20px]", isNext ? "bg-training-soft px-4 py-3" : "px-1 py-2")}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={cx("font-extrabold tracking-tight", isNext ? "text-[20px]" : "text-[18px]", !reached && !isNext && "text-muted")}>{cp.name}</span>
                    <span className="shrink-0 font-mono text-[14px] text-muted">
                      {challenge.approximate && !isFinish ? "≈ " : ""}
                      {formatJourney(cp.km, unit)}
                    </span>
                  </div>
                  <p className="text-[15px] font-medium text-muted">{cp.blurb}</p>
                  {reached && when && <p className="mt-0.5 text-[13px] font-bold text-challenges">Reached {when}</p>}
                  {isNext && <p className="mt-0.5 text-[14px] font-bold text-danger">{formatJourney(progress.toNextKm, unit)} to go</p>}
                </div>
              </li>
            );
          })}
        </ol>
      </Tile>

      {challenge.approximate && (
        <Notice className="mx-3 mb-2.5">
          <span className="font-medium">Checkpoint distances are estimates for fun and motivation, not survey figures.</span>
        </Notice>
      )}

      {entry && !progress.complete && (
        <form action={leaveChallenge} className="mx-3 mt-4">
          <input type="hidden" name="slug" value={challenge.slug} />
          <ConfirmButton
            message={`Leave ${challenge.name}? Your progress resets if you start it again (checkpoints you've earned stay on your shelf).`}
            variant="ghost"
            block
            className="text-danger"
          >
            Leave challenge
          </ConfirmButton>
        </form>
      )}
    </>
  );
}
