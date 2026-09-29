import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, MapPin } from "lucide-react";
import { Medal } from "@/components/achievement-icon";
import { Celebration } from "@/components/celebration";
import { ChallengeTrack } from "@/components/challenge-track";
import { ConfirmButton } from "@/components/confirm-button";
import { SubmitButton } from "@/components/form-controls";
import { Card, CardHeader, Notice, PageHeader, cx } from "@/components/ui";
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

  return (
    <>
      <PageHeader back={{ href: "/challenges", label: "Challenges" }} title={challenge.name} subtitle={challenge.tagline} />
      {earned && <Celebration keys={earned.split(",")} />}

      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Medal challenge={challenge} earned={Boolean(medalDate)} size={72} />
          <div className="min-w-0">
            <p className="text-[28px] leading-tight font-semibold tabular">{formatJourney(Math.min(progress.km, challenge.km), unit)}</p>
            <p className="text-[14px] text-muted">
              of {formatJourney(challenge.km, unit)}
              {entry ? ` · started ${friendlyDate(entry.startDate, today)}` : ""}
            </p>
            {medalDate && <p className="mt-1 text-[14px] font-semibold text-journey">Medal earned {reachedOn(medalDate)} 🏅</p>}
          </div>
        </div>
        <div className="mt-5">
          <ChallengeTrack challenge={challenge} progress={progress} large />
        </div>
        {entry && !progress.complete && (
          <p className="mt-3 text-[14px] text-muted">
            {progress.next!.id === "finish" ? "Finish" : progress.next!.name} in <b className="text-fg">{formatJourney(progress.toNextKm, unit)}</b>
            {days != null
              ? ` · at your recent pace you'll finish around ${parseISODate(addDays(today, days)).toFormat(days > 300 ? "LLLL yyyy" : "d LLLL")}`
              : entry.paceDays < 7
                ? " · after a week you'll see a projected finish date"
                : ""}
          </p>
        )}
        <p className="mt-3 text-[14px]">{challenge.description}</p>
      </Card>

      {!entry && (
        <form action={joinChallenge} className="mx-4 mb-4">
          <input type="hidden" name="slug" value={challenge.slug} />
          <SubmitButton pendingText="Starting…">Start this challenge</SubmitButton>
          <p className="mt-2 text-center text-[13px] text-muted">Distance from today onwards counts, including anything you&apos;ve logged today.</p>
        </form>
      )}

      <Card>
        <CardHeader title="Checkpoints" />
        <ol className="pb-2">
          {challenge.checkpoints.map((cp, i) => {
            const isFinish = cp.id === "finish";
            const key = isFinish ? medalKey(slug) : checkpointKey(slug, cp.id);
            const reached = progress.km >= cp.km;
            const when = reachedOn(awardedAt.get(key));
            const isNext = progress.next?.id === cp.id && Boolean(entry);
            return (
              <li key={cp.id} className="flex gap-3 px-4">
                <div className="flex flex-col items-center">
                  <span
                    className={cx(
                      "mt-2.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                      reached ? "bg-journey text-white" : isNext ? "border-2 border-journey text-journey" : "bg-field text-faint",
                    )}
                  >
                    {reached ? <Check className="size-4" strokeWidth={3} aria-hidden /> : <MapPin className="size-3.5" aria-hidden />}
                  </span>
                  {i < challenge.checkpoints.length - 1 && <span className={cx("w-0.5 flex-1", reached ? "bg-journey" : "bg-field")} aria-hidden />}
                </div>
                <div className="min-w-0 flex-1 py-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={cx("text-[16px] font-semibold", !reached && "text-muted")}>{cp.name}</span>
                    <span className="shrink-0 text-[13px] text-muted tabular">
                      {challenge.approximate && !isFinish ? "≈ " : ""}
                      {formatJourney(cp.km, unit)}
                    </span>
                  </div>
                  <p className="text-[14px] text-muted">{cp.blurb}</p>
                  {reached && when && <p className="text-[12px] font-medium text-journey">Reached {when}</p>}
                  {isNext && <p className="text-[12px] font-medium text-journey">{formatJourney(progress.toNextKm, unit)} to go</p>}
                </div>
              </li>
            );
          })}
        </ol>
      </Card>

      {challenge.approximate && (
        <div className="mx-4 mb-4">
          <Notice>Checkpoint distances are estimates for fun and motivation, not survey figures.</Notice>
        </div>
      )}

      {entry && !progress.complete && (
        <form action={leaveChallenge} className="mx-4 mt-6">
          <input type="hidden" name="slug" value={challenge.slug} />
          <ConfirmButton message={`Leave ${challenge.name}? Your progress resets if you start it again (checkpoints you've earned stay on your shelf).`} variant="ghost" block>
            <span className="text-danger">Leave challenge</span>
          </ConfirmButton>
        </form>
      )}
    </>
  );
}
