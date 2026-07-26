/**
 * src/engine/matchmaking/MatchmakingPhases.ts
 * =============================================
 * Candidate pair scoring and exhibition/playoff pair builders.
 *
 * Exports: MatchPairing, MatchmakingRules, DEFAULT_MATCHMAKING_RULES,
 *          scorePairing, buildCandidatePairs, buildPlayoffPairs, buildExhibitionPairs
 */

import { clamp } from "../utils";
import { stableTieBreak } from "../utils/sort";
import { rngFromSeed } from "../rng";
import { isSanyakuRank } from "@/constants/engine/rankDisplay";
import type { BashoState } from "../types/basho";
import type { Division, Side } from "../types/banzuke";
import type { Rikishi } from "../types/rikishi";

// ── Types ─────────────────────────────────────────────────────────────────────

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
  allowRepeatsWhenForced: true,
};

/** Defines the structure for candidate build options. */
export interface CandidateBuildOptions {
  seed: string;
  division?: Division;
  rules?: Partial<MatchmakingRules>;
}

// ── Private scoring helpers ────────────────────────────────────────────────────

function getRecord(basho: BashoState, rikishiId: string): { wins: number; losses: number } {
  const row = basho.standings.get(rikishiId);
  return row ? { wins: row.wins, losses: row.losses } : { wins: 0, losses: 0 };
}

function recordSimilarity(
  a: { wins: number; losses: number },
  b: { wins: number; losses: number }
): number {
  const diff = Math.abs(a.wins - b.wins) + Math.abs(a.losses - b.losses);
  return 1 / (1 + diff * 0.5);
}

function rankSimilarity(a: Rikishi, b: Rikishi): number {
  if (a.rank !== b.rank) return 0.25;
  const an = typeof a.rankNumber === "number" ? a.rankNumber : 0;
  const bn = typeof b.rankNumber === "number" ? b.rankNumber : 0;
  if (an <= 0 || bn <= 0) return 0.75;
  const diff = Math.abs(an - bn);
  return 1 / (1 + diff * 0.35);
}

function haveFacedThisBasho(basho: BashoState, aId: string, bId: string): boolean {
  for (const m of basho.matches) {
    const e = m.eastRikishiId;
    const w = m.westRikishiId;
    if ((e === aId && w === bId) || (e === bId && w === aId)) return true;
  }
  return false;
}

function assignSides(
  a: Rikishi,
  b: Rikishi,
  honorExistingSide: boolean
): { eastId: string; westId: string; bonus: number; reasons: string[] } {
  const reasons: string[] = [];
  const aSide = a.side as Side | undefined;
  const bSide = b.side as Side | undefined;

  if (honorExistingSide && aSide && bSide && aSide !== bSide) {
    reasons.push("honor_existing_side");
    return {
      eastId: aSide === "east" ? a.id : b.id,
      westId: aSide === "west" ? a.id : b.id,
      bonus: 0.2,
      reasons,
    };
  }

  const eastId = a.id < b.id ? a.id : b.id;
  const westId = a.id < b.id ? b.id : a.id;
  return { eastId, westId, bonus: 0, reasons };
}

// ── Public: scorePairing ───────────────────────────────────────────────────────

