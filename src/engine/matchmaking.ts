import { clamp, stableSort } from './utils';
import { stableTieBreak } from './utils/sort';
// matchmaking.ts
// =======================================================
// Matchmaking System v1.1 — Deterministic torikumi pairing for ALL divisions
// - Deterministic (seedrandom only, no Math.random)
// - Hard rules: no same-heya, avoid repeats within basho (unless forced)
// - Division-aware bout counts (sekitori 15, others 7 by default; overrideable)
// - Produces scored candidate pairs; schedule.ts builds final set.
// =======================================================
import { rngFromSeed, SeededRNG } from "./rng";
import type { BashoState } from "./types/basho";
import type { Division, Side } from "./types/banzuke";
import type { Rikishi } from "./types/rikishi";
import type { RivalriesState } from "./systems/narrative/RivalryConstants";
import { getRivalryBoutModifiers } from "./systems/narrative/RivalryHeatService";

/** Defines the structure for match pairing. */
export interface MatchPairing {
  eastId: string;
  westId: string;
  score: number; // higher = better
  reasons: string[];
}

/** Defines the structure for matchmaking rules. */
export interface MatchmakingRules {
  avoidSameHeya: boolean;
  avoidRepeatOpponents: boolean;
  preferSimilarRecords: boolean;
  preferSimilarRank: boolean;
  avoidHugeWeightMismatch: boolean;
  honorExistingSide: boolean;

  /** Allowed if we cannot complete a full card without violating repeat rule */
  allowRepeatsWhenForced: boolean;
}

/** d e f a u l t_ m a t c h m a k i n g_ r u l e s. */
export const DEFAULT_MATCHMAKING_RULES: MatchmakingRules = {
  avoidSameHeya: true,
  avoidRepeatOpponents: true,
  preferSimilarRecords: true,
  preferSimilarRank: true,
  avoidHugeWeightMismatch: true,
  honorExistingSide: true,
  allowRepeatsWhenForced: true
};





/**
 * Get record.
 *  * @param basho - The Basho.
 *  * @param rikishiId - The Rikishi id.
 *  * @returns The result.
 */
function getRecord(basho: BashoState, rikishiId: string): { wins: number; losses: number } {
  const row = basho.standings.get(rikishiId);
  return row ? { wins: row.wins, losses: row.losses } : { wins: 0, losses: 0 };
}

/**
 * Record similarity.
 *  * @param a - The A.
 *  * @param b - The B.
 *  * @returns The result.
 */
function recordSimilarity(a: { wins: number; losses: number }, b: { wins: number; losses: number }): number {
  // Similar record => higher; 0 diff => 1.0
  const diff = Math.abs(a.wins - b.wins) + Math.abs(a.losses - b.losses);
  return 1 / (1 + diff * 0.5);
}

/**
 * Rank similarity.
 *  * @param a - The A.
 *  * @param b - The B.
 *  * @returns The result.
 */
function rankSimilarity(a: Rikishi, b: Rikishi): number {
  // If ranks differ (e.g., upper vs lower), penalize. If equal, compare rankNumber distance.
  if (a.rank !== b.rank) return 0.25;

  const an = typeof a.rankNumber === "number" ? a.rankNumber : 0;
  const bn = typeof b.rankNumber === "number" ? b.rankNumber : 0;

  if (an <= 0 || bn <= 0) return 0.75;
  const diff = Math.abs(an - bn);
  return 1 / (1 + diff * 0.35);
}

/**
 * Weight mismatch score.
 *  * @param a - The A.
 *  * @param b - The B.
 *  * @returns The result.
 */
function weightMismatchScore(a: Rikishi, b: Rikishi): number {
  const wa = typeof a.weight === "number" ? a.weight : 0;
  const wb = typeof b.weight === "number" ? b.weight : 0;
  if (wa <= 0 || wb <= 0) return 1;

  const diff = Math.abs(wa - wb);
  // 0kg diff -> 1.0, 40kg diff -> ~0.5, 80kg diff -> ~0.33
  return 1 / (1 + diff / 40);
}

/**
 * Have faced this basho.
 *  * @param basho - The Basho.
 *  * @param aId - The A id.
 *  * @param bId - The B id.
 *  * @returns The result.
 */
