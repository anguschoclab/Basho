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
import { processRetireeOyakataConversion } from "@/engine/lifecycle/retireeOyakataConversion";

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
            careerWins: rikishi.careerWins ?? 0,
            careerLosses: rikishi.careerLosses ?? 0,
            careerBouts: (rikishi.careerWins ?? 0) + (rikishi.careerLosses ?? 0),
            bashoCount: rikishi.careerHistory?.length ?? 0,
            division: rikishi.division ?? "makushita",
            age: world.year - rikishi.birthYear,
            retirementReason: reason,
            yushoCount: (rikishi.careerHistory ?? []).filter((h) => h.isYusho).length,
            kinboshiCount: rikishi.economics?.kinboshiCount ?? 0,
            yearsActive: world.year - rikishi.birthYear - 15,
            careerPhase: rikishi.declinePhase ?? "twilight",
            origin: rikishi.origin ?? "Japan",
          },
          {
            heyaId: rikishi.heyaId,
            importance: rikishi.division === "makuuchi" ? "major" : "notable",
          }
        );

        // Constitution 2.3 & 61: Oyakata conversion + (RNG-gated) stable founding.
        // Shared helper — mirrors the governanceReview retirement path so AutoSim also
        // produces new stables when accomplished wrestlers retire.
        processRetireeOyakataConversion(world, rikishi, builder);

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
