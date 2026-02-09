// rivalries.ts
// =======================================================
// Rivalries System v1.0 — Deterministic, story-forward relationships
// Canon goals:
// - Rivalries emerge from repeated meetings, close bouts, upsets, and title stakes
// - Rivalries modify bout tension, scouting interest, media attention, and morale hooks
// - Deterministic: no Math.random; all stochasticity via seedrandom + stable salts
// - JSON-safe persistence: store as Records/arrays; no Maps/Sets in saved state
// =======================================================
import { rngFromSeed, rngForWorld } from "./rng";
import { SeededRNG } from "./utils/SeededRNG";
import type { Id, Side, WorldState, BoutResult } from "./types";

/** =========================
 *  Core Types
 *  ========================= */

export type RivalryTone =
  | "respect"
  | "grudge"
  | "bad_blood"
  | "mentor_student"
  | "unstable" // volatile/oscillating
  | "public_hype";

export type RivalryTrigger =
  | "repeat_matches"
  | "close_finish"
  | "upset"
  | "kinboshi"
  | "title_stakes"
  | "injury_incident"
  | "personal_history"
  | "heya_feud";

export type RivalryHeatBand = "cold" | "warm" | "hot" | "inferno";

/** Pair key must be canonical: smallerId|largerId */
export type RivalryKey = string;

export interface RivalryPairState {
  key: RivalryKey;

  aId: Id;
  bId: Id;

  /** 0..100: the “heat” drives frequency + tone strength */
  heat: number;

  /** total bouts fought against each other (career) */
  meetings: number;

  /** last world week they met */
  lastMetWeek: number;

  /** A's record vs B */
  aWins: number;
  bWins: number;

  /** 0..100: perceived closeness (edge battles, mono-ii, long bouts) */
  closeness: number;

  /** 0..100: perceived humiliation/insult (upsets, domination, henka vibes) */
  spite: number;

  /** Derived narrative tone */
  tone: RivalryTone;

  /** Weighted reasons (for UI / narrative) */
  triggers: Partial<Record<RivalryTrigger, number>>;

  /** True if both are from same heya (rarely scheduled, but possible in training/fiction modes) */
  sameHeya: boolean;

  /** Optional “nickname” (UI) */
  label?: string;
}

/** JSON-safe container */
export interface RivalriesState {
  version: "1.0.0";
  pairs: Record<RivalryKey, RivalryPairState>;
}

/** A lightweight UI row */
export interface RivalryDigestRow {
  rivalId: Id;
  rivalName?: string;

  heat: number;
  heatBand: RivalryHeatBand;
  tone: RivalryTone;

  meetings: number;
  record: { selfWins: number; rivalWins: number };

  lastMetWeek: number;

  topTriggers: RivalryTrigger[];
}

/** =========================
 *  Public API
 *  ========================= */

export function createDefaultRivalriesState(): RivalriesState {
  return { version: "1.0.0", pairs: {} };
}

