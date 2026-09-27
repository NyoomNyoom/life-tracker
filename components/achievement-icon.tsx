import { Dumbbell, Flag, Flame, Footprints, Lock, Map as MapIcon, MapPin, Medal as MedalGlyph, Mountain, Smile, Sparkles, Trophy } from "lucide-react";
import type { Achievement } from "@/lib/achievements";
import type { Challenge } from "@/lib/challenges";
import { cx } from "./ui";

const GLYPHS = {
  dumbbell: Dumbbell,
  flame: Flame,
  trophy: Trophy,
  sparkles: Sparkles,
  smile: Smile,
  medal: MedalGlyph,
  flag: Flag,
  "map-pin": MapPin,
  mountain: Mountain,
  footprints: Footprints,
  map: MapIcon,
};

const METALS = {
  gold: ["#fde68a", "#d4a017", "#a16207"],
  silver: ["#f4f4f5", "#a1a1aa", "#52525b"],
  bronze: ["#f3c7a0", "#c07a3f", "#7c4a1e"],
};

/** A finisher's medal: ribbon plus a metal disc with the route's glyph. Greyed out until earned. */
export function Medal({ challenge, earned, size = 64 }: { challenge: Challenge; earned: boolean; size?: number }) {
  const [light, mid, dark] = METALS[challenge.medal.metal];
  const Glyph = GLYPHS[challenge.medal.glyph];
  const id = `medal-${challenge.slug}`;
  return (
    <div
      className={cx("relative shrink-0", !earned && "opacity-40 grayscale")}
      style={{ width: size, height: size * 1.25 }}
      role="img"
      aria-label={`${challenge.name} medal${earned ? "" : " (not earned yet)"}`}
    >
      <svg viewBox="0 0 64 80" width={size} height={size * 1.25} aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={light} />
            <stop offset="0.55" stopColor={mid} />
            <stop offset="1" stopColor={dark} />
          </linearGradient>
        </defs>
        <path d="M14 0 H30 L38 30 H22 Z" fill={challenge.medal.ribbon[0]} />
        <path d="M34 0 H50 L42 30 H26 Z" fill={challenge.medal.ribbon[1]} />
        <circle cx="32" cy="52" r="25" fill={`url(#${id})`} />
        <circle cx="32" cy="52" r="19.5" fill="none" stroke={light} strokeOpacity="0.7" strokeWidth="1.5" />
      </svg>
      <Glyph
        className="absolute text-white drop-shadow"
        style={{ width: size * 0.36, height: size * 0.36, left: size * 0.32, top: size * 1.25 * 0.65 - size * 0.18 }}
        strokeWidth={2.4}
        aria-hidden
      />
      {!earned && <Lock className="absolute right-0 bottom-0 size-4 text-muted" aria-hidden />}
    </div>
  );
}

const GROUP_STYLE = {
  training: "bg-accent text-accent-fg",
  teeth: "bg-teeth text-white",
  checkpoint: "bg-journey text-white",
  medal: "bg-pr text-white",
};

/** Round badge for training, brushing and checkpoint achievements. */
export function BadgeDisc({ achievement, earned, size = 48 }: { achievement: Achievement; earned: boolean; size?: number }) {
  const Glyph = GLYPHS[achievement.glyph];
  return (
    <div
      className={cx("flex shrink-0 items-center justify-center rounded-full", earned ? GROUP_STYLE[achievement.group] : "bg-field text-faint")}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {earned ? <Glyph style={{ width: size * 0.5, height: size * 0.5 }} strokeWidth={2.2} /> : <Lock style={{ width: size * 0.4, height: size * 0.4 }} />}
    </div>
  );
}
