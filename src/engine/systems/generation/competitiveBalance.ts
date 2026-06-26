import type { WorldState } from "../../types/world";
import type { Id } from "../../types/common";
import { getStableRikishi } from "../../queries";
import {
  BALANCE_STRENGTH_SENSITIVITY,
  BALANCE_MULTIPLIER_MIN,
  BALANCE_MULTIPLIER_MAX,
} from "../../../constants/engine/recruitmentBalance";

/** Sekitori (top-two-division) count is the stable-strength proxy. */
function sekitoriCount(world: WorldState, heyaId: string): number {
  let n = 0;
  for (const r of getStableRikishi(world, heyaId)) {
    if (r.division === "makuuchi" || r.division === "juryo") n++;
  }
  return n;
}

/**
 * Multiplier applied to a stable's recruitment bid. Stronger-than-average stables
 * get < 1 (handicapped); weaker-than-average get > 1 (boosted). This is a sports-style
 * competitive-balance lever: it decouples talent acquisition from raw wealth so hungry
 * mid/low stables can out-bid entrenched dynasties for top recruits. Deterministic —
 * pure function of current rosters.
 */
export function recruitmentBalanceMultiplier(world: WorldState, heyaId: string): number {
  return recruitmentBalanceMultipliers(world, [heyaId]).get(heyaId) ?? 1;
}

/**
 * Batch version of recruitmentBalanceMultiplier. Computes sekitori counts for ALL
 * heyas once (the mean is over the whole league), then returns multipliers only
 * for the requested subset. Avoids redundant O(H×R) scans when called in a loop.
 */
export function recruitmentBalanceMultipliers(
  world: WorldState,
  heyaIds: Id[]
): Map<Id, number> {
  const result = new Map<Id, number>();
  if (heyaIds.length === 0) return result;

  const allHeyaIds = Array.from(world.heyas.keys());
  if (allHeyaIds.length === 0) {
    for (const id of heyaIds) result.set(id, 1);
    return result;
  }

  let total = 0;
  const allCounts = new Map<Id, number>();
  for (const id of allHeyaIds) {
    const c = sekitoriCount(world, id);
    allCounts.set(id, c);
    total += c;
  }
  const mean = total / allHeyaIds.length;

  for (const id of heyaIds) {
    const own = allCounts.get(id) ?? sekitoriCount(world, id);
    const raw = 1 - (own - mean) * BALANCE_STRENGTH_SENSITIVITY;
    result.set(id, Math.max(BALANCE_MULTIPLIER_MIN, Math.min(BALANCE_MULTIPLIER_MAX, raw)));
  }
  return result;
}