export function makeRivalryKey(aId: Id, bId: Id): RivalryKey {
  return aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`;
}

export function getRivalry(state: RivalriesState, aId: Id, bId: Id): RivalryPairState | null {
  return state.pairs[makeRivalryKey(aId, bId)] ?? null;
}

export function upsertRivalry(state: RivalriesState, pair: RivalryPairState): RivalriesState {
  return {
    ...state,
    pairs: { ...state.pairs, [pair.key]: pair }
  };
}

export function removeRivalry(state: RivalriesState, aId: Id, bId: Id): RivalriesState {
  const key = makeRivalryKey(aId, bId);
  if (!state.pairs[key]) return state;
  const next = { ...state.pairs };
  delete next[key];
  return { ...state, pairs: next };
}

/**
 * Update rivalry state from a completed bout.
 * Call this once per bout resolution.
 *
 * Determinism:
 * - RNG seed is derived from world seed + week + bout participants + day (if provided)
 */
export function updateRivalriesFromBout(args: {
  state: RivalriesState;
  world: WorldState;
  result: BoutResult;
  /** Optional, for stronger determinism and timeline */
  day?: number;
  /** Optional: treat as special stakes */
  isKinboshi?: boolean;
  isTitleStakes?: boolean;
  /** Optional: inferred closeness from bout engine (0..1) */
  closeness01?: number;
  /** Optional: inferred domination from bout engine (0..1) higher => more humiliating */
  domination01?: number;
}): { state: RivalriesState; changedKeys: RivalryKey[] } {
  const { state, world, result } = args;
  const week = world.week ?? 0;
  const day = typeof args.day === "number" ? args.day : 0;

  const winnerId = result.winnerRikishiId;
  const loserId = result.loserRikishiId;

  const key = makeRivalryKey(winnerId, loserId);

  const winner = world.rikishi.get(winnerId);
  const loser = world.rikishi.get(loserId);

  const sameHeya = !!winner && !!loser && winner.heyaId === loser.heyaId;

  const rng = rngForWorld(world, "rivalries", `week${week}::day${day}::${key}`);

  const existing = state.pairs[key] ?? createFreshPairState(winnerId, loserId, key, week, sameHeya);

  const next = applyBoutToPair(existing, {
    rng,
    world,
    result,
    week,
    isKinboshi: !!args.isKinboshi,
    isTitleStakes: !!args.isTitleStakes,
    closeness01: clamp01(args.closeness01 ?? inferCloseness01(result)),
    domination01: clamp01(args.domination01 ?? inferDomination01(result))
  });

  // Cull very cold rivalries to keep state small (deterministic rule, not RNG)
  const shouldCull = next.heat < 10 && next.meetings < 2 && week - next.lastMetWeek > 20;
  const changedKeys: RivalryKey[] = [key];

  if (shouldCull) {
    return { state: removeRivalry(state, winnerId, loserId), changedKeys };
  }

  return { state: upsertRivalry(state, next), changedKeys };
}

/**
 * Decay rivalries weekly. Call at weekly boundary if you want “time heals (some) wounds”.
 * - Deterministic, no RNG required.
 */
export function applyRivalryWeeklyDecay(state: RivalriesState, currentWeek: number): RivalriesState {
  const nextPairs: Record<RivalryKey, RivalryPairState> = {};
  for (const [key, pair] of Object.entries(state.pairs)) {
    const weeksSince = Math.max(0, currentWeek - pair.lastMetWeek);

    // small passive decay, stronger if not met in a long time
    const decay = weeksSince <= 4 ? 0.5 : weeksSince <= 12 ? 1.0 : 1.5;

    const heat = clamp(pair.heat - decay, 0, 100);

    // closeness/spite fade slowly
    const closeness = clamp(pair.closeness - 0.25, 0, 100);
    const spite = clamp(pair.spite - 0.35, 0, 100);

    const toned = { ...pair, heat, closeness, spite };
    const tone = deriveTone(toned);
    const finalPair = { ...toned, tone };

    // auto-cull if ice-cold for long enough
    const shouldCull = finalPair.heat < 5 && finalPair.meetings < 2 && weeksSince > 30;
    if (!shouldCull) nextPairs[key] = finalPair;
  }
  return { ...state, pairs: nextPairs };
}

/**
 * Get rivalries relevant to one rikishi, sorted by heat.
 */
export function getRivalriesForRikishi(state: RivalriesState, rikishiId: Id): RivalryPairState[] {
  const rows = Object.values(state.pairs).filter(p => p.aId === rikishiId || p.bId === rikishiId);
  return rows.sort((x, y) => y.heat - x.heat || (y.meetings - x.meetings));
}

/**
 * Produce a compact digest for UI panels.
 * Optionally pass a name resolver (from world state).
 */
export function buildRivalryDigest(args: {
  state: RivalriesState;
  world?: WorldState;
  rikishiId: Id;
  limit?: number;
}): RivalryDigestRow[] {
  const { state, world, rikishiId } = args;
  const list = getRivalriesForRikishi(state, rikishiId);

  const limit = typeof args.limit === "number" ? Math.max(1, Math.floor(args.limit)) : 5;
  const sliced = list.slice(0, limit);

  return sliced.map(pair => {
    const rivalId = pair.aId === rikishiId ? pair.bId : pair.aId;
    const rivalName = world?.rikishi.get(rivalId)?.shikona;

    const selfWins = pair.aId === rikishiId ? pair.aWins : pair.bWins;
    const rivalWins = pair.aId === rikishiId ? pair.bWins : pair.aWins;

    return {
      rivalId,
      rivalName,
      heat: pair.heat,
      heatBand: heatBand(pair.heat),
      tone: pair.tone,
      meetings: pair.meetings,
      record: { selfWins, rivalWins },
      lastMetWeek: pair.lastMetWeek,
      topTriggers: topTriggers(pair, 3)
    };
  });
}

/**
 * Convert rivalry effects into bout modifiers (optional hook).
 * Keep it subtle; rivalries should flavor, not dominate.
 */
export function getRivalryBoutModifiers(args: {
  state: RivalriesState;
  aId: Id;
  bId: Id;
}): {
  tension: number; // 0..1 (used for PBP intensity, crowd tags)
  volatilityBonus: number; // -0.1..+0.1 (close fights get wilder)
  upsetBonus: number; // 0..1 small bump if grudge/hot
} {
  const pair = getRivalry(args.state, args.aId, args.bId);
  if (!pair) return { tension: 0, volatilityBonus: 0, upsetBonus: 0 };

  const heat01 = clamp01(pair.heat / 100);
  const tension = heat01;

  // volatility: close rivalries tend to be scrappier
  const closeness01 = clamp01(pair.closeness / 100);
  const volatilityBonus = clamp(closeness01 * 0.08 + heat01 * 0.03, -0.1, 0.1);

  // upset: grudges + hot rivalries produce surprises
  const spite01 = clamp01(pair.spite / 100);
  const toneBonus =
    pair.tone === "grudge" || pair.tone === "bad_blood" || pair.tone === "unstable" ? 0.08 : 0.03;

  const upsetBonus = clamp01(heat01 * 0.12 + spite01 * toneBonus);

  return { tension, volatilityBonus, upsetBonus };
}

/** =========================
 *  Internal Logic
 *  ========================= */

function createFreshPairState(aId: Id, bId: Id, key: RivalryKey, week: number, sameHeya: boolean): RivalryPairState {
  // canonicalize a/b ordering to match key ordering
  const [aa, bb] = aId < bId ? [aId, bId] : [bId, aId];

  return {
    key,
    aId: aa,
    bId: bb,
    heat: 0,
    meetings: 0,
    lastMetWeek: week,
    aWins: 0,
    bWins: 0,
    closeness: 0,
    spite: 0,
    tone: "respect",
    triggers: {},
    sameHeya,
    label: undefined
  };
}

function applyBoutToPair(
  pair: RivalryPairState,
  args: {
    rng: SeededRNG;
    world: WorldState;
    result: BoutResult;
    week: number;
    isKinboshi: boolean;
    isTitleStakes: boolean;
    closeness01: number;
    domination01: number;
  }
): RivalryPairState {
  const { rng, world, result, week } = args;

  const winnerId = result.winnerRikishiId;
  const loserId = result.loserRikishiId;

  // Translate winner into a/b space
  const winnerIsA = winnerId === pair.aId;
  const loserIsA = loserId === pair.aId;

  let aWins = pair.aWins;
  let bWins = pair.bWins;

  if (winnerIsA) aWins++;
  else bWins++;

  const meetings = pair.meetings + 1;

  // Heat growth sources
  const base = 6; // meeting alone creates some storyline
  const repeatBonus = Math.min(10, meetings * 0.8);

  const closeBonus = Math.round(args.closeness01 * 10); // 0..10
  const upsetBonus = result.upset ? 12 : 0;

  const titleBonus = args.isTitleStakes ? 6 : 0;
  const kinboshiBonus = args.isKinboshi ? 10 : 0;

  // Domination increases spite; close fights increase closeness
  const closenessGain = Math.round(args.closeness01 * 8);
  const spiteGain = Math.round(args.domination01 * 6) + (result.upset ? 4 : 0);

  // A little deterministic “spice” so identical facts don’t always yield identical heat
  const spice = rng.next() < 0.25 ? 1 : 0;

  let heat = pair.heat + base + repeatBonus + closeBonus + upsetBonus + titleBonus + kinboshiBonus + spice;

  // Clamp and add slight normalization to avoid runaway
  heat = clamp(heat, 0, 100);

  const closeness = clamp(pair.closeness + closenessGain, 0, 100);
  const spite = clamp(pair.spite + spiteGain, 0, 100);

  const triggers = { ...pair.triggers };
  bumpTrigger(triggers, "repeat_matches", 2 + repeatBonus / 4);
  if (args.closeness01 > 0.55) bumpTrigger(triggers, "close_finish", 4);
  if (result.upset) bumpTrigger(triggers, "upset", 6);
  if (args.isKinboshi) bumpTrigger(triggers, "kinboshi", 8);
  if (args.isTitleStakes) bumpTrigger(triggers, "title_stakes", 4);

  // Same-heya tends to be “respect” unless something spicy happens
  if (pair.sameHeya && (result.upset || args.domination01 > 0.7)) bumpTrigger(triggers, "heya_feud", 3);

  const next: RivalryPairState = {
    ...pair,
    meetings,
    lastMetWeek: week,
    aWins,
    bWins,
    heat,
    closeness,
    spite,
    triggers
  };

  const tone = deriveTone(next);
  const label = deriveLabel(next, world);

  return { ...next, tone, label };
}

function bumpTrigger(triggers: RivalryPairState["triggers"], t: RivalryTrigger, amt: number): void {
  triggers[t] = (triggers[t] ?? 0) + amt;
}

function heatBand(heat: number): RivalryHeatBand {
  if (heat >= 80) return "inferno";
  if (heat >= 55) return "hot";
  if (heat >= 30) return "warm";
  return "cold";
}

function topTriggers(pair: RivalryPairState, n: number): RivalryTrigger[] {
  const entries = Object.entries(pair.triggers) as Array<[RivalryTrigger, number]>;
  entries.sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  return entries.slice(0, n).map(e => e[0]);
}

function deriveTone(pair: RivalryPairState): RivalryTone {
  const heat01 = pair.heat / 100;
  const spite01 = pair.spite / 100;
  const close01 = pair.closeness / 100;

  if (pair.sameHeya && pair.heat < 50 && pair.spite < 40) return "respect";

  if (spite01 > 0.7 && heat01 > 0.65) return "bad_blood";
  if (spite01 > 0.45 && heat01 > 0.4) return "grudge";

  if (close01 > 0.65 && heat01 > 0.5) return "respect";

  // volatile if both closeness and spite are meaningful
  if (close01 > 0.45 && spite01 > 0.35 && heat01 > 0.55) return "unstable";

  // public hype is medium heat, lots of repeats, low spite
  if (pair.meetings >= 4 && pair.heat >= 35 && pair.spite < 35) return "public_hype";

  return "respect";
}

function deriveLabel(pair: RivalryPairState, world: WorldState): string | undefined {
  // Optional: you can localize these or move to narrative.ts later.
  const a = world.rikishi.get(pair.aId)?.shikona ?? "A";
  const b = world.rikishi.get(pair.bId)?.shikona ?? "B";
  const band = heatBand(pair.heat);

  if (band === "inferno") return `${a} vs ${b} — Blood Feud`;
  if (band === "hot") return `${a} vs ${b} — Rivalry`;
  if (band === "warm") return `${a} vs ${b} — Grudge Match`;
  return undefined;
}

/** =========================
 *  Inference helpers
 *  ========================= */

function inferCloseness01(result: BoutResult): number {
  // If your bout engine can give better signals, pass closeness01 explicitly.
  // Heuristic: longer duration + no huge mismatch tends to be “closer”.
  const dur = typeof result.duration === "number" ? result.duration : 0;
  const d = clamp01(dur / 12); // assume 0..12s typical in your sim
  const upset = result.upset ? 0.15 : 0;
  return clamp01(d + upset);
}

function inferDomination01(result: BoutResult): number {
  // Heuristic: very short bouts often feel dominant
  const dur = typeof result.duration === "number" ? result.duration : 0;
  const short = 1 - clamp01(dur / 10);
  return clamp01(short);
}

/** =========================
 *  Math helpers
 *  ========================= */

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function clamp01(n: number): number {
  return clamp(n, 0, 1);
}