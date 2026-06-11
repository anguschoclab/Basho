/**
 * CareerService.ts
 * ===============
 * Manages the life cycle of a rikishi's career, including retirement and legacy induction.
 * (Phase Q: Promotion Politics & Ceremony)
 */

import { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { StateImpact } from "@/engine/core/StateImpact";
import { LegacyService } from "@/engine/systems/legacy/LegacyService";
import { checkRetirement } from "@/engine/lifecycle";
import { getRikishi } from "@/engine/queries";

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

    for (const rikishiId of world.activeRikishiIds) {
      const rikishi = getRikishi(world, rikishiId);
      if (!rikishi) continue;
      const reason = checkRetirement(rikishi, world.year, world.seed);
      if (reason) {
        builder.retireRikishi(rikishi.id, world.year, reason);

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
