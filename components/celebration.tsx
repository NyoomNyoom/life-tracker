import { Sparkles } from "lucide-react";
import { describeAchievement } from "@/lib/achievements";
import { getChallenge } from "@/lib/challenges";
import { cx } from "./ui";
import { BadgeDisc, Medal } from "./achievement-icon";

/** "Achievement unlocked!" ink tile listing new achievements. Unknown keys are ignored. */
export function Celebration({ keys, floating = false }: { keys: string[]; floating?: boolean }) {
  const items = keys.map((k) => describeAchievement(k)).filter((a) => a != null);
  if (items.length === 0) return null;
  return (
    <section className={cx("rounded-tile bg-achievements p-5 text-white", !floating && "mx-3 mb-2.5")} aria-live="polite">
      <h2 className="flex items-center gap-2 text-[16px] font-bold text-achievements-ink">
        <Sparkles className="size-5" aria-hidden /> {items.length === 1 ? "Achievement unlocked!" : `${items.length} achievements unlocked!`}
      </h2>
      <ul className="mt-4 space-y-4">
        {items.map((a) => {
          const challenge = a.challengeSlug ? getChallenge(a.challengeSlug) : undefined;
          return (
            <li key={a.key} className="flex items-center gap-4">
              {a.group === "medal" && challenge ? <Medal challenge={challenge} earned size={48} /> : <BadgeDisc achievement={a} earned onDark size={60} />}
              <div className="min-w-0">
                <p className="text-[20px] leading-tight font-extrabold">{a.title}</p>
                <p className="text-[15px] font-medium text-white/70">{a.description}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
