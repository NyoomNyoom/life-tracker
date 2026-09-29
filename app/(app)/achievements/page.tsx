import type { Metadata } from "next";
import Link from "next/link";
import { BadgeDisc, Medal } from "@/components/achievement-icon";
import { Card, CardHeader, PageHeader } from "@/components/ui";
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
    <ul className="grid grid-cols-3 gap-x-3 gap-y-4 px-4 pb-4">
      {items.map((b) => {
        const when = earned.get(b.key);
        return (
          <li key={b.key} className="flex flex-col items-center gap-1.5 text-center">
            <BadgeDisc achievement={b} earned={Boolean(when)} size={52} />
            <span className={`text-[13px] leading-tight font-semibold ${when ? "" : "text-muted"}`}>{b.title}</span>
            <span className="text-[11px] leading-tight text-muted">{when ? friendlyDate(when, today) : b.description}</span>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <PageHeader
        back={{ href: "/more", label: "More" }}
        title="Achievements"
        subtitle={`${count} of ${total} earned${checkpoints ? ` · ${checkpoints} checkpoint${checkpoints === 1 ? "" : "s"} reached` : ""}`}
      />

      <Card>
        <CardHeader
          title="Medals"
          action={
            <Link href="/challenges" className="text-[14px] font-medium text-accent">
              Challenges
            </Link>
          }
        />
        <ul className="grid grid-cols-3 gap-x-3 gap-y-4 px-4 pb-4">
          {CHALLENGES.map((c) => {
            const when = earned.get(medalKey(c.slug));
            return (
              <li key={c.slug}>
                <Link href={`/challenges/${c.slug}`} className="flex flex-col items-center gap-1.5 text-center">
                  <Medal challenge={c} earned={Boolean(when)} size={52} />
                  <span className={`text-[13px] leading-tight font-semibold ${when ? "" : "text-muted"}`}>{c.name}</span>
                  <span className="text-[11px] text-muted">{when ? friendlyDate(when, today) : "Not yet"}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <CardHeader title="Training" />
        {badgeGrid(BADGES.filter((b) => b.group === "training"))}
      </Card>

      <Card>
        <CardHeader title="Teeth" />
        {badgeGrid(BADGES.filter((b) => b.group === "teeth"))}
      </Card>
    </>
  );
}
