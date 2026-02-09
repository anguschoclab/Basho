// media.ts
// =======================================================
// Media & Press System v1.0 — Deterministic narrative pressure + public perception
// Canon goals:
// - Media reacts to bouts, streaks, upsets, prizes, scandals, and rivalries
// - Generates "headlines" + weekly/monthly digest inputs for uiDigest.ts / pbp.ts
// - Drives publicPopularity (rikishi), heya prestige pressure, sponsor interest hooks
// - Deterministic: no Math.random; all variability via seeded salts + stable rules
// - JSON-safe persistence: Records/arrays only
//
// Integration points (optional, but supported):
// - rivalries.ts: use rivalry heat/tone to amp coverage
// - scouting.ts: media coverage can slightly increase "public knowledge" confidence
// - sponsors.ts: high coverage can raise sponsor tier chances
// =======================================================
import { rngFromSeed, rngForWorld } from "./rng";
import { SeededRNG } from "./utils/SeededRNG";
import type { Id, WorldState, BoutResult, BashoName, Division } from "./types";
import { buildRivalryDigest, type RivalriesState, getRivalryBoutModifiers } from "./rivalries";

/** =========================
 *  Types
 *  ========================= */

export type MediaTone =
  | "neutral"
  | "praise"
  | "concern"
  | "controversy"
  | "hype"
  | "disrespect";

export type MediaBeat =
  | "daily_bout"
  | "streak"
  | "upset"
  | "title_race"
  | "rivalry"
  | "injury"
  | "promotion_watch"
  | "heya_story"
  | "feature"
  | "retirement_watch"
  | "discipline"; // placeholder for future governance events

export type HeadlineTier = "local" | "national" | "main_event";

export interface MediaHeadline {
  id: Id;
  week: number;
  bashoName?: BashoName;

  tier: HeadlineTier;
  beat: MediaBeat;
  tone: MediaTone;

  /** Entities referenced */
  rikishiIds: Id[];
  heyaIds: Id[];

  /** Text payload */
  title: string;
  subtitle?: string;

  /** Used for UI sorting and downstream effects */
  impact: number; // 0..100

  /** Tags for UI filters */
  tags: string[];

  /** Optional, if headline is about a specific bout */
  bout?: {
    winnerId: Id;
    loserId: Id;
    kimarite?: string;
    upset?: boolean;
    day?: number;
    division?: Division;
  };
}

export interface MediaState {
  version: "1.0.0";

  /** Rolling cache of headlines (you can cap for perf) */
  headlines: MediaHeadline[];

  /** Per-rikishi running media momentum (0..100) */
  mediaHeat: Record<Id, number>;

  /** Per-heya running pressure (0..100) */
  heyaPressure: Record<Id, number>;
}

/** Digest output for UI */
export interface MediaDigest {
  week: number;
  topHeadlines: MediaHeadline[];
  notableRikishi: Array<{ rikishiId: Id; shikona?: string; heat: number; tone: MediaTone }>;
  heyaPressure: Array<{ heyaId: Id; name?: string; pressure: number }>;
}

/** =========================
 *  Defaults
 *  ========================= */

export function createDefaultMediaState(): MediaState {
  return {
    version: "1.0.0",
    headlines: [],
    mediaHeat: {},
    heyaPressure: {}
  };
}

/** =========================
 *  Public API — Updates
 *  ========================= */

/**
 * Update media from a single bout result.
 * Call this once per resolved bout (daily sim loop).
 */
