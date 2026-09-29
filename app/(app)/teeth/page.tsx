import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Flame } from "lucide-react";
import { BadgeDisc } from "@/components/achievement-icon";
import { PastSlotToggle, TeethTracker } from "@/components/teeth-tracker";
import { PageHeader, Rows, Tile, TileHeader } from "@/components/ui";
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
          <span className="inline-flex items-center gap-1.5">
            {stats.streak > 0 && <Flame className="size-5 fill-training text-danger" aria-hidden />}
            {stats.streak === 0 ? "Brush morning and night to start a streak" : `${stats.streak}-day streak`}
          </span>
        }
      />

      <Tile tone="teeth">
        <TileHeader title="Today" />
        <TeethTracker date={today} day={stats.today} />
        {nextBadge && (
          <p className="mt-4 text-[15px] font-medium">
            {nextBadge[0] - stats.streak} more complete day{nextBadge[0] - stats.streak === 1 ? "" : "s"} for “{BADGES.find((b) => b.key === nextBadge[1])!.title}”.
          </p>
        )}
      </Tile>

      <div className="mx-3 mb-2.5 grid grid-cols-3 gap-2.5">
        {[
          { label: "both brushes", value: stats.week.complete },
          { label: "flossed", value: stats.week.flossed },
          { label: "mouthwash", value: stats.week.mouthwash },
        ].map((s) => (
          <div key={s.label} className="rounded-[24px] bg-card px-2 py-4 text-center">
            <p className="flex items-baseline justify-center">
              <span className="tile-number text-[40px]">{s.value}</span>
              <span className="text-[18px] font-bold text-muted">/7</span>
            </p>
            <p className="mt-1 text-[14px] leading-tight font-medium text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <Tile>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Last two weeks</h2>
          <span className="flex font-mono text-[12px] text-muted" aria-hidden>
            <span className="w-12 text-center">AM</span>
            <span className="ml-2 w-12 text-center">PM</span>
          </span>
        </div>
        <Rows>
          {Array.from({ length: 13 }, (_, i) => addDays(today, -(i + 1))).map((date) => {
            const d = days.get(date);
            const extras = [d?.morning?.flossed || d?.night?.flossed ? "floss" : null, d?.morning?.mouthwash || d?.night?.mouthwash ? "mouthwash" : null].filter(Boolean);
            return (
              <div key={date} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[17px] font-bold">{friendlyDate(date, today)}</p>
                  {extras.length > 0 && <p className="text-[14px] font-medium text-muted">+ {extras.join(", ")}</p>}
                </div>
                <PastSlotToggle date={date} slot="morning" done={!!d?.morning} label={`Brushed the morning of ${date}`} />
                <PastSlotToggle date={date} slot="night" done={!!d?.night} label={`Brushed the night of ${date}`} />
              </div>
            );
          })}
        </Rows>
      </Tile>

      <Tile>
        <TileHeader title="Badges" />
        <ul className="grid grid-cols-3 gap-x-2 gap-y-5 pt-2">
          {teethBadges.map((b) => (
            <li key={b.key} className="flex flex-col items-center gap-2 text-center">
              <BadgeDisc achievement={b} earned={have.has(b.key)} size={64} />
              <span className={`text-[15px] leading-tight font-bold ${have.has(b.key) ? "" : "text-muted"}`}>{b.title}</span>
            </li>
          ))}
        </ul>
      </Tile>

      {!reminders?.length && (
        <Link href="/reminders/new?kind=teeth" className="mx-3 mb-2.5 flex items-center gap-3 rounded-tile bg-reminders px-5 py-4 text-reminders-ink active:opacity-85">
          <Bell className="size-6 shrink-0" aria-hidden />
          <span className="text-[16px] font-bold">Get a reminder if you haven&apos;t brushed by bedtime</span>
        </Link>
      )}
    </>
  );
}
