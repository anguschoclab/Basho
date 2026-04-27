// @ts-nocheck
/**
 * CareerService.ts
 * ===============
 * Manages the life cycle of a rikishi's career, including retirement and legacy induction.
 * (Phase Q: Promotion Politics & Ceremony)
 */

import { WorldState } from "../../types/world";
import type { Rikishi } from "../../types/rikishi";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { StateImpact } from "../../core/StateImpact";
import { LegacyService } from "../legacy/LegacyService";
import { checkRetirement } from "../../lifecycle";

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
   * Processes retirements across the entire world.
   */
  processRetirements(world: WorldState): StateImpact {
    const builder = createImpactBuilder("processRetirements");

    for (const rikishi of world.rikishi.values()) {
      if (this.evaluateRetirement(world, rikishi)) {
        builder.updateRikishi(rikishi.id, { isRetired: true });

        builder.logEvent(
          "RETIREMENT_ANNOUNCED",
          "narrative",
          {
            rikishiId: rikishi.id,
            incident: `${rikishi.shikona} has announced their retirement (intai).`,
            rankAtRetirement: rikishi.rank,
          },
          {
            heyaId: rikishi.heyaId,
            importance: rikishi.division === "makuuchi" ? "major" : "notable",
          }
        );

        // Register legacy bloodline if applicable (Phase 5: Legacy Engine)
        builder.merge(LegacyService.registerLegacyTrait(world, rikishi));

        // Disburse retirement payout (if implemented)
        const payout = rikishi.economics?.retirementFund || 0;
        if (payout > 0) {
          // builder.updateRikishi(...) etc
        }
      }
    }

    return builder.build();
  },
};