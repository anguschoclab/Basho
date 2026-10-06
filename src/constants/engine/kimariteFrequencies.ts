/**
 * kimariteFrequencies.ts
 * ======================
 * Aggregation layer over the leaf targets table (kimariteTargets.ts).
 * Re-exports the atomic table and rarity helpers, and adds the per-category
 * rollup derived from the registry.
 *
 * Kept as the canonical import site so existing consumers do not change.
 */

import { KIMARITE_REGISTRY } from "../../engine/kimariteRegistry";
import { KIMARITE_FREQUENCY_TARGETS } from "./kimariteTargets";

export {
  KIMARITE_FREQUENCY_TARGETS,
  rarityFromShare,
  getKimariteTargetShare,
} from "./kimariteTargets";
export type { KimariteRarity } from "./kimariteTargets";

/**
 * Aggregate share per JSA category — derived from the per-technique table
 * and the registry so the rollup can never drift from the atomic values.
 */
export const KIMARITE_CATEGORY_TARGETS: Record<string, number> = (() => {
  const totals: Record<string, number> = {};
  for (const k of KIMARITE_REGISTRY) {
    totals[k.jsaCategory] = (totals[k.jsaCategory] ?? 0) + (KIMARITE_FREQUENCY_TARGETS[k.id] ?? 0);
  }
  return totals;
})();
