import { Flag, Flame, Footprints, Map as MapIcon, MapPin, Medal as MedalGlyph, Mountain, Smile, Sparkles, Trophy } from "lucide-react";
import type { Achievement } from "@/lib/achievements";
import type { Challenge } from "@/lib/challenges";
import { BarbellIcon } from "./icons";
import { cx } from "./ui";

const GLYPHS = {
  dumbbell: BarbellIcon,
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

// Flat metals: disc fill, then the ring and glyph colour.
const METALS = {
  gold: ["#f3dc95", "#8a6d1f"],
  silver: ["#e4e4e6", "#6e6d72"],
  bronze: ["#ecc19c", "#8a5530"],
};

/**
 * A finisher's medal: a two-colour ribbon and a flat metal disc with the route's glyph. Faded until earned.
 * `outline` draws it as a dashed silhouette in the current colour, for the challenge hero before it's earned.
 */
export function Medal({ challenge, earned, size = 64, outline = false }: { challenge: Challenge; earned: boolean; size?: number; outline?: boolean }) {
  const [fill, dark] = METALS[challenge.medal.metal];
  const Glyph = GLYPHS[challenge.medal.glyph];
  return (
    <div
      className={cx("relative shrink-0", !earned && !outline && "opacity-55")}
      style={{ width: size, height: size * 1.25 }}
      role="img"
      aria-label={`${challenge.name} medal${earned ? "" : " (not earned yet)"}`}
    >
      <svg viewBox="0 0 64 80" width={size} height={size * 1.25} aria-hidden>
        {outline ? (
          <>
            <path d="M14 0 H30 L38 30 H22 Z" fill="currentColor" opacity="0.25" />
            <path d="M34 0 H50 L42 30 H26 Z" fill="currentColor" opacity="0.4" />
            <circle cx="32" cy="52" r="24" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="5 5" />
          </>
        ) : (
          <>
            <path d="M14 0 H30 L38 30 H22 Z" fill={challenge.medal.ribbon[0]} />
            <path d="M34 0 H50 L42 30 H26 Z" fill={challenge.medal.ribbon[1]} />
            <circle cx="32" cy="52" r="24" fill={fill} stroke={dark} strokeWidth="3" />
          </>
        )}
      </svg>
      <Glyph
        className="absolute"
        style={{ width: size * 0.36, height: size * 0.36, left: size * 0.32, top: size * 1.25 * 0.65 - size * 0.18, color: outline ? "currentColor" : dark }}
        strokeWidth={2.4}
        aria-hidden
      />
    </div>
  );
}

const GROUP_STYLE = {
  training: "bg-training text-training-ink border-ink",
  teeth: "bg-teeth text-teeth-ink border-teeth-ink",
  checkpoint: "bg-challenges text-challenges-ink border-challenges-ink",
  medal: "bg-achievements text-achievements-ink border-achievements-ink",
};

/** Round badge for training, brushing and checkpoint achievements: tracker colour with an ink ring once earned. */
export function BadgeDisc({ achievement, earned, size = 56, onDark = false }: { achievement: Achievement; earned: boolean; size?: number; onDark?: boolean }) {
  const Glyph = GLYPHS[achievement.glyph];
  return (
    <div
      className={cx(
        "flex shrink-0 items-center justify-center rounded-full",
        earned ? cx("border-[3px]", GROUP_STYLE[achievement.group], onDark && "border-todos") : "bg-field text-faint",
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Glyph style={{ width: size * 0.42, height: size * 0.42 }} strokeWidth={2.2} />
    </div>
  );
}
