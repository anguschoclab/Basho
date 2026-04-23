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

export const CareerService = {
  /**
   * Evaluates if a rikishi should retire.
   * NPCs retire automatically based on rank drops or age.
   * Player rikishi can be retired manually, or if they fall below a certain viability.
   */
  evaluateRetirement(world: WorldState, rikishi: Rikishi): boolean {
    if (rikishi.isRetired) return false;

    const age = rikishi.age || 18;
    const rank = rikishi.rank;
    const performance = (rikishi.currentBashoWins ?? 0) - (rikishi.currentBashoLosses ?? 0);

    // Hard retirement for old NPCs
    if (age >= 38) return true;

    // Rank-based retirement: dropping from Juryo to Makushita after age 30
    if (age >= 30 && rank === "jonokuchi" && performance < -5) return true;

    // Sekitori who fall into the pits of lower divisions
    if (age >= 33 && (rank === "makushita" || rank === "sandanme") && performance < -3) return true;

    return false;
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