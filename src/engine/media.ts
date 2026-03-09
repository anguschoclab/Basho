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
import { rngFromSeed, rngForWorld, SeededRNG } from "./rng";
import type { Id, WorldState, BoutResult, BashoName, Division, BashoState } from "./types";
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
  | "discipline";

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

  /** Per-rikishi consecutive win count within current basho (reset between basho) */
  bashoStreaks: Record<Id, number>;

  /** Track which streak milestones already fired to avoid duplicates */
  streakHeadlinesFired: Record<Id, number[]>;

  /** Track which promotion_watch headlines fired this basho (rikishiId → true) */
  promoWatchFired: Record<Id, boolean>;

  /** Track which retirement_watch headlines fired this basho (rikishiId → true) */
  retirementWatchFired: Record<Id, boolean>;

  /** Whether title_race headline has fired this basho (fires once per day threshold) */
  titleRaceDayFired: Record<number, boolean>;

  /** Track which injury withdrawal headlines fired this basho (rikishiId → true) */
  injuryWithdrawalFired: Record<Id, boolean>;

  /** Per-rikishi media heat history snapshots (bashoName → heat value) for sparklines */
  mediaHeatHistory: Record<Id, Array<{ basho: string; heat: number }>>;
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
    heyaPressure: {},
    bashoStreaks: {},
    streakHeadlinesFired: {},
    promoWatchFired: {},
    retirementWatchFired: {},
    titleRaceDayFired: {},
    injuryWithdrawalFired: {},
    mediaHeatHistory: {},
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
  let hasRivalry = false;
  if (args.rivalries) {
    const mods = getRivalryBoutModifiers({ state: args.rivalries, aId: result.winnerRikishiId, bId: result.loserRikishiId });
    impact += Math.round(mods.tension * 22);
    if (mods.tension > 0.1) hasRivalry = true;
  }

  // Rank-based bump (higher ranks get more coverage)
  const winnerRankImpact = rankImpact(winner?.rank);
  const loserRankImpact = rankImpact(loser?.rank);
  impact += winnerRankImpact + loserRankImpact;

  // Injury context
  const winnerInjured = winner && (winner as any).injury?.active;
  const loserInjured = loser && (loser as any).injury?.active;

  impact = clampInt(impact, 0, 100);

  // --- Context-aware tone assignment ---
  let tone: MediaTone;
  const roll = rng.next();
  if (result.upset) {
    // Upsets: mostly hype, but controversy if a high-ranker lost badly
    if (loserRankImpact >= 8 && roll < 0.3) tone = "controversy";
    else if (roll < 0.15) tone = "disrespect";
    else tone = "hype";
  } else if (winnerInjured || loserInjured) {
    // Injury context: concern or controversy
    tone = roll < 0.6 ? "concern" : "controversy";
  } else if (hasRivalry) {
    // Rivalry bouts: hype or controversy
    tone = roll < 0.5 ? "hype" : roll < 0.8 ? "controversy" : "praise";
  } else if (winnerRankImpact >= 8) {
    // Top-rank wins: praise or hype
    tone = roll < 0.5 ? "praise" : roll < 0.8 ? "hype" : "neutral";
  } else if (winnerRankImpact >= 5) {
    // Mid-rank wins: mixed
    tone = roll < 0.35 ? "praise" : roll < 0.55 ? "hype" : roll < 0.7 ? "concern" : "neutral";
  } else {
    // Lower-division: mostly neutral with occasional praise
    tone = roll < 0.25 ? "praise" : roll < 0.35 ? "hype" : "neutral";
  }

  const beat: MediaBeat = result.upset ? "upset" : hasRivalry ? "rivalry" : "daily_bout";
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

  let next = applyHeadlineEffects(state, world, headline);

  // --- Streak tracking & headlines ---
  const extraHeadlines: MediaHeadline[] = [];
  const streakHL = updateStreakAndGenerateHeadline({ state: next, world, winnerId: result.winnerRikishiId, loserId: result.loserRikishiId, day: args.day, bashoName: args.bashoName, rng });
  if (streakHL.headline) {
    next = applyHeadlineEffects(streakHL.state, world, streakHL.headline);
    extraHeadlines.push(streakHL.headline);
  } else {
    next = streakHL.state;
  }

  // --- Promotion/demotion watch headlines ---
  const promoHL = checkPromotionWatch({ state: next, world, result, day: args.day, bashoName: args.bashoName, rng });
  if (promoHL.headline) {
    next = applyHeadlineEffects(promoHL.state, world, promoHL.headline);
    extraHeadlines.push(promoHL.headline);
  } else {
    next = promoHL.state;
  }

  // --- Retirement watch headlines ---
  const retireHL = checkRetirementWatch({ state: next, world, result, day: args.day, bashoName: args.bashoName, rng });
  if (retireHL.headline) {
    next = applyHeadlineEffects(retireHL.state, world, retireHL.headline);
    extraHeadlines.push(retireHL.headline);
  } else {
    next = retireHL.state;
  }

  // --- Title race headlines ---
  const titleHL = checkTitleRace({ state: next, world, day: args.day, bashoName: args.bashoName, rng });
  if (titleHL.headline) {
    next = applyHeadlineEffects(titleHL.state, world, titleHL.headline);
    extraHeadlines.push(titleHL.headline);
  } else {
    next = titleHL.state;
  }

  return { state: next, headlines: [headline, ...extraHeadlines] };
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

