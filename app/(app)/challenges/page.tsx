import type { Metadata } from "next";
import Link from "next/link";
import { Medal } from "@/components/achievement-icon";
import { ChallengeCard } from "@/components/challenge-card";
import { QuickDistanceForm } from "@/components/quick-distance-form";
import { SubmitButton } from "@/components/form-controls";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { loadChallenges } from "@/lib/challenge-data";
import { formatJourney } from "@/lib/challenges";
import { getViewer } from "@/lib/viewer";
import { joinChallenge } from "./actions";

export const metadata: Metadata = { title: "Challenges" };

export default async function ChallengesPage() {
  const viewer = await getViewer();
  const { joined, available } = await loadChallenges(viewer);
  const active = joined.filter((j) => !j.progress.complete);
  const done = joined.filter((j) => j.progress.complete);

  return (
    <>
      <PageHeader
        back={{ href: "/workouts", label: "Train" }}
        title="Challenges"
        subtitle="Every km you walk, run, ride, row or swim moves you along"
        action={
          <Link href="/achievements" className="text-[15px] font-medium text-accent">
            Medals
          </Link>
        }
      />

      <Card>
        <CardHeader title="Log a walk, hike, run or ride" />
        <QuickDistanceForm unit={viewer.unit} today={viewer.today} />
      </Card>

      <Card>
        <CardHeader title="In progress" />
        {active.length ? (
          <div className="divide-y divide-border">
            {active.map((j) => (
              <ChallengeCard key={j.challenge.slug} entry={j} unit={viewer.unit} />
            ))}
          </div>
        ) : (
          <EmptyState title="No challenges running" body="Start one below. You can run several at once; every km counts toward all of them." />
        )}
      </Card>

      {available.length > 0 && (
        <Card>
          <CardHeader title="Start a challenge" />
          <ul className="divide-y divide-border">
            {available.map((c) => (
              <li key={c.slug} className="flex items-center gap-3 px-4 py-3">
                <Medal challenge={c} earned={false} size={40} />
                <Link href={`/challenges/${c.slug}`} className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-semibold">{c.name}</span>
                  <span className="block text-[13px] text-muted">
                    {formatJourney(c.km, viewer.unit)} · {c.checkpoints.length - 1} checkpoints · {c.tagline}
                  </span>
                </Link>
                <form action={joinChallenge}>
                  <input type="hidden" name="slug" value={c.slug} />
                  <SubmitButton size="sm" block={false} variant="secondary" pendingText="…" aria-label={`Start ${c.name}`}>
                    Start
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {done.length > 0 && (
        <Card>
          <CardHeader title="Completed" />
          <div className="divide-y divide-border">
            {done.map((j) => (
              <ChallengeCard key={j.challenge.slug} entry={j} unit={viewer.unit} />
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