export function updateMediaFromBout(args: {
  state: MediaState;
  world: WorldState;
  result: BoutResult;
  /** Optional context */
  day?: number;
  bashoName?: BashoName;
  division?: Division;
  rivalries?: RivalriesState;
}): { state: MediaState; headlines: MediaHeadline[] } {
  const { state, world, result } = args;
  const week = world.week ?? 0;

  const winner = world.rikishi.get(result.winnerRikishiId);
  const loser = world.rikishi.get(result.loserRikishiId);

  const winnerHeyaId = winner?.heyaId;
  const loserHeyaId = loser?.heyaId;

  const rng = rngForWorld(world, "media", `bout::week${week}::day${args.day ?? 0}::${result.winnerRikishiId}::${result.loserRikishiId}`);

  // Base impact
  let impact = 18;
  if (result.upset) impact += 20;

  // Rivalry amps attention
  if (args.rivalries) {
    const mods = getRivalryBoutModifiers({ state: args.rivalries, aId: result.winnerRikishiId, bId: result.loserRikishiId });
    impact += Math.round(mods.tension * 22);
  }

  // Rank-based bump (higher ranks get more coverage)
  impact += rankImpact(winner?.rank) + rankImpact(loser?.rank);

  impact = clampInt(impact, 0, 100);

  const tone: MediaTone = result.upset ? "hype" : rng.next() < 0.15 ? "praise" : "neutral";
  const beat: MediaBeat = result.upset ? "upset" : "daily_bout";
  const tier: HeadlineTier = impact >= 70 ? "main_event" : impact >= 40 ? "national" : "local";

  const title = buildBoutHeadlineTitle({
    rng,
    world,
    winnerId: result.winnerRikishiId,
    loserId: result.loserRikishiId,
    kimariteName: result.kimariteName,
    upset: result.upset,
    tier
  });

  const subtitle = buildBoutHeadlineSubtitle({
    rng,
    world,
    winnerId: result.winnerRikishiId,
    loserId: result.loserRikishiId,
    upset: result.upset,
    tier
  });

  const headline: MediaHeadline = {
    id: makeId(`mh-${week}-${args.day ?? 0}-${result.winnerRikishiId}-${result.loserRikishiId}-${Math.floor(rng.next() * 1e6)}`),
    week,
    bashoName: args.bashoName,
    tier,
    beat,
    tone,
    rikishiIds: [result.winnerRikishiId, result.loserRikishiId],
    heyaIds: [winnerHeyaId, loserHeyaId].filter(Boolean) as Id[],
    title,
    subtitle,
    impact,
    tags: buildTagsForBout(result, tier, beat),
    bout: {
      winnerId: result.winnerRikishiId,
      loserId: result.loserRikishiId,
      kimarite: result.kimarite,
      upset: result.upset,
      day: args.day,
      division: args.division
    }
  };

  const next = applyHeadlineEffects(state, world, headline);

  return { state: next, headlines: [headline] };
}

/**
 * Weekly media boundary:
 * - decay heat/pressure
 * - optionally generate a weekly feature / heya story
 */
export function processWeeklyMediaBoundary(args: {
  state: MediaState;
  world: WorldState;
  rivalries?: RivalriesState;
  /** How many headlines to retain */
  maxHeadlines?: number;
}): { state: MediaState; headlines: MediaHeadline[] } {
  const { world } = args;
  const week = world.week ?? 0;
  const rng = rngForWorld(world, "media", `week${week}`);

  let state = args.state;

  // decay heat and pressure
  state = decayMediaState(state);

  const generated: MediaHeadline[] = [];

  // Optional weekly feature: pick a hot rikishi or a pressured heya
  const feature = rng.next() < 0.55 ? createWeeklyFeatureHeadline({ rng, world, state, rivalries: args.rivalries }) : null;
  if (feature) {
    state = applyHeadlineEffects(state, world, feature);
    generated.push(feature);
  }

  // cap headlines
  const maxHeadlines = typeof args.maxHeadlines === "number" ? Math.max(20, Math.floor(args.maxHeadlines)) : 250;
  if (state.headlines.length > maxHeadlines) {
    state = { ...state, headlines: state.headlines.slice(state.headlines.length - maxHeadlines) };
  }

  return { state, headlines: generated };
}

/** =========================
 *  Public API — Reads
 *  ========================= */

export function buildMediaDigest(args: {
  state: MediaState;
  world: WorldState;
  week?: number;
  limit?: number;
}): MediaDigest {
  const week = typeof args.week === "number" ? args.week : (args.world.week ?? 0);
  const limit = typeof args.limit === "number" ? Math.max(1, Math.floor(args.limit)) : 6;

  const topHeadlines = args.state.headlines
    .filter(h => h.week === week)
    .sort((a, b) => b.impact - a.impact)
    .slice(0, limit);

  const notableRikishi = Object.entries(args.state.mediaHeat)
    .map(([id, heat]) => ({ rikishiId: id, heat }))
    .sort((a, b) => b.heat - a.heat)
    .slice(0, 5)
    .map(row => ({
      rikishiId: row.rikishiId,
      shikona: args.world.rikishi.get(row.rikishiId)?.shikona,
      heat: row.heat,
      tone: (row.heat >= 70 ? "hype" : row.heat >= 40 ? "praise" : "neutral") as MediaTone
    }));

  const heyaPressure = Object.entries(args.state.heyaPressure)
    .map(([id, pressure]) => ({ heyaId: id, pressure }))
    .sort((a, b) => b.pressure - a.pressure)
    .slice(0, 5)
    .map(row => ({
      heyaId: row.heyaId,
      name: args.world.heyas.get(row.heyaId)?.name,
      pressure: row.pressure
    }));

  return { week, topHeadlines, notableRikishi, heyaPressure };
}

