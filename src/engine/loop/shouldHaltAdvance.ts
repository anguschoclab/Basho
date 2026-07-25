import type { WorldState } from "../types/world";

/**
 * True when a multi-day fast-advance loop must stop and hand control back to
 * the player because a blocking decision is pending. Mirrors the gate pattern
 * in src/engine/holiday.ts (evaluateGates -> break).
 *
 * Why check `pendingDecisions` when `evaluatePendingDecisions` already promotes
 * the first blocking decision to `pendingCrisis`? Because promotion only fires
 * when `!world.pendingCrisis` — once a crisis is set, subsequent required
 * decisions accumulate in `pendingDecisions` without being promoted. This
 * check ensures those accumulated decisions also halt the loop.
 */
export function shouldHaltAdvance(world: WorldState): boolean {
  if (world.pendingCrisis) return true;
  const decisions = world.pendingDecisions ?? [];
  return decisions.some((d) => d.required);
}