function haveFacedThisBasho(basho: BashoState, aId: string, bId: string): boolean {
  for (const m of basho.matches) {
    const e = m.eastRikishiId;
    const w = m.westRikishiId;
    if ((e === aId && w === bId) || (e === bId && w === aId)) return true;
  }
  return false;
}

/**
 * Assign sides.
 *  * @param a - The A.
 *  * @param b - The B.
 *  * @param honorExistingSide - The Honor existing side.
 *  * @returns The result.
 */
function assignSides(a: Rikishi, b: Rikishi, honorExistingSide: boolean): { eastId: string; westId: string; bonus: number; reasons: string[] } {
  const reasons: string[] = [];
  const aSide = a.side as Side | undefined;
  const bSide = b.side as Side | undefined;

  if (honorExistingSide && aSide && bSide && aSide !== bSide) {
    reasons.push("honor_existing_side");
    return {
      eastId: aSide === "east" ? a.id : b.id,
      westId: aSide === "west" ? a.id : b.id,
      bonus: 0.2,
      reasons
    };
  }

  // Deterministic fallback
  const eastId = a.id < b.id ? a.id : b.id;
  const westId = a.id < b.id ? b.id : a.id;
  return { eastId, westId, bonus: 0, reasons };
}

/**
 * Score a pairing. Returns null if a hard rule is violated (unless allowed by caller).
 */