/** =========================
 *  Internal — Headline Effects
 *  ========================= */

function applyHeadlineEffects(state: MediaState, world: WorldState, headline: MediaHeadline): MediaState {
  // Heat: winner up, loser mild up (they’re part of the story)
  const nextHeat = { ...state.mediaHeat };
  for (const id of headline.rikishiIds) {
    const prev = nextHeat[id] ?? 0;
    const bump = headline.impact >= 70 ? 10 : headline.impact >= 40 ? 6 : 3;
    nextHeat[id] = clampInt(prev + bump, 0, 100);
  }

  // Pressure: if tone is concern/controversy, apply to heyas
  const nextPressure = { ...state.heyaPressure };
  const pressBump = headline.tone === "concern" || headline.tone === "controversy" ? 8 : headline.tone === "disrespect" ? 6 : 2;
  for (const heyaId of headline.heyaIds) {
    const prev = nextPressure[heyaId] ?? 0;
    nextPressure[heyaId] = clampInt(prev + pressBump, 0, 100);
  }

  // Optional: nudge rikishi popularity if you track it (safe optional field)
  // - praise/hype increases; controversy can also increase (attention)
  const popDelta =
    headline.tone === "hype" ? 2 :
    headline.tone === "praise" ? 1 :
    headline.tone === "controversy" ? 1 :
    headline.tone === "disrespect" ? -1 : 0;

  if (popDelta !== 0) {
    for (const id of headline.rikishiIds) {
      const r = world.rikishi.get(id);
      if (!r) continue;
      const econ = (r as any).economics;
      if (!econ) continue;
      if (typeof econ.popularity !== "number") continue;
      econ.popularity = clampInt(econ.popularity + popDelta, 0, 100);
    }
  }

  return {
    ...state,
    mediaHeat: nextHeat,
    heyaPressure: nextPressure,
    headlines: [...state.headlines, headline]
  };
}

function decayMediaState(state: MediaState): MediaState {
  const nextHeat: Record<Id, number> = {};
  for (const [id, v] of Object.entries(state.mediaHeat)) {
    // passive decay
    const decayed = v >= 70 ? v - 4 : v >= 40 ? v - 3 : v - 2;
    const nv = clampInt(decayed, 0, 100);
    if (nv > 0) nextHeat[id] = nv;
  }

  const nextPressure: Record<Id, number> = {};
  for (const [id, v] of Object.entries(state.heyaPressure)) {
    const decayed = v - 3;
    const nv = clampInt(decayed, 0, 100);
    if (nv > 0) nextPressure[id] = nv;
  }

  return { ...state, mediaHeat: nextHeat, heyaPressure: nextPressure };
}

/** =========================
 *  Internal — Headline Creation
 *  ========================= */

function createWeeklyFeatureHeadline(args: {
  rng: SeededRNG;
  world: WorldState;
  state: MediaState;
  rivalries?: RivalriesState;
}): MediaHeadline | null {
  const { rng, world, state } = args;
  const week = world.week ?? 0;

  // Candidate: hottest rikishi
  const hot = Object.entries(state.mediaHeat)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, 8);

  const pressed = Object.entries(state.heyaPressure)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, 6);

  const pickHot = hot.length > 0 && (pressed.length === 0 || rng.next() < 0.6);

  if (pickHot) {
    const [id, heat] = seededPick(hot, rng);
    const r = world.rikishi.get(id);
    if (!r) return null;

    const tier: HeadlineTier = heat >= 70 ? "national" : "local";
    const beat: MediaBeat = heat >= 70 ? "feature" : "streak";
    const tone: MediaTone = heat >= 70 ? "hype" : "praise";
    const impact = clampInt(30 + Math.round(heat * 0.35), 0, 100);

    const title = rng.next() < 0.5
      ? `${r.shikona} Draws Eyes This Week`
      : `Spotlight on ${r.shikona}`;

    const subtitle = beat === "streak"
      ? "Momentum is building — and the crowd is noticing."
      : "The story behind the rise, told through keiko and grit.";

    return {
      id: makeId(`mh-feature-${week}-${id}-${Math.floor(rng.next() * 1e6)}`),
      week,
      bashoName: world.currentBashoName,
      tier,
      beat,
      tone,
      rikishiIds: [id],
      heyaIds: [r.heyaId].filter(Boolean) as Id[],
      title,
      subtitle,
      impact,
      tags: ["feature", "weekly"],
    };
  }

  if (pressed.length > 0) {
    const [heyaId, pressure] = seededPick(pressed, rng);
    const h = world.heyas.get(heyaId);
    if (!h) return null;

    const tier: HeadlineTier = pressure >= 70 ? "national" : "local";
    const beat: MediaBeat = "heya_story";
    const tone: MediaTone = pressure >= 70 ? "concern" : "neutral";
    const impact = clampInt(28 + Math.round(pressure * 0.3), 0, 100);

    const title = pressure >= 70
      ? `${h.name} Under the Microscope`
      : `Inside ${h.name}: A Week of Questions`;

    const subtitle =
      tone === "concern"
        ? "Can the stable steady itself before the next turning point?"
        : "A closer look at training, leadership, and expectations.";

    return {
      id: makeId(`mh-heya-${week}-${heyaId}-${Math.floor(rng.next() * 1e6)}`),
      week,
      bashoName: world.currentBashoName,
      tier,
      beat,
      tone,
      rikishiIds: [],
      heyaIds: [heyaId],
      title,
      subtitle,
      impact,
      tags: ["heya", "weekly"],
    };
  }

  return null;
}

