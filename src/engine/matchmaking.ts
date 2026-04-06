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

/**
 * Phase 1 — Days 1–7: The San'yaku Gauntlet.
 *
 * Step 1: Partition into three groups:
 *   - Elite      = Yokozuna + Ozeki
 *   - Upper-Joi  = M1–M4
 *   - Rest       = Sekiwake, Komusubi, M5+
 *
 * Step 2: Each Elite MUST face an Upper-Joi rikishi (not another Elite).
 *   Greedy: for each Elite (sorted by banzuke ordinal) find the highest-available
 *   Upper-Joi that satisfies all hard constraints (heya block + no repeat).
 *
 * Step 3: Standard proximity for all remaining unmatched rikishi — sort by
 *   banzuke ordinal and pair i with i+1 (offset up to 3 to dodge heya conflicts).
 *   Heya block is NEVER overridden in Phase 1 (JSA 2.1 mandate).
 */
function phase1(
  basho: BashoState,
  pool: Rikishi[],
  facedSet: Set<string>,
  rivalriesState?: RivalriesState
): MatchPairing[] {
  const paired = new Set<string>();
  const pairings: MatchPairing[] = [];

  // ── Step 1: Partition ───────────────────────────────────
  const elite = pool
    .filter(r => r.rank === "yokozuna" || r.rank === "ozeki")
    .sort((a, b) => banzukeOrdinal(a) - banzukeOrdinal(b));

  const upperJoi = pool
    .filter(r => isM1toM4(r))
    .sort((a, b) => banzukeOrdinal(a) - banzukeOrdinal(b));

  // ── Step 2: Elite vs Upper-Joi gauntlet ────────────────
  for (const e of elite) {
    if (paired.has(e.id)) continue;
    for (const joi of upperJoi) {
      if (paired.has(joi.id)) continue;
      const p = tryPair(basho, e, joi, facedSet, paired, rivalriesState);
      if (p) {
        pairings.push({ ...p, reasons: [...p.reasons, "gauntlet"] });
        paired.add(e.id);
        paired.add(joi.id);
        break;
      }
    }
    // Elite overflow: if no Upper-Joi available, falls through to Step 3
  }

  // ── Step 3: Standard proximity for remaining ────────────
  const remaining = [...pool]
    .filter(r => !paired.has(r.id))
    .sort((a, b) => banzukeOrdinal(a) - banzukeOrdinal(b));

  for (let i = 0; i < remaining.length; i++) {
    const a = remaining[i];
    if (paired.has(a.id)) continue;

    let matched = false;
    // Try i+1, i+2, i+3 offsets to dodge heya conflicts
    for (let offset = 1; offset <= 3 && i + offset < remaining.length; offset++) {
      const b = remaining[i + offset];
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

    // Forced fallback: allow repeat but NEVER override the heya block (JSA 2.1)
    if (!matched) {
      for (let j = i + 1; j < remaining.length; j++) {
        const b = remaining[j];
        if (paired.has(b.id)) continue;
        const forced = scorePairing({
          basho, a, b, facedPairs: facedSet,
          allowRepeatOverride: true,
          // avoidSameHeya stays true (default) — heya block is absolute in Swiss
        });
        if (forced) {
          pairings.push({ ...forced, reasons: [...forced.reasons, "forced"] });
          paired.add(a.id);
          paired.add(b.id);
          break;
        }
      }
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
/**
 * Phase 3 — Day 15 (Senshuraku): Yusho Exception + Kore yori san'yaku + Swiss fallback.
 *
 * Execution order (per TDD §3.1–3.3):
 *
 *  A. YUSHO EXCEPTION OVERRIDE (§3.1)
 *     — Exactly one leader AND that leader is Maegashira
 *       → pair them against the highest-available Yokozuna/Ozeki gatekeeper.
 *
 *  B. KORE YORI SAN'YAKU (§3.2)
 *     — All remaining Yokozuna and Ozeki are force-paired against each other.
 *     — Heya block and no-rematch rules are respected; if no valid elite
 *       opponent exists the elite falls back into the Swiss pool.
 *     — The final pairing in the reserved list (the absolute last bout of the
 *       tournament) is tagged "finale". Priority: Yokozuna vs Yokozuna >
 *       Yokozuna vs Ozeki.
 *
 *  C. SWISS FALLBACK (§3.3)
 *     — All unmatched rikishi are passed into phase2() as normal.
 *
 *  The combined output is NOT sorted here — sortChronologically() handles
 *  ordering after buildSwissTorikumi() collects the full result.
 */
function phase3(
  basho: BashoState,
  pool: Rikishi[],
  facedSet: Set<string>,
  rivalriesState?: RivalriesState
): MatchPairing[] {
  const standings = basho.standings;
  const paired = new Set<string>();
  const yushoExceptionPairings: MatchPairing[] = [];
  const koreyoriPairings: MatchPairing[] = [];

  // ── A. YUSHO EXCEPTION OVERRIDE (TDD §3.1) ───────────────────────────────
  //
  // Condition: exactly one rikishi holds the highest win count AND they are
  // a Maegashira (lower-ranked "Cinderella" story).
  let maxWins = 0;
  for (const [, rec] of standings ?? []) {
    if (rec.wins > maxWins) maxWins = rec.wins;
  }

  const leaders = pool.filter(r => (standings?.get(r.id)?.wins ?? 0) >= maxWins);

  if (leaders.length === 1 && leaders[0].rank === "maegashira") {
    const cinderella = leaders[0];
    // Highest-available Yokozuna or Ozeki (sorted by banzuke ordinal = most elite first)
    const gatekeeper = pool
      .filter(r => (r.rank === "yokozuna" || r.rank === "ozeki") && !paired.has(r.id))
      .sort((a, b) => banzukeOrdinal(a) - banzukeOrdinal(b))[0];

    if (gatekeeper) {
      const p = tryPair(basho, cinderella, gatekeeper, facedSet, paired, rivalriesState);
      if (p) {
        yushoExceptionPairings.push({ ...p, reasons: [...p.reasons, "yusho_exception"] });
        paired.add(cinderella.id);
        paired.add(gatekeeper.id);
      }
    }
  }

  // ── B. KORE YORI SAN'YAKU (TDD §3.2) ─────────────────────────────────────
  //
  // All remaining Yokozuna and Ozeki must be paired against each other.
  // Only Yokozuna/Ozeki qualify for forced elite pairings — Sekiwake and
  // Komusubi fall into the Swiss fallback like the rest of the roster.
  //
  // We use a mutable working array so already-paired elites are skipped cleanly.
  let elites = pool
    .filter(r => (r.rank === "yokozuna" || r.rank === "ozeki") && !paired.has(r.id))
    .sort((a, b) => banzukeOrdinal(a) - banzukeOrdinal(b));

  while (elites.length >= 2) {
    const e1 = elites[0];
    let didPair = false;

    for (let i = 1; i < elites.length; i++) {
      const e2 = elites[i];
      if (paired.has(e2.id)) continue;

      const p = tryPair(basho, e1, e2, facedSet, paired, rivalriesState);
      if (p) {
        koreyoriPairings.push({ ...p, reasons: [...p.reasons, "kore_yori_sanyaku"] });
        paired.add(e1.id);
        paired.add(e2.id);
        // Rebuild elites list without the two just paired
        elites = elites.filter(r => r.id !== e1.id && r.id !== e2.id);
        didPair = true;
        break;
      }
    }

    if (!didPair) {
      // No valid elite opponent (stablemate / already met) — leave in pool for Swiss
      elites = elites.slice(1);
    }
  }

  // Promote the highest-ranked pairing to "finale" (last bout of the basho).
  // Yokozuna vs Yokozuna is preferred; Yokozuna vs Ozeki otherwise.
  // koreyoriPairings is already sorted by banzukeOrdinal so the first entry
  // has the lowest combined ordinal = most elite. That bout goes last.
  if (koreyoriPairings.length > 0) {
    const finaleIdx = 0; // lowest banzukeOrdinal sum = most elite pairing
    koreyoriPairings[finaleIdx] = {
      ...koreyoriPairings[finaleIdx],
      reasons: [...koreyoriPairings[finaleIdx].reasons, "finale"],
    };
  }

  // ── C. SWISS FALLBACK for the rest (TDD §3.3) ────────────────────────────
  const swissPool = pool.filter(r => !paired.has(r.id));
  const swissPairings = phase2(basho, swissPool, facedSet, rivalriesState);

  // Combine: Swiss bouts first, Yusho exception next, kore-yori-san'yaku last
  // (sortChronologically will enforce final broadcast order)
  return [...swissPairings, ...yushoExceptionPairings, ...koreyoriPairings];
}

// =============================================================================
// Chronological Sort — lowest-ranked bouts at index 0, elite last (TDD 2.4 §3)
// =============================================================================

/**
 * Sort a finalized pairing list in chronological broadcast order.
 *
 * In real sumo: lower-ranked rikishi fight in the morning, the top-ranked
 * bouts (Yokozuna/Ozeki) happen last at ~17:30.
 *
 * Algorithm: sort by (banzukeOrdinal(east) + banzukeOrdinal(west)) DESCENDING
 * so that the highest combined ordinal (= most junior rikishi) appears at
 * index 0, and the lowest combined ordinal (= elite san'yaku) appears last.
 *
 * Pairings already tagged "kore_yori_sanyaku" or "finale" are guaranteed to
 * be at the end regardless, so within the sorted result the finale bout will
 * always be index length-1.
 */
function sortChronologically(pairings: MatchPairing[], pool: Rikishi[]): MatchPairing[] {
  const byId = new Map<string, Rikishi>(pool.map(r => [r.id, r]));

  const rankScore = (p: MatchPairing): number => {
    const east = byId.get(p.eastId);
    const west = byId.get(p.westId);
    return (east ? banzukeOrdinal(east) : 9000) + (west ? banzukeOrdinal(west) : 9000);
  };

  // Finale / kore-yori-san'yaku bouts always float to the end
  const isElite = (p: MatchPairing) =>
    p.reasons.includes("finale") || p.reasons.includes("kore_yori_sanyaku");

  const regular = pairings.filter(p => !isElite(p)).sort((a, b) => rankScore(b) - rankScore(a));
  const elite = pairings.filter(p => isElite(p)).sort((a, b) => rankScore(b) - rankScore(a));

  return [...regular, ...elite];
}

/**
 * Build Swiss torikumi for a single day of a Basho.
 * Implements the JSA Shimpan three-phase matchmaking system:
 *   - Days 1–7: Banzuke-proximal / San'yaku Gauntlet (Phase 1)
 *   - Days 8–14: Swiss win-bucket (Phase 2)
 *   - Day 15: Senshuraku / kore yori san'yaku (Phase 3)
 *
 * Output is always sorted chronologically: lowest-ranked bouts at index 0,
 * elite san'yaku (and the Yusho decider) at the end. (TDD §2.4 Step 3)
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

  let raw: MatchPairing[];
  if (day <= 7) raw = phase1(basho, pool, facedSet, options.rivalriesState);
  else if (day === 15) raw = phase3(basho, pool, facedSet, options.rivalriesState);
  else raw = phase2(basho, pool, facedSet, options.rivalriesState);

  return sortChronologically(raw, pool);
}
