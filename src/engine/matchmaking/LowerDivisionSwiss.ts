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
import { scorePairing, type MatchPairing } from "./MatchmakingPhases";

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
    bucketMap.get(wins)!.push(r);
  }

  const bucketKeys = [...bucketMap.keys()].sort((a, b) => b - a);

  // Day 7: Prioritize 3-3 kachi-koshi bouts
  if (day === 7) {
    const threeThreeBucket = bucketMap.get(3);
    if (threeThreeBucket) {
      const threeThreePool = threeThreeBucket
        .filter((r: Rikishi) => !paired.has(r.id))
        .sort((a: Rikishi, b: Rikishi) => banzukeOrdinal(a) - banzukeOrdinal(b));

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
    const bucket = (bucketMap.get(wins) ?? [])
      .filter((r) => !paired.has(r.id))
      .sort((a, b) => banzukeOrdinal(a) - banzukeOrdinal(b));

    let extraFromBelow: Rikishi | undefined;
    if (bucket.length % 2 !== 0) {
      const lowerWins = bucketKeys[i + 1];
      if (lowerWins !== undefined) {
        const lowerBucket = (bucketMap.get(lowerWins) ?? [])
          .filter((r) => !paired.has(r.id) && !pulledUp.has(r.id))
          .sort((a, b) => banzukeOrdinal(a) - banzukeOrdinal(b));
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

  const unpaired = pool.filter((r) => !paired.has(r.id));
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
    rules?: any;
  }
): MatchPairing[] {
  const pool = rikishi.filter((r) => {
    if (r.isRetired || r.injured || r.isKyujo) return false;
    if (options.division && r.division !== options.division) return false;
    return true;
  });

  const facedSet = buildFacedSet(basho);
  const day = basho.day ?? 1;

  let raw: MatchPairing[];
  if (day <= 2) {
    raw = phase1(basho, pool, facedSet);
  } else {
    raw = phase2(basho, pool, facedSet, day);
  }

  return raw;
}
