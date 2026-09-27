// Distance challenges: virtual journeys you complete with the distance you log in workouts
// (walks, runs, rides, rows, swims: anything with a distance). Joining one starts the clock;
// every km from workouts dated on or after that day counts, and several can run at once.
//
// The routes live here rather than in the database so they can be tuned in code review.
// Checkpoint ids are part of achievement keys (lib/achievements.ts): never rename or reuse one.

export type Checkpoint = {
  id: string;
  name: string;
  /** Distance from the start, in km. */
  km: number;
  blurb: string;
};

export type Challenge = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  /** Total distance in km. Always equal to the last checkpoint's km. */
  km: number;
  /** True when checkpoint distances are estimates rather than surveyed figures. */
  approximate: boolean;
  medal: { metal: "bronze" | "silver" | "gold"; ribbon: [string, string]; glyph: "mountain" | "footprints" | "flag" | "flame" | "map" };
  /** In order. The last one is the finish, which awards the medal. */
  checkpoints: Checkpoint[];
};

export const CHALLENGES: Challenge[] = [
  {
    slug: "tongariro-crossing",
    name: "Tongariro Alpine Crossing",
    tagline: "New Zealand's great day walk",
    description:
      "Cross the volcanic heart of the North Island, from the Mangatepopo Valley past Red Crater and the Emerald Lakes to Ketetahi. A good first medal.",
    km: 19.4,
    approximate: true,
    medal: { metal: "bronze", ribbon: ["#dc2626", "#f97316"], glyph: "mountain" },
    checkpoints: [
      { id: "soda-springs", name: "Soda Springs", km: 4.3, blurb: "The last water before the Devil's Staircase." },
      { id: "south-crater", name: "South Crater", km: 6.4, blurb: "A flat moonscape between the peaks." },
      { id: "red-crater", name: "Red Crater", km: 8.4, blurb: "The high point, at 1,886 m." },
      { id: "emerald-lakes", name: "Emerald Lakes", km: 9.5, blurb: "Three green-blue crater lakes steaming below you." },
      { id: "blue-lake", name: "Blue Lake", km: 10.6, blurb: "A sacred lake: admire it, but don't touch the water." },
      { id: "finish", name: "Ketetahi", km: 19.4, blurb: "Down through the forest to the road end. Crossing complete!" },
    ],
  },
  {
    slug: "marathon",
    name: "Marathon",
    tagline: "26.2 miles, one step at a time",
    description: "The classic distance. Log it over as many workouts as you like.",
    km: 42.195,
    approximate: false,
    medal: { metal: "silver", ribbon: ["#2563eb", "#e5e7eb"], glyph: "flag" },
    checkpoints: [
      { id: "10k", name: "10 km", km: 10, blurb: "Settling into your stride." },
      { id: "half", name: "Halfway", km: 21.0975, blurb: "A half marathon down." },
      { id: "30k", name: "30 km", km: 30, blurb: "Past the wall." },
      { id: "40k", name: "40 km", km: 40, blurb: "The crowd can smell the finish." },
      { id: "finish", name: "Finish line", km: 42.195, blurb: "Marathon complete!" },
    ],
  },
  {
    slug: "milford-track",
    name: "Milford Track",
    tagline: "The finest walk in the world",
    description:
      "Fiordland's famous four-day Great Walk: up the Clinton valley, over Mackinnon Pass and down the Arthur valley to Milford Sound.",
    km: 53.5,
    approximate: true,
    medal: { metal: "silver", ribbon: ["#0f766e", "#22c55e"], glyph: "footprints" },
    checkpoints: [
      { id: "clinton-hut", name: "Clinton Hut", km: 5, blurb: "An easy first afternoon from Glade Wharf." },
      { id: "mintaro-hut", name: "Mintaro Hut", km: 21.5, blurb: "At the head of the Clinton valley." },
      { id: "mackinnon-pass", name: "Mackinnon Pass", km: 26, blurb: "The memorial cairn at 1,154 m." },
      { id: "dumpling-hut", name: "Dumpling Hut", km: 35.5, blurb: "Sutherland Falls is a short side trip away." },
      { id: "finish", name: "Sandfly Point", km: 53.5, blurb: "Milford Sound. Track complete!" },
    ],
  },
  {
    slug: "walk-to-mordor",
    name: "The Walk to Mordor",
    tagline: "One does not simply walk into Mordor…",
    description:
      "Follow Frodo from Bag End to Mount Doom. Bree, Rivendell, Lothlórien, Rauros and Mount Doom follow the popular fan estimate of the route (1,779 miles); the stops between are rough placements along each leg.",
    km: 2863,
    approximate: true,
    medal: { metal: "gold", ribbon: ["#111827", "#b91c1c"], glyph: "flame" },
    checkpoints: [
      { id: "bucklebury-ferry", name: "Bucklebury Ferry", km: 80, blurb: "Across the Brandywine, just ahead of the Black Riders." },
      { id: "bree", name: "Bree", km: 217, blurb: "A pint at The Prancing Pony, and a Ranger called Strider." },
      { id: "weathertop", name: "Weathertop", km: 380, blurb: "Amon Sûl. Keep the fire lit." },
      { id: "trollshaws", name: "The Trollshaws", km: 560, blurb: "Bilbo's three trolls, still turned to stone." },
      { id: "rivendell", name: "Rivendell", km: 737, blurb: "The Last Homely House. Rest a while." },
      { id: "caradhras", name: "Caradhras", km: 950, blurb: "The Redhorn Pass. The mountain wins this round." },
      { id: "moria", name: "The Doors of Durin", km: 1200, blurb: "Speak, friend, and enter." },
      { id: "lothlorien", name: "Lothlórien", km: 1481, blurb: "The Golden Wood." },
      { id: "great-river", name: "The Great River", km: 1760, blurb: "Down the Anduin in elven boats. Something is following." },
      { id: "argonath", name: "The Argonath", km: 2050, blurb: "The Pillars of the Kings." },
      { id: "rauros", name: "Falls of Rauros", km: 2107, blurb: "The Fellowship breaks. Frodo and Sam go on alone." },
      { id: "dead-marshes", name: "The Dead Marshes", km: 2350, blurb: "Don't follow the lights." },
      { id: "black-gate", name: "The Black Gate", km: 2480, blurb: "Not this way. Sméagol knows another." },
      { id: "minas-morgul", name: "Minas Morgul", km: 2680, blurb: "Up the stairs of Cirith Ungol." },
      { id: "finish", name: "Mount Doom", km: 2863, blurb: "The Ring is destroyed. You did it!" },
    ],
  },
  {
    slug: "te-araroa",
    name: "Te Araroa",
    tagline: "The length of New Zealand",
    description:
      "New Zealand's long pathway, from Cape Reinga at the top of the North Island to Bluff at the bottom of the South. Checkpoint distances are approximate trail kilometres (the Cook Strait ferry doesn't count).",
    km: 3000,
    approximate: true,
    medal: { metal: "gold", ribbon: ["#111827", "#e5e7eb"], glyph: "map" },
    checkpoints: [
      { id: "ahipara", name: "Ahipara", km: 100, blurb: "The end of Ninety Mile Beach." },
      { id: "kerikeri", name: "Kerikeri", km: 250, blurb: "Into the Bay of Islands." },
      { id: "whangarei", name: "Whangārei", km: 380, blurb: "Northland's city." },
      { id: "auckland", name: "Auckland", km: 600, blurb: "Tāmaki Makaurau, through the city on foot." },
      { id: "hamilton", name: "Hamilton", km: 780, blurb: "Along the Waikato River." },
      { id: "taumarunui", name: "Taumarunui", km: 1000, blurb: "The gateway to the Whanganui River." },
      { id: "whanganui", name: "Whanganui", km: 1250, blurb: "Down the river to the coast." },
      { id: "palmerston-north", name: "Palmerston North", km: 1450, blurb: "Over the Tararua foothills next." },
      { id: "wellington", name: "Wellington", km: 1700, blurb: "The North Island is done! Ferry across Cook Strait." },
      { id: "st-arnaud", name: "St Arnaud", km: 1950, blurb: "Nelson Lakes and the Richmond Range behind you." },
      { id: "arthurs-pass", name: "Arthur's Pass", km: 2250, blurb: "Over the Southern Alps." },
      { id: "lake-tekapo", name: "Lake Tekapo", km: 2450, blurb: "Takapō's turquoise water under dark skies." },
      { id: "wanaka", name: "Wānaka", km: 2620, blurb: "Deep in the southern lakes." },
      { id: "queenstown", name: "Queenstown", km: 2720, blurb: "Tāhuna. The final stretch begins." },
      { id: "finish", name: "Bluff", km: 3000, blurb: "Stirling Point signpost. You've walked the length of Aotearoa!" },
    ],
  },
];

