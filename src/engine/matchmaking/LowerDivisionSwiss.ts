/**
 * src/engine/matchmaking/LowerDivisionSwiss.ts
 * ==========================================
 * Swiss-style matchmaking for 7-bout divisions (Makushita, Sandanme, Jonidan, Jonokuchi)
 *
 * Phase 1 (Days 1-2): Rank-Based Matching
 * Phase 2 (Days 3-7): Record-Based Swiss Matching
 *
 * Key differences from Makuuchi Swiss:
 * - No San'yaku gauntlet (no yokozuna/ozeki in lower divisions)
 * - Simpler rank-based phase (days 1-2 instead of days 1-7)
 * - Record matching starts earlier (day 3 vs day 8)
 * - 3-3 is critical kachi-koshi bout (equivalent to 7-7 in Makuuchi)
 * - 7 total bouts instead of 15
 */

import type { BashoState } from "../types/basho";
import type { Division } from "../types/banzuke";
import type { Rikishi } from "../types/rikishi";
import { scorePairing, type MatchPairing, type MatchmakingRules } from "./MatchmakingPhases";

// ── Banzuke ordinal helpers ────────────────────────────────────────────────────

const DIVISION_ORDINAL: Record<string, number> = {
  makushita: 0,
  sandanme: 100,
  jonidan: 200,
  jonokuchi: 300,
};

function banzukeOrdinal(r: Rikishi): number {
  const base = DIVISION_ORDINAL[r.division] ?? 9000;
  const num = typeof r.rankNumber === "number" ? r.rankNumber : 1;
  const side = r.side === "east" ? 0 : 1;
  return base + num * 2 + side;
}

function pairKey(aId: string, bId: string): string {
  return aId < bId ? `${aId}-${bId}` : `${bId}-${aId}`;
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
  pairedIds: Set<string>
): MatchPairing | null {
  if (pairedIds.has(a.id) || pairedIds.has(b.id)) return null;
  const p = scorePairing({ basho, a, b, facedPairs: facedSet });
  if (!p) return null;
  return p;
}

// ── Phase 1 — Days 1–2: Rank-Based Matching ─────────────────────────────────────

/**
 * Phase 1 — Days 1–2: Rank-Based Matching.
 *
 * Simple proximity matching based on banzuke rank.
 * Sort by banzuke ordinal and pair i with i+1 (offset up to 3 to dodge heya conflicts).
 */
