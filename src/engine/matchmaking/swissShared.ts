/**
 * swissShared.ts — infrastructure shared by SwissAlgorithm (15-day sekitori
 * Swiss) and LowerDivisionSwiss (7-bout lower divisions): pair identity,
 * faced-set construction, and the guarded tryPair wrapper.
 */

import { clamp } from "@/engine/utils/index";
import type { BashoState } from "@/engine/types/basho";
import type { Rikishi } from "@/engine/types/rikishi";
import type { RivalriesState } from "@/constants/engine/rivalry";
import { getRivalryBoutModifiers } from "@/engine/narrative/RivalryHeatService";
import { scorePairing, type MatchPairing } from "@/engine/matchmaking/MatchmakingPhases";
import {
  RIVALRY_TENSION_THRESHOLD,
  RIVALRY_HEAT_BONUS,
  SCORE_CLAMP_MIN,
  SCORE_CLAMP_MAX,
} from "@/constants/engine/matchmaking";

/**
 * Creates a consistent key for a pair of rikishi IDs (smaller ID first) so
 * the same matchup keys identically regardless of side.
 */
export function pairKey(aId: string, bId: string): string {
  return aId < bId ? `${aId}-${bId}` : `${bId}-${aId}`;
}

/**
 * Builds the set of all pairs that have already faced each other in the
 * basho, used to enforce the no-rematch rule.
 */
export function buildFacedSet(basho: BashoState): Set<string> {
  const set = new Set<string>();
  for (const m of basho.matches) {
    set.add(pairKey(m.eastRikishiId, m.westRikishiId));
  }
  return set;
}

/** Optional extras for tryPair — see the rivalry note below. */
export interface TryPairOptions {
  /** Rivalry state for heat modifiers — sekitori callers only. */
  rivalriesState?: RivalriesState;
  /** Basho day override forwarded to scorePairing. */
  day?: number;
}

/**
 * Attempts to create a valid pairing between two rikishi.
 * Returns null on hard-rule violations (already paired, scorer rejection).
 *
 * DESIGN CHOICE (documented, do not change silently): makuuchi and the
 * juryo-crossover path pass `rivalriesState`; makushita/sandanme/jonidan/
 * jonokuchi scheduling deliberately passes none — heat bonuses are a
 * sekitori-only mechanic even though lower-division bouts still accumulate
 * heat for post-promotion continuity.
 */
export function tryPair(
  basho: BashoState,
  a: Rikishi,
  b: Rikishi,
  facedSet: Set<string>,
  pairedIds: Set<string>,
  opts?: TryPairOptions
): MatchPairing | null {
  if (pairedIds.has(a.id) || pairedIds.has(b.id)) return null;
  const p = scorePairing({ basho, a, b, day: opts?.day, facedPairs: facedSet });
  if (!p) return null;
  if (opts?.rivalriesState) {
    const mod = getRivalryBoutModifiers({ state: opts.rivalriesState, aId: a.id, bId: b.id });
    if (mod.tension >= RIVALRY_TENSION_THRESHOLD) {
      return {
        ...p,
        score: clamp(p.score + RIVALRY_HEAT_BONUS, SCORE_CLAMP_MIN, SCORE_CLAMP_MAX),
        reasons: [...p.reasons, "rivalry_heat"],
      };
    }
  }
  return p;
}