export function scorePairing(args: {
  basho: BashoState;
  a: Rikishi;
  b: Rikishi;
  rules?: Partial<MatchmakingRules>;
  allowRepeatOverride?: boolean;
  facedPairs?: Set<string>;
}): MatchPairing | null {
  const rules = { ...DEFAULT_MATCHMAKING_RULES, ...(args.rules ?? {}) };
  const { basho, a, b } = args;

  if (a.id === b.id) return null;

  // Hard: no same-heya (if configured)
  if (rules.avoidSameHeya && a.heyaId && b.heyaId && a.heyaId === b.heyaId) return null;

  let faced = false;
  if (args.facedPairs) {
    const key = a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`;
    faced = args.facedPairs.has(key);
  } else {
    faced = haveFacedThisBasho(basho, a.id, b.id);
  }

  if (rules.avoidRepeatOpponents && faced && !args.allowRepeatOverride) return null;

  const reasons: string[] = [];
  let score = 1.0;


  // Soft: similar records
  if (rules.preferSimilarRecords) {
    const ra = getRecord(basho, a.id);
    const rb = getRecord(basho, b.id);
    const s = recordSimilarity(ra, rb);

    // In the second half of the tournament (day > 7), strictly prioritize similar records (Swiss-system style)
    const day = basho.day || 1;
    if (day > 7) {
      score *= (0.2 + 0.8 * s); // Much higher weight to record similarity
      if (s > 0.9) reasons.push("strict_record_match");

      // Final Day (Senshuraku) Championship Contender Logic
      if (day === 15 && ra.wins >= 11 && rb.wins >= 11 && Math.abs(ra.wins - rb.wins) <= 1) {
         score *= 2.0;
         reasons.push("yusho_contenders");
      }
    } else {
      score *= (0.6 + 0.4 * s);
      if (s > 0.75) reasons.push("similar_records");
    }
  }

  // Soft: similar rank slot
  if (rules.preferSimilarRank) {
    const s = rankSimilarity(a, b);
    const day = basho.day || 1;

    // Joi-jin Scheduling (Top Ranks)
    // Sanyaku vs Sanyaku usually happens more frequently in the second half.
    // In the first half, Sanyaku fight top Maegashira.
    const isSanyaku = (r: Rikishi) => ["yokozuna", "ozeki", "sekiwake", "komusubi"].includes(r.rank);
    const aSanyaku = isSanyaku(a);
    const bSanyaku = isSanyaku(b);

    if (aSanyaku && bSanyaku) {
      if (day > 7) {
         score *= 1.5; // Encourage Sanyaku matchups late
         reasons.push("sanyaku_matchup");
      } else {
         score *= 0.5; // Discourage Sanyaku matchups early
         reasons.push("sanyaku_avoided_early");
      }
    } else if ((aSanyaku && !bSanyaku) || (!aSanyaku && bSanyaku)) {
      if (day <= 7 && s > 0.5) {
         score *= 1.2; // Sanyaku vs high Maegashira early
         reasons.push("joi_jin_scheduling");
      }
    }

    score *= (0.6 + 0.4 * s);
    if (s > 0.75 && !reasons.includes("similar_rank")) reasons.push("similar_rank");
  }

  // Soft: avoid huge weight mismatch
  if (rules.avoidHugeWeightMismatch) {
    const s = weightMismatchScore(a, b);
    score *= (0.7 + 0.3 * s);
    if (s < 0.6) reasons.push("weight_mismatch");
  }

  // Mild penalty if repeat is allowed (forced scenario)
  if (faced) {
    score *= 0.65;
    reasons.push("repeat_forced");
  }

  // Side assignment
  const side = assignSides(a, b, rules.honorExistingSide);
  score += side.bonus;
  reasons.push(...side.reasons);

  return {
    eastId: side.eastId,
    westId: side.westId,
    score: clamp(score, 0, 5),
    reasons
  };
}

/** Defines the structure for candidate build options. */
interface CandidateBuildOptions {
  seed: string;
  division?: Division;
  rules?: Partial<MatchmakingRules>;
}

/**
 * Build candidate pairs.
 */

function generatePairs(
  pool: Rikishi[],
  scoreFn: (a: Rikishi, b: Rikishi) => MatchPairing | null
): MatchPairing[] {
  const out: MatchPairing[] = [];
  for (let i = 0; i < pool.length; i++) {
      for (let j = i + 1; j < pool.length; j++) {
        const pairing = scoreFn(pool[i], pool[j]);
        if (pairing) out.push(pairing);
      }
  }
  return out.sort((a,b) => {
      if (b.score !== a.score) return b.score - a.score;
      return stableTieBreak(a.eastId + "-" + a.westId, b.eastId + "-" + b.westId);
  });
}

export function buildCandidatePairs(
  basho: BashoState,
  rikishi: Rikishi[],
  options: CandidateBuildOptions
): MatchPairing[] {
  const pool = rikishi.filter(r => {
    if (r.isRetired || r.injured) return false;
    if (options.division && r.division !== options.division) return false;
    return true;
  });

  const candidates: MatchPairing[] = [];
  const facedPairs = new Set<string>();
  for (const m of basho.matches) {
    const key = m.eastRikishiId < m.westRikishiId 
      ? `${m.eastRikishiId}-${m.westRikishiId}` 
      : `${m.westRikishiId}-${m.eastRikishiId}`;
    facedPairs.add(key);
  }

  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      const a = pool[i];
      const b = pool[j];
      const result = scorePairing({ basho, a, b, facedPairs });
      if (result) candidates.push(result);
    }
  }

  // Deterministic sort: descending by score, then tie-break by ID
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return stableTieBreak(a.eastId + a.westId, b.eastId + b.westId);
  });
  return candidates;
}

/**
 * Playoff matchmaking strategy.
 */
export function buildPlayoffPairs(
  basho: BashoState,
  rikishi: Rikishi[],
  options: CandidateBuildOptions & { rules?: Partial<MatchmakingRules> }
): MatchPairing[] {
  const rules: Partial<MatchmakingRules> = {
    avoidSameHeya: false,
    avoidRepeatOpponents: false,
    preferSimilarRecords: true,
    ...(options.rules || {})
  };

  const pool = rikishi.filter(r => r.division === options.division);
  return generatePairs(pool, (a, b) => scorePairing({ basho, a, b, rules }));
}

/**
 * Exhibition matchmaking strategy.
 */
export function buildExhibitionPairs(
  basho: BashoState,
  rikishi: Rikishi[],
  options: CandidateBuildOptions
): MatchPairing[] {
   const rng = rngFromSeed(options.seed, "matchmaking", "exhibition");
   const pool = rikishi.filter(r => r.division === options.division);
   return generatePairs(pool, (a, b) => ({
       eastId: a.id,
       westId: b.id,
       score: rng.next(),
       reasons: ["exhibition"]
   }));
}

// =============================================================================
// Swiss Matchmaking System (Basho v1.0 — JSA Shimpan ruleset)
// =============================================================================

const SWISS_RANK_ORDINAL: Record<string, number> = {
  yokozuna: 0, ozeki: 100, sekiwake: 200, komusubi: 300, maegashira: 400,
  juryo: 500, makushita: 600, sandanme: 700, jonidan: 800, jonokuchi: 900,
};

function banzukeOrdinal(r: Rikishi): number {
  const base = SWISS_RANK_ORDINAL[r.rank] ?? 9000;
  const num = typeof r.rankNumber === "number" ? r.rankNumber : 1;
  const side = r.side === "east" ? 0 : 1;
  return base + num * 2 + side;
}

function isSanyakuRank(r: Rikishi): boolean {
  return ["yokozuna", "ozeki", "sekiwake", "komusubi"].includes(r.rank);
}

function isM1toM4(r: Rikishi): boolean {
  return r.rank === "maegashira" && (r.rankNumber ?? 99) <= 4;
}

function pairKey(aId: string, bId: string): string {
  return aId < bId ? `${aId}-${bId}` : `${bId}-${aId}`;
}

function alreadyPaired(pairings: MatchPairing[], aId: string, bId: string): boolean {
  const key = pairKey(aId, bId);
  return pairings.some(p => pairKey(p.eastId, p.westId) === key);
}

function buildFacedSet(basho: BashoState): Set<string> {
  const set = new Set<string>();
  for (const m of basho.matches) {
    set.add(pairKey(m.eastRikishiId, m.westRikishiId));
  }
  return set;
}

/** Try to create a valid pairing; returns null on hard-rule violations. */
function tryPair(
  basho: BashoState,
  a: Rikishi,
  b: Rikishi,
  facedSet: Set<string>,
  pairedIds: Set<string>,
  rivalriesState?: RivalriesState
): MatchPairing | null {
  if (pairedIds.has(a.id) || pairedIds.has(b.id)) return null;
  const p = scorePairing({ basho, a, b, facedPairs: facedSet });
  if (!p) return null;
  if (rivalriesState) {
    const mod = getRivalryBoutModifiers({ state: rivalriesState, aId: a.id, bId: b.id });
    if (mod.tension >= 0.5) {
      return { ...p, score: clamp(p.score + 0.3, 0, 5), reasons: [...p.reasons, "rivalry_heat"] };
    }
  }
  return p;
}

/** Phase 1 — Days 1–7: Banzuke-proximal pairing */
function phase1(
  basho: BashoState,
  pool: Rikishi[],
  facedSet: Set<string>,
  rivalriesState?: RivalriesState
): MatchPairing[] {
  const sorted = [...pool].sort((a, b) => banzukeOrdinal(a) - banzukeOrdinal(b));
  const paired = new Set<string>();
  const pairings: MatchPairing[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    if (paired.has(a.id)) continue;

    // Try i+1, i+2, i+3 for heya conflict avoidance
    let matched = false;
    for (let offset = 1; offset <= 3 && i + offset < sorted.length; offset++) {
      const b = sorted[i + offset];
      if (paired.has(b.id)) continue;
      const p = tryPair(basho, a, b, facedSet, paired, rivalriesState);
      if (p) {
        pairings.push(p);
        paired.add(a.id);
        paired.add(b.id);
        matched = true;
        break;
      }
    }

    // Fallback: forced same-heya pairing if needed
    if (!matched) {
      for (let j = i + 1; j < sorted.length; j++) {
        const b = sorted[j];
        if (paired.has(b.id)) continue;
        const forced = scorePairing({ basho, a, b, facedPairs: facedSet, allowRepeatOverride: true, rules: { avoidSameHeya: false } });
        if (forced) {
          pairings.push({ ...forced, reasons: [...forced.reasons, "forced"] });
          paired.add(a.id);
          paired.add(b.id);
          break;
        }
      }
    }
  }

  // Post-pass: ensure all san'yaku face M1–M4 if not already
  for (const pairing of pairings) {
    const east = pool.find(r => r.id === pairing.eastId);
    const west = pool.find(r => r.id === pairing.westId);
    if (!east || !west) continue;
    if (isSanyakuRank(east) && !isM1toM4(west) && west.rank === "maegashira") {
      pairing.reasons.push("sanyaku_vs_joi");
    }
  }

  return pairings;
}

/** Phase 2 — Days 8–14: Swiss win-bucket pairing */
function phase2(
  basho: BashoState,
  pool: Rikishi[],
  facedSet: Set<string>,
  rivalriesState?: RivalriesState
): MatchPairing[] {
  const standings = basho.standings;
  const paired = new Set<string>();
  const pairings: MatchPairing[] = [];
  const pulledUp = new Set<string>();

  // Build win buckets
  const bucketMap = new Map<number, Rikishi[]>();
  for (const r of pool) {
    const rec = standings?.get(r.id) ?? { wins: 0, losses: 0 };
    const wins = rec.wins;
    if (!bucketMap.has(wins)) bucketMap.set(wins, []);
    bucketMap.get(wins)!.push(r);
  }

  // Sort bucket keys descending
  const bucketKeys = [...bucketMap.keys()].sort((a, b) => b - a);

  // Hot-streak pull-up: 10+ wins undefeated → face highest available san'yaku
  for (const r of pool) {
    const rec = standings?.get(r.id) ?? { wins: 0, losses: 0 };
    if (rec.wins >= 10 && rec.losses === 0 && !isSanyakuRank(r)) {
      const topSanyaku = pool
        .filter(s => isSanyakuRank(s) && !paired.has(s.id) && !pulledUp.has(s.id))
        .sort((a, b) => banzukeOrdinal(a) - banzukeOrdinal(b))[0];
      if (topSanyaku) {
        const p = tryPair(basho, r, topSanyaku, facedSet, paired, rivalriesState);
        if (p) {
          pairings.push({ ...p, reasons: [...p.reasons, "hot_streak_pullup"] });
          paired.add(r.id);
          paired.add(topSanyaku.id);
          pulledUp.add(r.id);
        }
      }
    }
  }

  // Process each win bucket
  for (const wins of bucketKeys) {
    const bucket = (bucketMap.get(wins) ?? [])
      .filter(r => !paired.has(r.id))
      .sort((a, b) => banzukeOrdinal(a) - banzukeOrdinal(b));

    // If odd, pull up the highest-ordinal rikishi from the next-lower bucket
    let extraFromBelow: Rikishi | undefined;
    if (bucket.length % 2 !== 0) {
      const lowerWins = bucketKeys.find(k => k < wins);
      if (lowerWins !== undefined) {
        const lowerBucket = (bucketMap.get(lowerWins) ?? [])
          .filter(r => !paired.has(r.id) && !pulledUp.has(r.id))
          .sort((a, b) => banzukeOrdinal(a) - banzukeOrdinal(b));
        if (lowerBucket.length > 0) {
          extraFromBelow = lowerBucket[0];
          pulledUp.add(extraFromBelow.id);
          bucket.push(extraFromBelow);
        }
      }
    }

    // Greedy pair within bucket
    for (let i = 0; i < bucket.length; i++) {
      const a = bucket[i];
      if (paired.has(a.id)) continue;
      for (let j = i + 1; j < bucket.length; j++) {
        const b = bucket[j];
        if (paired.has(b.id)) continue;
        const p = tryPair(basho, a, b, facedSet, paired, rivalriesState);
        if (p) {
          pairings.push(p);
          paired.add(a.id);
          paired.add(b.id);
          break;
        }
      }
    }
  }

  // Catch any remaining unpaired rikishi with forced pairings
  const unpaired = pool.filter(r => !paired.has(r.id));
  for (let i = 0; i < unpaired.length - 1; i += 2) {
    const a = unpaired[i];
    const b = unpaired[i + 1];
    const forced = scorePairing({ basho, a, b, facedPairs: facedSet, allowRepeatOverride: true, rules: { avoidSameHeya: false } });
    if (forced) {
      pairings.push({ ...forced, reasons: [...forced.reasons, "forced"] });
    }
  }

  return pairings;
}

/** Phase 3 — Day 15 (Senshuraku): kore yori san'yaku + yusho exception */
function phase3(
  basho: BashoState,
  pool: Rikishi[],
  facedSet: Set<string>,
  rivalriesState?: RivalriesState
): MatchPairing[] {
  const standings = basho.standings;
  const paired = new Set<string>();
  const pairings: MatchPairing[] = [];

  // Determine max wins for yusho contender logic
  let maxWins = 0;
  for (const [, rec] of standings ?? []) {
    if (rec.wins > maxWins) maxWins = rec.wins;
  }

  const contenders = pool.filter(r => {
    const rec = standings?.get(r.id) ?? { wins: 0, losses: 0 };
    return rec.wins >= maxWins - 1;
  });

  // YUSHO EXCEPTION: non-san'yaku contender leads → face highest available san'yaku
  const nonSanyakuLeader = contenders.find(r => !isSanyakuRank(r) && (standings?.get(r.id)?.wins ?? 0) >= maxWins);
  if (nonSanyakuLeader) {
    const gatekeeper = pool
      .filter(r => isSanyakuRank(r) && !paired.has(r.id))
      .sort((a, b) => banzukeOrdinal(a) - banzukeOrdinal(b))[0];
    if (gatekeeper) {
      const p = tryPair(basho, nonSanyakuLeader, gatekeeper, facedSet, paired, rivalriesState);
      if (p) {
        pairings.push({ ...p, reasons: [...p.reasons, "yusho_exception"] });
        paired.add(nonSanyakuLeader.id);
        paired.add(gatekeeper.id);
      }
    }
  }

  // Build kore yori san'yaku: last 3 bouts reserved for top san'yaku
  const sanYakuSorted = pool
    .filter(r => isSanyakuRank(r) && !paired.has(r.id))
    .sort((a, b) => banzukeOrdinal(a) - banzukeOrdinal(b));

  const reserved: MatchPairing[] = [];

  // Yokozuna vs Yokozuna absolutely last
  const yokozuna = sanYakuSorted.filter(r => r.rank === "yokozuna");
  if (yokozuna.length >= 2) {
    const p = tryPair(basho, yokozuna[0], yokozuna[1], facedSet, paired, rivalriesState);
    if (p) {
      reserved.push({ ...p, reasons: [...p.reasons, "kore_yori_sanyaku", "finale"] });
      paired.add(yokozuna[0].id);
      paired.add(yokozuna[1].id);
    }
  } else if (yokozuna.length === 1) {
    const ozeki = sanYakuSorted.find(r => r.rank === "ozeki" && !paired.has(r.id));
    if (ozeki) {
      const p = tryPair(basho, yokozuna[0], ozeki, facedSet, paired, rivalriesState);
      if (p) {
        reserved.push({ ...p, reasons: [...p.reasons, "kore_yori_sanyaku", "finale"] });
        paired.add(yokozuna[0].id);
        paired.add(ozeki.id);
      }
    }
  }

  // Fill remaining kore yori san'yaku slots (up to 3 total reserved bouts)
  const remainingSanyaku = sanYakuSorted.filter(r => !paired.has(r.id));
  for (let i = 0; i < remainingSanyaku.length - 1 && reserved.length < 3; i++) {
    const a = remainingSanyaku[i];
    if (paired.has(a.id)) continue;
    for (let j = i + 1; j < remainingSanyaku.length; j++) {
      const b = remainingSanyaku[j];
      if (paired.has(b.id)) continue;
      const p = tryPair(basho, a, b, facedSet, paired, rivalriesState);
      if (p) {
        reserved.unshift({ ...p, reasons: [...p.reasons, "kore_yori_sanyaku"] });
        paired.add(a.id);
        paired.add(b.id);
        break;
      }
    }
  }

  // Fill remaining bouts using Phase 2 logic
  const remaining = pool.filter(r => !paired.has(r.id));
  const remainderPairings = phase2(basho, remaining, facedSet, rivalriesState);

  // Combine: regular bouts first, reserved kore yori san'yaku last
  return [...remainderPairings, ...pairings, ...reserved];
}

/**
 * Build Swiss torikumi for a single day of a Basho.
 * Implements the JSA Shimpan three-phase matchmaking system:
 *   - Days 1–7: Banzuke-proximal (Phase 1)
 *   - Days 8–14: Swiss win-bucket (Phase 2)
 *   - Day 15: Senshuraku / kore yori san'yaku (Phase 3)
 */
export function buildSwissTorikumi(
  basho: BashoState,
  rikishi: Rikishi[],
  options: {
    seed: string;
    division?: Division;
    rules?: Partial<MatchmakingRules>;
    rivalriesState?: RivalriesState;
  }
): MatchPairing[] {
  const pool = rikishi.filter(r => {
    if (r.isRetired || r.injured) return false;
    if (options.division && r.division !== options.division) return false;
    return true;
  });

  const facedSet = buildFacedSet(basho);
  const day = basho.day ?? 1;

  if (day <= 7) return phase1(basho, pool, facedSet, options.rivalriesState);
  if (day === 15) return phase3(basho, pool, facedSet, options.rivalriesState);
  return phase2(basho, pool, facedSet, options.rivalriesState);
}
