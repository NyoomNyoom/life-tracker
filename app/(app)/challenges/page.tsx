import type { Metadata } from "next";
import Link from "next/link";
import { Medal } from "@/components/achievement-icon";
import { ChallengeCard } from "@/components/challenge-card";
import { QuickDistanceForm } from "@/components/quick-distance-form";
import { SubmitButton } from "@/components/form-controls";
import { BackLink, EmptyState, LinkButton, Rows, Tile, TileHeader } from "@/components/ui";
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
      <header className="px-5 pt-4 pb-4">
        <div className="mb-3 flex items-center justify-between">
          <BackLink href="/workouts" label="Train" />
          <LinkButton href="/achievements" size="md" variant="bare" className="bg-ink text-achievements-ink">
            Medals
          </LinkButton>
        </div>
        <h1 className="display text-[38px]">Challenges</h1>
        <p className="mt-1.5 text-[16px] font-medium text-muted">Every km you walk, run, ride, row or swim moves you along</p>
      </header>

      <Tile tone="challenges">
        <TileHeader title={<span className="text-white">Log a walk, hike, run or ride</span>} />
        <QuickDistanceForm unit={viewer.unit} today={viewer.today} />
      </Tile>

      <Tile>
        <TileHeader title="In progress" tight />
        {active.length ? (
          <Rows>
            {active.map((j) => (
              <ChallengeCard key={j.challenge.slug} entry={j} unit={viewer.unit} />
            ))}
          </Rows>
        ) : (
          <EmptyState title="No challenges running" body="Start one below. You can run several at once; every km counts toward all of them." />
        )}
      </Tile>

      {available.length > 0 && (
        <Tile>
          <TileHeader title="Start a challenge" tight />
          <Rows>
            {available.map((c) => (
              <div key={c.slug} className="flex items-center gap-4 py-4">
                <Medal challenge={c} earned={false} size={48} />
                <Link href={`/challenges/${c.slug}`} className="min-w-0 flex-1 active:opacity-70">
                  <span className="block text-[20px] leading-tight font-extrabold tracking-tight">{c.name}</span>
                  <span className="mt-0.5 block text-[15px] leading-snug font-medium text-muted">
                    {formatJourney(c.km, viewer.unit)} · {c.checkpoints.length - 1} checkpoints · {c.tagline}
                  </span>
                </Link>
                <form action={joinChallenge}>
                  <input type="hidden" name="slug" value={c.slug} />
                  <SubmitButton size="md" block={false} pendingText="…" aria-label={`Start ${c.name}`} variant="bare" className="bg-challenges text-challenges-ink">
                    Start
                  </SubmitButton>
                </form>
              </div>
            ))}
          </Rows>
        </Tile>
      )}

      {done.length > 0 && (
        <Tile>
          <TileHeader title="Completed" tight />
          <Rows>
            {done.map((j) => (
              <ChallengeCard key={j.challenge.slug} entry={j} unit={viewer.unit} />
            ))}
          </Rows>
        </Tile>
      )}
    </>
  );
}