/**
 * Score a pairing between two rikishi.
 * Returns null if a hard rule is violated (unless allowed by caller).
 *
 * Algorithm:
 * 1. Check for same rikishi (reject)
 * 2. Check for same heya (reject if rule enabled)
 * 3. Check for repeat opponents (reject if rule enabled)
 * 4. Score based on record similarity
 * 5. Score based on rank similarity
 * 6. Apply sanyaku scheduling logic
 * 7. Apply kadoban pressure logic
 * 8. Assign sides and honor existing side preferences
 *
 * @param {{ basho: BashoState; a: Rikishi; b: Rikishi; rules?: Partial<MatchmakingRules>; allowRepeatOverride?: boolean; facedPairs?: Set<string> }} args - Scoring parameters.
 * @param {BashoState} args.basho - Current basho state.
 * @param {Rikishi} args.a - First rikishi.
 * @param {Rikishi} args.b - Second rikishi.
 * @param {Partial<MatchmakingRules>} [args.rules] - Matchmaking rules override.
 * @param {boolean} [args.allowRepeatOverride] - Allow repeat opponents when forced.
 * @param {Set<string>} [args.facedPairs] - Set of already-faced pair keys.
 * @returns {MatchPairing | null} Match pairing with score and reasons, or null if invalid.
 *
 * @example
 * ```ts
 * const pairing = scorePairing({ basho, a: east, b: west, rules: { avoidSameHeya: true } });
 * if (pairing) console.log(`Score: ${pairing.score}, Reasons: ${pairing.reasons.join(", ")}`);
 * ```
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

  if (rules.preferSimilarRecords) {
    const ra = getRecord(basho, a.id);
    const rb = getRecord(basho, b.id);
    const s = recordSimilarity(ra, rb);

    const day = basho.day || 1;
    if (day > 7) {
      score *= 0.2 + 0.8 * s;
      if (s > 0.9) reasons.push("strict_record_match");

      if (day === 15 && ra.wins >= 11 && rb.wins >= 11 && Math.abs(ra.wins - rb.wins) <= 1) {
        score *= 2.0;
        reasons.push("yusho_contenders");
      }
    } else {
      score *= 0.6 + 0.4 * s;
      if (s > 0.75) reasons.push("similar_records");
    }
  }

  if (rules.preferSimilarRank) {
    const s = rankSimilarity(a, b);
    const day = basho.day || 1;

    const aSanyaku = isSanyakuRank(a.rank);
    const bSanyaku = isSanyakuRank(b.rank);

    if (aSanyaku && bSanyaku) {
      if (day > 7) {
        score *= 1.5;
        reasons.push("sanyaku_matchup");
      } else {
        score *= 0.5;
        reasons.push("sanyaku_avoided_early");
      }
    } else if ((aSanyaku && !bSanyaku) || (!aSanyaku && bSanyaku)) {
      if (day <= 7 && s > 0.5) {
        score *= 1.2;
        reasons.push("joi_jin_scheduling");
      }
    }

    score *= 0.6 + 0.4 * s;
    if (s > 0.75 && !reasons.includes("similar_rank")) reasons.push("similar_rank");
  }

  if (faced) {
    score *= 0.65;
    reasons.push("repeat_forced");
  }

  const day = basho.day || 1;
  if (day > 10) {
    const ra = getRecord(basho, a.id);
    const rb = getRecord(basho, b.id);
    const aKadoban = a.rank === "ozeki" && ra.wins < 8;
    const bKadoban = b.rank === "ozeki" && rb.wins < 8;
    if (aKadoban || bKadoban) {
      score *= 1.4;
      reasons.push("kadoban_pressure");
    }
  }

  const side = assignSides(a, b, rules.honorExistingSide);
  score += side.bonus;
  reasons.push(...side.reasons);

  return {
    eastId: side.eastId,
    westId: side.westId,
    score: clamp(score, 0, 5),
    reasons,
  };
}

// ── Candidate / playoff / exhibition builders ──────────────────────────────────

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
  return out.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return stableTieBreak(a.eastId + "-" + a.westId, b.eastId + "-" + b.westId);
  });
}

/**
 * Build candidate pairs for a division.
 * Generates all valid pairings for eligible rikishi in a division.
 *
 * Algorithm:
 * 1. Filter pool by eligibility (not retired, not injured, matching division)
 * 2. Build set of already-faced pairs from basho matches
 * 3. Score all possible pairings using scorePairing
 * 4. Sort by score (highest first) with stable tie-break
 *
 * @param {BashoState} basho - Current basho state.
 * @param {Rikishi[]} rikishi - All rikishi to consider.
 * @param {CandidateBuildOptions} options - Build options (seed, division, rules).
 * @returns {MatchPairing[]} Sorted list of candidate pairings.
 *
 * @example
 * ```ts
 * const candidates = buildCandidatePairs(basho, rikishi, { seed: "matchmaking", division: "makuuchi" });
 * console.log(`Found ${candidates.length} candidate pairings`);
 * ```
 */
