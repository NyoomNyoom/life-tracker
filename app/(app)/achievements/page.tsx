import type { Metadata } from "next";
import Link from "next/link";
import { BadgeDisc, Medal } from "@/components/achievement-icon";
import { PageHeader, Tile, TileHeader, TileLink } from "@/components/ui";
import { BADGES, medalKey, type Achievement } from "@/lib/achievements";
import { CHALLENGES } from "@/lib/challenges";
import { friendlyDate, localDateOf } from "@/lib/dates";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Achievements" };

export default async function AchievementsPage() {
  const { supabase, today, profile } = await getViewer();
  const { data } = await supabase.from("achievements").select("key, awarded_at");
  const earned = new Map((data ?? []).map((a) => [a.key, localDateOf(a.awarded_at, profile.timezone)]));
  const checkpoints = (data ?? []).filter((a) => a.key.startsWith("challenge:") && !a.key.endsWith(":medal")).length;
  const total = BADGES.length + CHALLENGES.length;
  const count = BADGES.filter((b) => earned.has(b.key)).length + CHALLENGES.filter((c) => earned.has(medalKey(c.slug))).length;

  const badgeGrid = (items: Achievement[]) => (
    <ul className="grid grid-cols-3 gap-x-2 gap-y-5 pt-2">
      {items.map((b) => {
        const when = earned.get(b.key);
        return (
          <li key={b.key} className="flex flex-col items-center gap-1.5 text-center">
            <BadgeDisc achievement={b} earned={Boolean(when)} size={64} />
            <span className={`mt-1 text-[15px] leading-tight font-bold ${when ? "" : "text-muted"}`}>{b.title}</span>
            <span className="text-[13px] leading-snug font-medium text-muted">{when ? friendlyDate(when, today) : b.description}</span>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <PageHeader back={{ href: "/more", label: "More" }} title="Achievements" />

      <Tile tone="achievements" className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[15px] font-semibold text-white">Earned</p>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span className="tile-number text-[64px]">{count}</span>
            <span className="text-[28px] font-extrabold text-white">/ {total}</span>
          </p>
        </div>
        {checkpoints > 0 && (
          <p className="pb-1.5 text-right text-[17px] leading-snug font-bold text-white">
            {checkpoints} checkpoint{checkpoints === 1 ? "" : "s"}
            <br />
            reached
          </p>
        )}
      </Tile>

      <Tile>
        <TileHeader title="Medals" action={<TileLink href="/challenges">Challenges</TileLink>} />
        <ul className="grid grid-cols-3 gap-x-2 gap-y-5 pt-2">
          {CHALLENGES.map((c) => {
            const when = earned.get(medalKey(c.slug));
            return (
              <li key={c.slug}>
                <Link href={`/challenges/${c.slug}`} className="flex flex-col items-center gap-1.5 text-center active:opacity-70">
                  <Medal challenge={c} earned={Boolean(when)} size={56} />
                  <span className={`text-[15px] leading-tight font-bold ${when ? "" : "text-muted"}`}>{c.name}</span>
                  <span className="text-[13px] font-medium text-muted">{when ? friendlyDate(when, today) : "Not yet"}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Tile>

      <Tile>
        <TileHeader title="Training" />
        {badgeGrid(BADGES.filter((b) => b.group === "training"))}
      </Tile>

      <Tile>
        <TileHeader title="Teeth" />
        {badgeGrid(BADGES.filter((b) => b.group === "teeth"))}
      </Tile>
    </>
  );
}
