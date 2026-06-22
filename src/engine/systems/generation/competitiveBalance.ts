import type { WorldState } from "../../types/world";
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
 * get < 1 (handicapped); weaker-than-average get > 1 (boosted). Sports-style
 * competitive-balance lever that decouples talent acquisition from raw wealth.
 * Deterministic — pure function of current rosters.
 *
 * NOTE: A `heyaId` not present in `world.heyas` is treated as zero-sekitori
 * (maximally boosted). Callers must pass a real heya id for meaningful results.
 */
export function recruitmentBalanceMultiplier(world: WorldState, heyaId: string): number {
  const heyaIds = Array.from(world.heyas.keys());
  if (heyaIds.length === 0) return 1;

  // Single pass: compute each stable's sekitori count, capture own count en route.
  const counts = new Map<string, number>();
  let total = 0;
  for (const id of heyaIds) {
    const c = sekitoriCount(world, id);
    counts.set(id, c);
    total += c;
  }
  const mean = total / heyaIds.length;
  const own = counts.get(heyaId) ?? 0;
  const raw = 1 - (own - mean) * BALANCE_STRENGTH_SENSITIVITY;
  return Math.max(BALANCE_MULTIPLIER_MIN, Math.min(BALANCE_MULTIPLIER_MAX, raw));
}