function buildBoutHeadlineTitle(args: {
  rng: SeededRNG;
  world: WorldState;
  winnerId: Id;
  loserId: Id;
  kimariteName: string;
  upset: boolean;
  tier: HeadlineTier;
}): string {
  const { rng, world } = args;
  const w = world.rikishi.get(args.winnerId)?.shikona ?? "Unknown";
  const l = world.rikishi.get(args.loserId)?.shikona ?? "Unknown";

  if (args.upset) {
    const opts = [
      `${w} Stuns ${l}`,
      `${w} Shocks the Arena Against ${l}`,
      `${l} Falls — ${w} Seizes the Moment`
    ];
    return opts[Math.floor(rng.next() * opts.length)];
  }

  const opts = [
    `${w} Defeats ${l} by ${args.kimariteName}`,
    `${w} Overcomes ${l}`,
    `${w} Turns Back ${l}`
  ];

  // Main event tier wants punchier copy
  if (args.tier === "main_event" && rng.next() < 0.4) return `${w} Delivers in the Spotlight`;

  return opts[Math.floor(rng.next() * opts.length)];
}

function buildBoutHeadlineSubtitle(args: {
  rng: SeededRNG;
  world: WorldState;
  winnerId: Id;
  loserId: Id;
  upset: boolean;
  tier: HeadlineTier;
}): string | undefined {
  const { rng, world } = args;
  const w = world.rikishi.get(args.winnerId);
  const l = world.rikishi.get(args.loserId);

  const wRank = w?.rank ? w.rank.toUpperCase() : "";
  const lRank = l?.rank ? l.rank.toUpperCase() : "";

  if (args.upset) {
    const opts = [
      "A momentum swing that changes the conversation.",
      "The crowd roars as the script flips.",
      "A result that won’t be forgotten soon."
    ];
    return opts[Math.floor(rng.next() * opts.length)];
  }

  if (args.tier === "main_event") {
    const opts = [
      "A crisp finish that keeps the pressure on.",
      "No hesitation — just execution.",
      "The race tightens with every day."
    ];
    return opts[Math.floor(rng.next() * opts.length)];
  }

  if (rng.next() < 0.35 && wRank && lRank) {
    return `${wRank} vs ${lRank} — a measured bout with clear intent.`;
  }

  return undefined;
}

function buildTagsForBout(result: BoutResult, tier: HeadlineTier, beat: MediaBeat): string[] {
  const tags = ["basho", "bout", beat];
  if (tier === "main_event") tags.push("main_event");
  if (result.upset) tags.push("upset");
  if (result.kimarite) tags.push(result.kimarite);
  return tags;
}

/** =========================
 *  Helpers
 *  ========================= */

function rankImpact(rank?: string): number {
  switch (rank) {
    case "yokozuna": return 10;
    case "ozeki": return 8;
    case "sekiwake": return 6;
    case "komusubi": return 5;
    case "maegashira": return 3;
    case "juryo": return 2;
    default: return 0;
  }
}

function seededPick<T>(arr: T[], rng: SeededRNG): T {
  return arr[Math.floor(rng.next() * arr.length)];
}

function clampInt(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.trunc(n)));
}

function makeId(s: string): Id {
  // Keep it deterministic and short-ish; you can swap for uuid later if needed.
  return s;
}