export function buildCandidatePairs(
  basho: BashoState,
  rikishi: Rikishi[],
  options: CandidateBuildOptions
): MatchPairing[] {
  const pool = rikishi.filter((r) => {
    if (r.isRetired || r.injured || r.isKyujo) return false;
    if (options.division && r.division !== options.division) return false;
    return true;
  });

  const candidates: MatchPairing[] = [];
  const facedPairs = new Set<string>();
  for (const m of basho.matches) {
    const key =
      m.eastRikishiId < m.westRikishiId
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

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return stableTieBreak(a.eastId + a.westId, b.eastId + b.westId);
  });
  return candidates;
}

/**
 * Build playoff pairs for a division.
 * Generates pairings for playoff scenarios with relaxed rules (no heya/repeat avoidance).
 *
 * Algorithm:
 * 1. Disable same heya and repeat opponent rules
 * 2. Enable record similarity scoring
 * 3. Score all possible pairings in the division
 * 4. Sort by score (highest first) with stable tie-break
 *
 * @param {BashoState} basho - Current basho state.
 * @param {Rikishi[]} rikishi - All rikishi to consider.
 * @param {CandidateBuildOptions & { rules?: Partial<MatchmakingRules> }} options - Build options with rules override.
 * @returns {MatchPairing[]} Sorted list of playoff pairings.
 *
 * @example
 * ```ts
 * const playoffPairs = buildPlayoffPairs(basho, rikishi, { seed: "playoff", division: "makuuchi" });
 * console.log(`Found ${playoffPairs.length} playoff pairings`);
 * ```
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
    ...(options.rules || {}),
  };

  const facedPairs = new Set<string>();
  for (const m of basho.matches) {
    const key =
      m.eastRikishiId < m.westRikishiId
        ? `${m.eastRikishiId}-${m.westRikishiId}`
        : `${m.westRikishiId}-${m.eastRikishiId}`;
    facedPairs.add(key);
  }

  const pool = rikishi.filter((r) => r.division === options.division);
  return generatePairs(pool, (a, b) => scorePairing({ basho, a, b, rules, facedPairs }));
}

/**
 * Build exhibition pairs for demonstration.
 * Generates random pairings for exhibition matches using RNG.
 *
 * Algorithm:
 * 1. Filter pool by eligibility (not retired, not injured)
 * 2. Generate random scores using seeded RNG
 * 3. Sort by random score with stable tie-break
 *
 * @param {BashoState} basho - Current basho state.
 * @param {Rikishi[]} rikishi - All rikishi to consider.
 * @param {CandidateBuildOptions} options - Build options (seed for RNG).
 * @returns {MatchPairing[]} Sorted list of exhibition pairings.
 *
 * @example
 * ```ts
 * const exhibitionPairs = buildExhibitionPairs(basho, rikishi, { seed: "exhibition" });
 * console.log(`Found ${exhibitionPairs.length} exhibition pairings`);
 * ```
 */
export function buildExhibitionPairs(
  _basho: BashoState,
  rikishi: Rikishi[],
  options: CandidateBuildOptions
): MatchPairing[] {
  const rng = rngFromSeed(options.seed, "matchmaking", "exhibition");
  const pool = rikishi.filter((r) => !r.isRetired && !r.injured && !r.isKyujo);
  return generatePairs(pool, (a, b) => ({
    eastId: a.id,
    westId: b.id,
    score: rng.next(),
    reasons: ["exhibition"],
  }));
}