/** =========================
 *  Streak Tracking & Headlines
 *  ========================= */

const STREAK_MILESTONES = [5, 8, 10, 12, 15];

function updateStreakAndGenerateHeadline(args: {
  state: MediaState;
  world: WorldState;
  winnerId: Id;
  loserId: Id;
  day?: number;
  bashoName?: BashoName;
  rng: SeededRNG;
}): { state: MediaState; headline: MediaHeadline | null } {
  const { world, winnerId, loserId, rng } = args;
  const week = world.week ?? 0;

  const nextStreaks = { ...args.state.bashoStreaks };
  const nextFired = { ...args.state.streakHeadlinesFired };

  // Winner's streak increments
  nextStreaks[winnerId] = (nextStreaks[winnerId] ?? 0) + 1;
  // Loser's streak resets
  nextStreaks[loserId] = 0;

  const streak = nextStreaks[winnerId];
  const firedList = nextFired[winnerId] ?? [];

  // Check if we hit a new milestone
  const milestone = STREAK_MILESTONES.find(m => streak >= m && !firedList.includes(m));

  let state: MediaState = { ...args.state, bashoStreaks: nextStreaks, streakHeadlinesFired: nextFired };

  if (!milestone) return { state, headline: null };

  // Record milestone as fired
  nextFired[winnerId] = [...firedList, milestone];
  state = { ...state, streakHeadlinesFired: nextFired };

  const r = world.rikishi.get(winnerId);
  if (!r) return { state, headline: null };

  const impact = clampInt(35 + milestone * 4, 0, 100);
  const tier: HeadlineTier = impact >= 70 ? "main_event" : impact >= 40 ? "national" : "local";
  const tone: MediaTone = milestone >= 10 ? "hype" : milestone >= 8 ? "praise" : "neutral";

  const titles = milestone >= 10
    ? [`${r.shikona} Is Unstoppable — ${streak} Straight Wins`, `${streak}-0: ${r.shikona} Rewrites the Narrative`]
    : milestone >= 8
    ? [`${r.shikona} Surges to ${streak} Consecutive Victories`, `${streak} and Counting for ${r.shikona}`]
    : [`${r.shikona} Extends Win Streak to ${streak}`, `Hot Streak: ${r.shikona} Now ${streak}-0`];

  const subtitles = milestone >= 10
    ? "The entire division is watching. This is history in the making."
    : milestone >= 8
    ? "A kachi-koshi secured — but the momentum says there's more to come."
    : "Consistency is building into something the press can't ignore.";

  const headline: MediaHeadline = {
    id: makeId(`mh-streak-${week}-${args.day ?? 0}-${winnerId}-${streak}`),
    week,
    bashoName: args.bashoName,
    tier,
    beat: "streak",
    tone,
    rikishiIds: [winnerId],
    heyaIds: [r.heyaId].filter(Boolean) as Id[],
    title: titles[Math.floor(rng.next() * titles.length)],
    subtitle: subtitles,
    impact,
    tags: ["basho", "streak", `streak_${streak}`],
  };

  return { state, headline };
}