/** Activities the quick "log a walk" form offers, by built-in exercise name. */
export const QUICK_ACTIVITIES = ["Walk", "Hike", "Outdoor Run", "Outdoor Cycle"] as const;

export function getChallenge(slug: string): Challenge | undefined {
  return CHALLENGES.find((c) => c.slug === slug);
}

export type ChallengeProgress = {
  km: number;
  /** 0..1 */
  fraction: number;
  reached: Checkpoint[];
  next: Checkpoint | null;
  toNextKm: number;
  remainingKm: number;
  complete: boolean;
};

export function challengeProgress(challenge: Challenge, distanceMeters: number): ChallengeProgress {
  const km = Math.max(0, distanceMeters) / 1000;
  const reached = challenge.checkpoints.filter((c) => km >= c.km);
  const next = challenge.checkpoints.find((c) => km < c.km) ?? null;
  return {
    km,
    fraction: Math.min(1, km / challenge.km),
    reached,
    next,
    toNextKm: next ? next.km - km : 0,
    remainingKm: Math.max(0, challenge.km - km),
    complete: km >= challenge.km,
  };
}

/**
 * Rough finish estimate from recent pace. Returns null when there's no recent distance.
 * `recentKm` is the distance logged toward the challenge over the last `days` days.
 */
export function daysToFinish(remainingKm: number, recentKm: number, days = 30): number | null {
  if (remainingKm <= 0) return 0;
  if (recentKm <= 0) return null;
  return Math.ceil(remainingKm / (recentKm / days));
}

/** "2,863 km" / "1,779 mi" / "4.3 km": journey-scale distances with thousands separators. */
export function formatJourney(km: number, unit: "kg" | "lb"): string {
  const value = unit === "lb" ? km / 1.609344 : km;
  // Short routes need the decimal (Mintaro Hut is 21.5 km); long ones read better rounded.
  const decimals = value < 100 ? 1 : 0;
  const text = (Math.round(value * 10 ** decimals) / 10 ** decimals).toLocaleString("en-US", { maximumFractionDigits: decimals });
  return `${text} ${unit === "lb" ? "mi" : "km"}`;
}
