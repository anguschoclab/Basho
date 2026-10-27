/**
 * CareerService.ts
 * ===============
 * Manages the life cycle of a rikishi's career, including retirement and legacy induction.
 * (Phase Q: Promotion Politics & Ceremony)
 *
 * The retirement processing itself was unified into ./processRetirements.ts —
 * this service now delegates to it. Kept for import compatibility.
 */

import { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import { StateImpact } from "@/engine/core/StateImpact";
import { checkRetirement } from "@/engine/lifecycle/retirementCheck";
import { processAllRetirements } from "@/engine/lifecycle/processRetirements";

export const CareerService = {
  /**
   * Evaluates if a rikishi should retire.
   * Delegates to the single retirement authority — lifecycle.ts:checkRetirement
   * (age 45, yokozuna age 40, council pressure, injury, performance)
   */
  evaluateRetirement(world: WorldState, rikishi: Rikishi): boolean {
    if (rikishi.isRetired) return false;
    // Delegate to the single retirement authority — lifecycle.ts:checkRetirement
    // (age 45, yokozuna age 40, council pressure, injury, performance)
    return !!checkRetirement(rikishi, world.year, world.seed);
  },

  /**
   * @deprecated Use processAllRetirements from ./processRetirements directly —
   * the unified processor every retirement path delegates to. Kept as a thin
   * delegate for compatibility with existing callers and tests.
   */
  processRetirements(world: WorldState): StateImpact {
    return processAllRetirements(world).impact;
  },
};