/** =========================
 *  Promotion / Demotion Watch Headlines
 *  ========================= */

function checkPromotionWatch(args: {
  state: MediaState;
  world: WorldState;
  result: BoutResult;
  day?: number;
  bashoName?: BashoName;
  rng: SeededRNG;
}): { state: MediaState; headline: MediaHeadline | null } {
  const { world, result, rng } = args;
  const week = world.week ?? 0;
  const day = args.day ?? 0;

  // Only fire on days 10+ (late basho, when bubble matters)
  if (day < 10) return { state: args.state, headline: null };

  const winner = world.rikishi.get(result.winnerRikishiId);
  if (!winner) return { state: args.state, headline: null };

  // Already fired for this rikishi this basho?
  if (args.state.promoWatchFired[result.winnerRikishiId]) {
    return { state: args.state, headline: null };
  }

  // Get standings
  const basho = (world as any).basho as BashoState | undefined;
  const standings = basho?.standings;
  if (!standings) return { state: args.state, headline: null };

  const record = standings instanceof Map
    ? standings.get(result.winnerRikishiId)
    : (standings as any)[result.winnerRikishiId];
  if (!record) return { state: args.state, headline: null };

  const { wins, losses } = record;
  const rank = winner.rank;

  // Determine if this is a noteworthy promotion/demotion scenario
  let scenario: { title: string; subtitle: string; tone: MediaTone; beat: MediaBeat } | null = null;

  // Ozeki promotion run: sekiwake/komusubi with 10+ wins
  if ((rank === "sekiwake" || rank === "komusubi") && wins >= 10) {
    scenario = {
      title: rng.next() < 0.5
        ? `${winner.shikona} on the Ozeki Doorstep — ${wins}-${losses}`
        : `Ozeki Talk Swirls Around ${winner.shikona}`,
      subtitle: "The committee will be watching every remaining bout with pen in hand.",
      tone: "hype",
      beat: "promotion_watch",
    };
  }
  // Yokozuna promotion: ozeki with 12+ wins
  else if (rank === "ozeki" && wins >= 12) {
    scenario = {
      title: rng.next() < 0.5
        ? `${winner.shikona} Eyes the Rope — ${wins}-${losses}`
        : `Yokozuna Deliberation Looms for ${winner.shikona}`,
      subtitle: "A performance worthy of the highest honour. The YDC convenes.",
      tone: "hype",
      beat: "promotion_watch",
    };
  }
  // Kachi-koshi clinch (exactly 8 wins) for makuuchi rikishi
  else if (rank === "maegashira" && wins === 8 && losses <= 7) {
    scenario = {
      title: rng.next() < 0.5
        ? `${winner.shikona} Clinches Winning Record`
        : `Kachi-Koshi Secured for ${winner.shikona}`,
      subtitle: "A winning record means safety — and perhaps a step up the banzuke.",
      tone: "praise",
      beat: "promotion_watch",
    };
  }
  // Demotion danger: juryo rikishi with 8+ losses
  else if (rank === "juryo" && losses >= 8) {
    scenario = {
      title: rng.next() < 0.5
        ? `${winner.shikona} Fights to Survive in Juryo — ${wins}-${losses}`
        : `Demotion Looms for ${winner.shikona}`,
      subtitle: "Every remaining bout is do-or-die at the bottom of the paid ranks.",
      tone: "concern",
      beat: "promotion_watch",
    };
  }
  // Make-koshi: high-ranker (sanyaku) with 8+ losses
  else if ((rank === "sekiwake" || rank === "komusubi") && losses >= 8) {
    scenario = {
      title: `${winner.shikona} Drops Below .500 — Sanyaku Spot in Jeopardy`,
      subtitle: "A make-koshi at this level means a painful fall down the rankings.",
      tone: "concern",
      beat: "promotion_watch",
    };
  }
  // Ozeki kadoban: ozeki with 8+ losses
  else if (rank === "ozeki" && losses >= 8) {
    scenario = {
      title: rng.next() < 0.5
        ? `Kadoban Alert: ${winner.shikona} Posts Make-Koshi`
        : `${winner.shikona}'s Ozeki Rank in Peril`,
      subtitle: "A losing record at ozeki triggers kadoban — one more and it's over.",
      tone: "controversy",
      beat: "promotion_watch",
    };
  }

  if (!scenario) return { state: args.state, headline: null };

  // Mark as fired
  const nextPromo = { ...args.state.promoWatchFired, [result.winnerRikishiId]: true };
  const state: MediaState = { ...args.state, promoWatchFired: nextPromo };

  const impact = clampInt(55 + rankImpact(rank) * 3, 0, 100);
  const tier: HeadlineTier = impact >= 70 ? "main_event" : impact >= 40 ? "national" : "local";

  const headline: MediaHeadline = {
    id: makeId(`mh-promo-${week}-${day}-${result.winnerRikishiId}`),
    week,
    bashoName: args.bashoName,
    tier,
    beat: scenario.beat,
    tone: scenario.tone,
    rikishiIds: [result.winnerRikishiId],
    heyaIds: [winner.heyaId].filter(Boolean) as Id[],
    title: scenario.title,
    subtitle: scenario.subtitle,
    impact,
    tags: ["basho", "promotion_watch", rank ?? "unknown"],
  };

  return { state, headline };
}