function phase1(basho: BashoState, pool: Rikishi[], facedSet: Set<string>): MatchPairing[] {
  const paired = new Set<string>();
  const pairings: MatchPairing[] = [];

  const sorted = [...pool].sort((a, b) => banzukeOrdinal(a) - banzukeOrdinal(b));

  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    if (paired.has(a.id)) continue;

    let matched = false;
    for (let offset = 1; offset <= 3 && i + offset < sorted.length; offset++) {
      const b = sorted[i + offset];
      if (paired.has(b.id)) continue;
      const p = tryPair(basho, a, b, facedSet, paired);
      if (p) {
        pairings.push({ ...p, reasons: [...p.reasons, "rank_proximity"] });
        paired.add(a.id);
        paired.add(b.id);
        matched = true;
        break;
      }
    }

    if (!matched) {
      for (let j = i + 1; j < sorted.length; j++) {
        const b = sorted[j];
        if (paired.has(b.id)) continue;
        const forced = scorePairing({
          basho,
          a,
          b,
          facedPairs: facedSet,
          allowRepeatOverride: true,
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

// ── Phase 2 — Days 3–7: Swiss win-bucket pairing ─────────────────────────────

/**
 * Phase 2 — Days 3–7: Swiss win-bucket pairing.
 *
 * Group rikishi by win count and pair within buckets.
 * Prioritize 3-3 kachi-koshi bouts on Day 7.
 */
function phase2(
  basho: BashoState,
  pool: Rikishi[],
  facedSet: Set<string>,
  day: number
): MatchPairing[] {
  const standings = basho.standings;
  const paired = new Set<string>();
  const pairings: MatchPairing[] = [];
  const pulledUp = new Set<string>();

  const bucketMap = new Map<number, Rikishi[]>();
  for (const r of pool) {
    const rec = standings?.get(r.id) ?? { wins: 0, losses: 0 };
    const wins = rec.wins;
    if (!bucketMap.has(wins)) bucketMap.set(wins, []);
    const bucket = bucketMap.get(wins);
    if (bucket) bucket.push(r);
  }

  const bucketKeys = [...bucketMap.keys()].sort((a, b) => b - a);

  // Day 7: Prioritize 3-3 kachi-koshi bouts
  if (day === 7) {
    const threeThreeBucket = bucketMap.get(3);
    if (threeThreeBucket) {
      const threeThreePool: Rikishi[] = [];
      for (const r of threeThreeBucket) {
        if (!paired.has(r.id)) threeThreePool.push(r);
      }
      threeThreePool.sort((a: Rikishi, b: Rikishi) => banzukeOrdinal(a) - banzukeOrdinal(b));

      for (let i = 0; i < threeThreePool.length - 1; i += 2) {
        const a = threeThreePool[i];
        const b = threeThreePool[i + 1];
        const p = tryPair(basho, a, b, facedSet, paired);
        if (p) {
          pairings.push({ ...p, reasons: [...p.reasons, "kachi_koshi_priority"] });
          paired.add(a.id);
          paired.add(b.id);
        }
      }
    }
  }

  for (let i = 0; i < bucketKeys.length; i++) {
    const wins = bucketKeys[i];
    const bucket: Rikishi[] = [];
    for (const r of bucketMap.get(wins) ?? []) {
      if (!paired.has(r.id)) bucket.push(r);
    }
    bucket.sort((a, b) => banzukeOrdinal(a) - banzukeOrdinal(b));

    let extraFromBelow: Rikishi | undefined;
    if (bucket.length % 2 !== 0) {
      const lowerWins = bucketKeys[i + 1];
      if (lowerWins !== undefined) {
        const lowerBucket: Rikishi[] = [];
        for (const r of bucketMap.get(lowerWins) ?? []) {
          if (!paired.has(r.id) && !pulledUp.has(r.id)) lowerBucket.push(r);
        }
        lowerBucket.sort((a, b) => banzukeOrdinal(a) - banzukeOrdinal(b));
        if (lowerBucket.length > 0) {
          extraFromBelow = lowerBucket[0];
          pulledUp.add(extraFromBelow.id);
          bucket.push(extraFromBelow);
        }
      }
    }

    for (let i = 0; i < bucket.length; i++) {
      const a = bucket[i];
      if (paired.has(a.id)) continue;
      for (let j = i + 1; j < bucket.length; j++) {
        const b = bucket[j];
        if (paired.has(b.id)) continue;
        const p = tryPair(basho, a, b, facedSet, paired);
        if (p) {
          pairings.push(p);
          paired.add(a.id);
          paired.add(b.id);
          break;
        }
      }
    }
  }

  const unpaired: Rikishi[] = [];
  for (const r of pool) {
    if (!paired.has(r.id)) unpaired.push(r);
  }
  for (let i = 0; i < unpaired.length - 1; i += 2) {
    const a = unpaired[i];
    const b = unpaired[i + 1];
    const forced = scorePairing({
      basho,
      a,
      b,
      facedPairs: facedSet,
      allowRepeatOverride: true,
      rules: { avoidSameHeya: false },
    });
    if (forced) {
      pairings.push({ ...forced, reasons: [...forced.reasons, "forced"] });
    }
  }

  return pairings;
}

// ── Lower Division Drama Scoring (3.3) ─────────────────────────────────────────

/**
 * Scores drama for 7-bout lower divisions.
 * Adapts the makuuchi drama labels for the shorter format:
 * - 3-3 on Day 7 = kachi-koshi showdown (equivalent to 7-7 Day 15)
 * - Winless on Day 4+ (equivalent to Day 5+ in makuuchi)
 * - Rookie vs veteran and archetype clash apply regardless of division
 */
function scoreLowerDivisionDrama(
  a: Rikishi,
  b: Rikishi,
  day: number,
  standings: Map<string, { wins: number; losses: number }>
): import("./DramaMatchmaker").DramaContext | null {
  const aRecord = standings.get(a.id) ?? { wins: 0, losses: 0 };
  const bRecord = standings.get(b.id) ?? { wins: 0, losses: 0 };

  // Day 7: 3-3 kachi-koshi showdown (highest drama in lower divisions)
  if (
    day === 7 &&
    aRecord.wins === 3 &&
    aRecord.losses === 3 &&
    bRecord.wins === 3 &&
    bRecord.losses === 3
  ) {
    return {
      label: "make_or_break",
      score: 100,
      reason: "kachi_koshi_showdown_day7_lower",
    };
  }

  // Yusho decider: both rikishi undefeated or within 1 win of leader (day 5+)
  let leaderWins = 0;
  for (const record of standings.values()) {
    if (record.wins > leaderWins) leaderWins = record.wins;
  }
  if (day >= 5 && leaderWins >= 4) {
    const aIsContender = leaderWins - aRecord.wins <= 1;
    const bIsContender = leaderWins - bRecord.wins <= 1;
    if (aIsContender && bIsContender) {
      return {
        label: "yusho_decider",
        score: 85,
        reason: "lower_division_yusho_contender_matchup",
      };
    }
  }

  // Archetype clash: opposing archetype families face off
  const aArchetype = a.combatProfile?.archetype;
  const bArchetype = b.combatProfile?.archetype;
  if (aArchetype && bArchetype) {
    const isPushVsBelt =
      (aArchetype === "tsuppari" && bArchetype === "yotsu") ||
      (aArchetype === "yotsu" && bArchetype === "tsuppari") ||
      (aArchetype === "oshi" && bArchetype === "yotsu") ||
      (aArchetype === "yotsu" && bArchetype === "oshi");
    if (isPushVsBelt) {
      return {
        label: "archetype_clash",
        score: 60,
        reason: `archetype_clash_${aArchetype}_vs_${bArchetype}`,
      };
    }
  }

  // Rookie vs veteran: young debutant vs established veteran
  const aIsRookie = a.careerWins + a.careerLosses < 5;
  const bIsRookie = b.careerWins + b.careerLosses < 5;
  const aIsVeteran = a.careerWins + a.careerLosses > 100;
  const bIsVeteran = b.careerWins + b.careerLosses > 100;
  if ((aIsRookie && bIsVeteran) || (bIsRookie && aIsVeteran)) {
    return {
      label: "rookie_vs_veteran",
      score: 55,
      reason: "rookie_vs_veteran_lower",
    };
  }

  // Winless warrior: rikishi still winless on day 4+
  if (day >= 4 && (aRecord.wins === 0 || bRecord.wins === 0)) {
    return {
      label: "winless_warrior",
      score: 45,
      reason: "winless_streak_lower",
    };
  }

  // Streak breaker: one rikishi on a 3+ win streak (lower threshold for 7-bout)
  const aStreak = (a as Rikishi & { winStreak?: number }).winStreak ?? 0;
  const bStreak = (b as Rikishi & { winStreak?: number }).winStreak ?? 0;
  if (aStreak >= 3 || bStreak >= 3) {
    return {
      label: "streak_breaker",
      score: 50,
      reason: `win_streak_${Math.max(aStreak, bStreak)}_lower`,
    };
  }

  return null;
}

/**
 * Applies drama budget post-processing for lower division pairings.
 * Adds drama labels to pairing reasons for narrative context.
 */
function applyLowerDivisionDramaLabels(
  pairings: MatchPairing[],
  rikishiMap: Map<string, Rikishi>,
  day: number,
  standings: Map<string, { wins: number; losses: number }>
): MatchPairing[] {
  return pairings.map((p) => {
    if (p.reasons.some((r: string) => r.startsWith("drama_"))) return p;
    const east = rikishiMap.get(p.eastId);
    const west = rikishiMap.get(p.westId);
    if (!east || !west) return p;
    const drama = scoreLowerDivisionDrama(east, west, day, standings);
    if (drama && drama.score > 0) {
      return {
        ...p,
        reasons: [...p.reasons, `drama_${drama.label}`],
      };
    }
    return p;
  });
}

// ── Public: buildLowerDivisionSwiss ─────────────────────────────────────────────────

/**
 * Build Swiss torikumi for 7-bout divisions.
 * Implements a two-phase Swiss system:
 *   - Days 1-2: Rank-based matching
 *   - Days 3-7: Record-based Swiss matching
 *   - Day 7: Prioritize 3-3 kachi-koshi bouts
 *
 * @param basho - Current basho state
 * @param rikishi - Pool of rikishi to schedule
 * @param options - Configuration options
 * @returns Array of match pairings
 */
export function buildLowerDivisionSwiss(
  basho: BashoState,
  rikishi: Rikishi[],
  options: {
    seed: string;
    division?: Division;
    rules?: Partial<MatchmakingRules>;
  }
): MatchPairing[] {
  const pool: Rikishi[] = [];
  for (const r of rikishi) {
    if (r.isRetired || r.injured || r.isKyujo) continue;
    if (options.division && r.division !== options.division) continue;
    pool.push(r);
  }

  const facedSet = buildFacedSet(basho);
  const day = basho.day ?? 1;

  let raw: MatchPairing[];
  if (day <= 2) {
    raw = phase1(basho, pool, facedSet);
  } else {
    raw = phase2(basho, pool, facedSet, day);
  }

  // Apply drama labels for lower division narrative context (3.3)
  const rikishiMap = new Map(rikishi.map((r) => [r.id, r]));
  const withDrama = applyLowerDivisionDramaLabels(raw, rikishiMap, day, basho.standings);

  return withDrama;
}
