import { PartyPopper } from "lucide-react";
import { describeAchievement } from "@/lib/achievements";
import { getChallenge } from "@/lib/challenges";
import { BadgeDisc, Medal } from "./achievement-icon";

/** "You earned…" card listing new achievements. Unknown keys are ignored. */
export function Celebration({ keys, floating = false }: { keys: string[]; floating?: boolean }) {
  const items = keys.map((k) => describeAchievement(k)).filter((a) => a != null);
  if (items.length === 0) return null;
  return (
    <section className={floating ? "overflow-hidden rounded-2xl bg-pr-soft" : "mx-4 mb-4 overflow-hidden rounded-2xl bg-pr-soft"} aria-live="polite">
      <h2 className="flex items-center gap-2 px-4 pt-3 text-[15px] font-semibold text-pr">
        <PartyPopper className="size-5" aria-hidden /> {items.length === 1 ? "Achievement unlocked!" : `${items.length} achievements unlocked!`}
      </h2>
      <ul className="space-y-3 p-4">
        {items.map((a) => {
          const challenge = a.challengeSlug ? getChallenge(a.challengeSlug) : undefined;
          return (
            <li key={a.key} className="flex items-center gap-3">
              {a.group === "medal" && challenge ? <Medal challenge={challenge} earned size={40} /> : <BadgeDisc achievement={a} earned size={40} />}
              <div className="min-w-0">
                <p className="text-[16px] font-semibold">{a.title}</p>
                <p className="text-[14px] text-muted">{a.description}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