/** Reset basho-scoped streak/promo tracking (call at basho start) */
export function resetBashoMediaTracking(state: MediaState): MediaState {
  return {
    ...state,
    bashoStreaks: {},
    streakHeadlinesFired: {},
    promoWatchFired: {},
    retirementWatchFired: {},
    titleRaceDayFired: {},
    injuryWithdrawalFired: {},
  };
}

/** =========================
 *  Injury Withdrawal Headlines
 *  ========================= */

/**
 * Generate a headline when a rikishi is injured during a basho and forced to withdraw.
 * Call from injuries.onBoutResolved after an injury is applied.
 */
export function generateInjuryWithdrawalHeadline(args: {
  world: WorldState;
  rikishiId: Id;
  severity: string;
  area: string;
  description: string;
  opponentId?: Id;
  day?: number;
  bashoName?: BashoName;
}): MediaHeadline | null {
  const { world, rikishiId, severity, area, description, opponentId, day, bashoName } = args;
  const w = world as any;
  if (!w.mediaState) w.mediaState = createDefaultMediaState();
  const mediaState: MediaState = w.mediaState;

  // Only fire once per rikishi per basho
  if (mediaState.injuryWithdrawalFired?.[rikishiId]) return null;

  const r = world.rikishi.get(rikishiId);
  if (!r) return null;

  const week = world.week ?? 0;
  const shikona = r.shikona ?? "Unknown";
  const rank = r.rank ?? "unknown";
  const rng = rngForWorld(world, "media", `injury-withdraw::${rikishiId}::w${week}`);

  const isSerious = severity === "serious";
  const isModerate = severity === "moderate";
  const isHighRank = rankImpact(rank) >= 5;

  const impact = clampInt(
    (isSerious ? 70 : isModerate ? 50 : 35) + (isHighRank ? 15 : 0),
    0, 100
  );
  const tier: HeadlineTier = impact >= 70 ? "main_event" : impact >= 40 ? "national" : "local";
  const tone: MediaTone = isSerious ? "concern" : isModerate ? "concern" : "neutral";

  const opponent = opponentId ? world.rikishi.get(opponentId) : null;
  const oppName = opponent?.shikona ?? "opponent";

  const titles = isSerious
    ? [
        `${shikona} Withdraws — Serious ${capitalize(area)} Injury`,
        `Basho Over for ${shikona} After ${capitalize(area)} Injury`,
      ]
    : isModerate
    ? [
        `${shikona} Forced Out With ${capitalize(area)} Problem`,
        `Injury Sidelines ${shikona} Mid-Tournament`,
      ]
    : [
        `${shikona} Pulls Out After ${capitalize(area)} Concern`,
        `${shikona} Withdraws — Minor Injury Cited`,
      ];

  const subtitles = isSerious
    ? `A devastating blow — ${shikona} was carried off after the bout with ${oppName}.`
    : isModerate
    ? `The ${rank} could not continue after ${description.toLowerCase()}`
    : `A precautionary withdrawal. The stable hopes for a quick recovery.`;

  const headline: MediaHeadline = {
    id: makeId(`mh-injury-${week}-${day ?? 0}-${rikishiId}`),
    week,
    bashoName,
    tier,
    beat: "injury",
    tone,
    rikishiIds: opponentId ? [rikishiId, opponentId] : [rikishiId],
    heyaIds: [r.heyaId, opponent?.heyaId].filter(Boolean) as Id[],
    title: titles[Math.floor(rng.next() * titles.length)],
    subtitle: subtitles,
    impact,
    tags: ["basho", "injury", severity, area],
    bout: opponentId ? {
      winnerId: opponentId,
      loserId: rikishiId,
      upset: false,
      day,
    } : undefined,
  };

  // Apply effects and mark as fired
  const nextFired = { ...(mediaState.injuryWithdrawalFired || {}), [rikishiId]: true };
  let nextState: MediaState = { ...mediaState, injuryWithdrawalFired: nextFired };
  nextState = applyHeadlineEffects(nextState, world, headline);
  w.mediaState = nextState;

  return headline;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** =========================
 *  Scandal / Discipline Headlines
 *  ========================= */

/**
 * Generate a headline when governance sanctions or scandals affect a heya.
 * Called from governance.ts on status changes and scandal reports.
 */
export function generateScandalHeadline(args: {
  world: WorldState;
  heyaId: Id;
  type: "scandal" | "status_change";
  severity: "minor" | "major" | "critical";
  reason: string;
  description: string;
  fineAmount?: number;
}): MediaHeadline | null {
  const { world, heyaId, type, severity, reason, description } = args;
  const w = world as any;
  if (!w.mediaState) w.mediaState = createDefaultMediaState();

  const heya = world.heyas.get(heyaId);
  if (!heya) return null;

  const week = world.week ?? 0;
  const rng = rngForWorld(world, "media", `scandal::${heyaId}::w${week}`);

  const impact = clampInt(
    severity === "critical" ? 80 : severity === "major" ? 55 : 30,
    0, 100
  );
  const tier: HeadlineTier = impact >= 70 ? "main_event" : impact >= 40 ? "national" : "local";
  const tone: MediaTone = severity === "critical" ? "controversy" : severity === "major" ? "concern" : "neutral";

  let title: string;
  let subtitle: string;

  if (type === "scandal") {
    const titles = severity === "critical"
      ? [`${heya.name} Rocked by Major Scandal`, `Crisis at ${heya.name} — JSA Steps In`]
      : severity === "major"
      ? [`${heya.name} Under Fire: ${reason}`, `Scandal Clouds Hang Over ${heya.name}`]
      : [`${heya.name} Receives JSA Warning`, `Minor Infraction at ${heya.name}`];
    title = titles[Math.floor(rng.next() * titles.length)];
    subtitle = args.fineAmount
      ? `A ¥${args.fineAmount.toLocaleString()} fine has been levied. ${description}`
      : description;
  } else {
    const titles = severity === "critical"
      ? [`${heya.name} Sanctioned by JSA`, `${heya.name} Faces Unprecedented Sanctions`]
      : severity === "major"
      ? [`${heya.name} Placed on Probation`, `JSA Puts ${heya.name} on Notice`]
      : [`${heya.name} Under Review`, `JSA Issues Warning to ${heya.name}`];
    title = titles[Math.floor(rng.next() * titles.length)];
    subtitle = description;
  }

  const headline: MediaHeadline = {
    id: makeId(`mh-scandal-${week}-${heyaId}-${type}`),
    week,
    bashoName: world.currentBashoName,
    tier,
    beat: "discipline",
    tone,
    rikishiIds: [],
    heyaIds: [heyaId],
    title,
    subtitle,
    impact,
    tags: ["discipline", type, severity],
  };

  let nextState: MediaState = w.mediaState;
  nextState = applyHeadlineEffects(nextState, world, headline);
  w.mediaState = nextState;

  return headline;
}

/**
 * Snapshot current media heat values for sparkline history.
 * Call once at basho end to record the heat state for each rikishi.
 */
export function snapshotMediaHeatForBasho(state: MediaState, bashoName: string): MediaState {
  const history = { ...state.mediaHeatHistory };
  for (const [id, heat] of Object.entries(state.mediaHeat)) {
    if (!history[id]) history[id] = [];
    history[id] = [...history[id], { basho: bashoName, heat }].slice(-12); // Keep last 12 basho
  }
  return { ...state, mediaHeatHistory: history };
}

/** =========================
 *  Retirement Watch Headlines
 *  ========================= */

const VETERAN_AGE_THRESHOLD = 33;

function checkRetirementWatch(args: {
  state: MediaState;
  world: WorldState;
  result: BoutResult;
  day?: number;
  bashoName?: BashoName;
  rng: SeededRNG;
}): { state: MediaState; headline: MediaHeadline | null } {
  const { world, result, rng } = args;
  const week = world.week ?? 0;
  const day = args.day ?? 0;

  // Only fire on day 8+ (mid-basho when record matters)
  if (day < 8) return { state: args.state, headline: null };

  // Check the loser — retirement watch is about the struggling veteran
  const loserId = result.loserRikishiId;
  const loser = world.rikishi.get(loserId);
  if (!loser) return { state: args.state, headline: null };

  // Already fired?
  if (args.state.retirementWatchFired[loserId]) return { state: args.state, headline: null };

  // Age check
  const age = world.year - (loser.birthYear || world.year - 25);
  if (age < VETERAN_AGE_THRESHOLD) return { state: args.state, headline: null };

  // Get standings — need a losing record
  const basho = world.currentBasho;
  const standings = basho?.standings;
  if (!standings) return { state: args.state, headline: null };

  const record = standings instanceof Map
    ? standings.get(loserId)
    : (standings as any)[loserId];
  if (!record) return { state: args.state, headline: null };

  const { wins, losses } = record;

  // Must have more losses than wins and at least 6 losses
  if (losses < 6 || wins >= losses) return { state: args.state, headline: null };

  // Check career record for pattern of decline (optional — if available)
  const prevBasho = loser.currentBashoRecord;
  const hadPriorMakeKoshi = prevBasho && prevBasho.losses > prevBasho.wins;

  // Fire if: veteran with 6+ losses, OR veteran with consecutive make-koshi pattern
  const shouldFire = losses >= 8 || (losses >= 6 && hadPriorMakeKoshi);
  if (!shouldFire) return { state: args.state, headline: null };

  // Mark as fired
  const nextRetire = { ...args.state.retirementWatchFired, [loserId]: true };
  const state: MediaState = { ...args.state, retirementWatchFired: nextRetire };

  const shikona = loser.shikona ?? "Unknown";
  const rank = loser.rank ?? "unknown";

  const isHighRank = rankImpact(rank) >= 5;
  const impact = clampInt(isHighRank ? 65 : 40 + age - VETERAN_AGE_THRESHOLD, 0, 100);
  const tier: HeadlineTier = impact >= 70 ? "main_event" : impact >= 40 ? "national" : "local";

  const titles = hadPriorMakeKoshi
    ? [
        `Is This the End? ${shikona} Stumbles Again at ${age}`,
        `${shikona}'s Decline Continues — Retirement Whispers Grow`,
      ]
    : [
        `${shikona} Struggles at ${age} — ${wins}-${losses}`,
        `Retirement Watch: ${shikona} Faces Another Tough Basho`,
      ];

  const subtitles = isHighRank
    ? "A once-dominant force now battles time as much as opponents."
    : "The veteran's body tells a story that grit alone can't rewrite.";

  const headline: MediaHeadline = {
    id: makeId(`mh-retire-${week}-${day}-${loserId}`),
    week,
    bashoName: args.bashoName,
    tier,
    beat: "retirement_watch",
    tone: "concern",
    rikishiIds: [loserId],
    heyaIds: [loser.heyaId].filter(Boolean) as Id[],
    title: titles[Math.floor(rng.next() * titles.length)],
    subtitle: subtitles,
    impact,
    tags: ["basho", "retirement_watch", `age_${age}`],
  };

  return { state, headline };
}

/** =========================
 *  Title Race Headlines
 *  ========================= */

function checkTitleRace(args: {
  state: MediaState;
  world: WorldState;
  day?: number;
  bashoName?: BashoName;
  rng: SeededRNG;
}): { state: MediaState; headline: MediaHeadline | null } {
  const { world, rng } = args;
  const week = world.week ?? 0;
  const day = args.day ?? 0;

  // Only fire on day 12+ (final stretch)
  if (day < 12) return { state: args.state, headline: null };

  // Only fire once per day
  if (args.state.titleRaceDayFired[day]) return { state: args.state, headline: null };

  const basho = world.currentBasho;
  const standings = basho?.standings;
  if (!standings) return { state: args.state, headline: null };

  // Collect all standings into array
  const entries: Array<{ id: Id; wins: number; losses: number }> = [];
  if (standings instanceof Map) {
    standings.forEach((v, k) => entries.push({ id: k, wins: v.wins, losses: v.losses }));
  } else {
    for (const [k, v] of Object.entries(standings as Record<string, { wins: number; losses: number }>)) {
      entries.push({ id: k, wins: v.wins, losses: v.losses });
    }
  }

  if (entries.length === 0) return { state: args.state, headline: null };

  // Sort by wins desc
  entries.sort((a, b) => b.wins - a.wins || a.losses - b.losses);

  const topWins = entries[0].wins;
  // Leaders: all rikishi within 1 win of top
  const leaders = entries.filter(e => e.wins >= topWins - 1 && e.wins >= 8);

  // Need at least 2 contenders to have a "race"
  if (leaders.length < 2) return { state: args.state, headline: null };

  // Mark day as fired
  const nextFired = { ...args.state.titleRaceDayFired, [day]: true };
  const state: MediaState = { ...args.state, titleRaceDayFired: nextFired };

  const tiedAtTop = leaders.filter(e => e.wins === topWins);
  const chasers = leaders.filter(e => e.wins === topWins - 1);

  // Build names
  const getName = (id: Id) => world.rikishi.get(id)?.shikona ?? "Unknown";
  const topNames = tiedAtTop.slice(0, 3).map(e => getName(e.id));
  const chaserNames = chasers.slice(0, 2).map(e => getName(e.id));

  let title: string;
  let subtitle: string;

  if (tiedAtTop.length >= 3) {
    title = rng.next() < 0.5
      ? `Three-Way Tie at ${topWins} Wins — Who Takes the Yusho?`
      : `${topNames[0]}, ${topNames[1]}, ${topNames[2]} Deadlocked at ${topWins}`;
    subtitle = "The most chaotic title race in memory enters its final act.";
  } else if (tiedAtTop.length === 2) {
    title = rng.next() < 0.5
      ? `${topNames[0]} and ${topNames[1]} Share the Lead at ${topWins} Wins`
      : `Yusho Race: ${topNames[0]} vs ${topNames[1]}`;
    subtitle = "Two warriors. One Emperor's Cup. The final days will decide everything.";
  } else if (chasers.length > 0) {
    title = rng.next() < 0.5
      ? `${topNames[0]} Leads at ${topWins} — ${chaserNames.join(", ")} ${chasers.length > 1 ? "Lurk" : "Lurks"} Behind`
      : `Can Anyone Catch ${topNames[0]}?`;
    subtitle = `Just one win separates the leader from the pack with ${15 - day} days remaining.`;
  } else {
    return { state, headline: null };
  }

  const impact = clampInt(70 + tiedAtTop.length * 5, 0, 100);
  const tier: HeadlineTier = "main_event";

  const allIds = leaders.slice(0, 4).map(e => e.id);
  const heyaIds = allIds.map(id => world.rikishi.get(id)?.heyaId).filter(Boolean) as Id[];

  const headline: MediaHeadline = {
    id: makeId(`mh-title-${week}-${day}-${topWins}`),
    week,
    bashoName: args.bashoName,
    tier,
    beat: "title_race",
    tone: "hype",
    rikishiIds: allIds,
    heyaIds: [...new Set(heyaIds)],
    title,
    subtitle,
    impact,
    tags: ["basho", "title_race", `day_${day}`],
  };

  return { state, headline };
}