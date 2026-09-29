import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Flame } from "lucide-react";
import { BadgeDisc } from "@/components/achievement-icon";
import { PastSlotToggle, TeethTracker } from "@/components/teeth-tracker";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { BADGES } from "@/lib/achievements";
import { addDays, friendlyDate } from "@/lib/dates";
import { brushingStats, groupByDay, type BrushLog } from "@/lib/habits";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Teeth" };

const STREAK_BADGES: [number, string][] = [
  [7, "teeth:streak-7"],
  [30, "teeth:streak-30"],
  [100, "teeth:streak-100"],
  [365, "teeth:streak-365"],
];

export default async function TeethPage() {
  const { supabase, today } = await getViewer();
  const [{ data: logs }, { data: earned }, { data: reminders }] = await Promise.all([
    supabase.from("brushing_logs").select("log_date, slot, flossed, mouthwash").gte("log_date", addDays(today, -400)),
    supabase.from("achievements").select("key").like("key", "teeth:%"),
    supabase.from("reminders").select("id").eq("kind", "teeth").limit(1),
  ]);
  const list = (logs ?? []) as BrushLog[];
  const stats = brushingStats(list, today);
  const days = groupByDay(list);
  const have = new Set((earned ?? []).map((a) => a.key));
  const nextBadge = STREAK_BADGES.find(([n]) => stats.streak < n);
  const teethBadges = BADGES.filter((b) => b.group === "teeth");

  return (
    <>
      <PageHeader
        back={{ href: "/more", label: "More" }}
        title="Teeth"
        subtitle={
          <span className="inline-flex items-center gap-1">
            {stats.streak > 0 && <Flame className="size-4 text-warn" aria-hidden />}
            {stats.streak === 0 ? "Brush morning and night to start a streak" : `${stats.streak}-day streak`}
          </span>
        }
      />

      <Card>
        <CardHeader title="Today" />
        <TeethTracker date={today} day={stats.today} />
        {nextBadge && (
          <p className="px-4 pt-1 pb-3 text-[13px] text-muted">
            {nextBadge[0] - stats.streak} more complete day{nextBadge[0] - stats.streak === 1 ? "" : "s"} for “{BADGES.find((b) => b.key === nextBadge[1])!.title}”.
          </p>
        )}
      </Card>

      <div className="mx-4 mb-4 grid grid-cols-3 gap-2 text-center">
        {[
          { label: "both brushes", value: stats.week.complete },
          { label: "flossed", value: stats.week.flossed },
          { label: "mouthwash", value: stats.week.mouthwash },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-card py-3">
            <p className="text-[22px] font-semibold">
              {s.value}
              <span className="text-[15px] text-muted">/7</span>
            </p>
            <p className="text-[12px] text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader title="Last two weeks" />
        <ul className="divide-y divide-border">
          {Array.from({ length: 13 }, (_, i) => addDays(today, -(i + 1))).map((date) => {
            const d = days.get(date);
            const extras = [d?.morning?.flossed || d?.night?.flossed ? "floss" : null, d?.morning?.mouthwash || d?.night?.mouthwash ? "mouthwash" : null].filter(Boolean);
            return (
              <li key={date} className="flex items-center gap-3 px-4 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px]">{friendlyDate(date, today)}</p>
                  {extras.length > 0 && <p className="text-[12px] text-muted">+ {extras.join(", ")}</p>}
                </div>
                <PastSlotToggle date={date} slot="morning" done={!!d?.morning} label={`Brushed the morning of ${date}`} />
                <PastSlotToggle date={date} slot="night" done={!!d?.night} label={`Brushed the night of ${date}`} />
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <CardHeader title="Badges" />
        <ul className="grid grid-cols-3 gap-3 px-4 pb-4">
          {teethBadges.map((b) => (
            <li key={b.key} className="flex flex-col items-center gap-1.5 text-center">
              <BadgeDisc achievement={b} earned={have.has(b.key)} />
              <span className={`text-[12px] leading-tight font-medium ${have.has(b.key) ? "" : "text-muted"}`}>{b.title}</span>
            </li>
          ))}
        </ul>
      </Card>

      {!reminders?.length && (
        <Link href="/reminders/new?kind=teeth" className="mx-4 mb-4 flex items-center gap-3 rounded-2xl bg-teeth-soft px-4 py-3 text-teeth">
          <Bell className="size-5" aria-hidden />
          <span className="text-[15px] font-semibold">Get a reminder if you haven&apos;t brushed by bedtime</span>
        </Link>
      )}
    </>
  );
}
