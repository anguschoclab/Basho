/**
 * GlobalCupService.ts
 * ==================
 * Orchestrates the "Worlds Exhibition" off-season tournament.
 * (Phase 3: Global Circuit & Rivalry Dynamics)
 */

import { WorldState } from "../../types/world";
import { Rikishi } from "../../types/rikishi";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { StateImpact } from "../../core/StateImpact";
import { generateFullRikishi } from "../generation/CandidateBuilder";
import { RNGRegistry } from "../../core/RNGRegistry";
import { injectRikishiAsCandidate } from "../generation/TalentPoolService";

export const GlobalCupService = {
  /**
   * Identifies participants for the Global Cup invitational.
   * Selection: Top 6 JSA Rikishi (by Rank) + 2 International Challengers.
   */
  selectParticipants(world: WorldState): Rikishi[] {
    const pool = Array.from(world.rikishi.values())
      .filter((r) => !r.isRetired && !r.injured)
      .sort((a, b) => {
        // Sort by rank priority (Yokozuna > Ozeki > Sekiwake)
        const rankVal = (r: Rikishi) =>
          r.rank === "yokozuna"
            ? 100
            : r.rank === "ozeki"
              ? 80
              : r.rank === "sekiwake"
                ? 60
                : r.rank === "komusubi"
                  ? 40
                  : r.rankNumber
                    ? 20 - r.rankNumber / 10
                    : 0;
        return rankVal(b) - rankVal(a);
      });

    const jsaElites = pool.slice(0, 6);

    // Generate 2 "International Challengers" for the event
    const rng = RNGRegistry.getSystemRNG(world, "global_cup", `challengers_${world.year}`);
    const challenger1 = generateFullRikishi({
      id: `challenger_${world.year}_1`,
      rng,
      currentYear: world.year,
      rank: "ozeki",
      division: "makuuchi",
      side: "west",
      rankNumber: 1,
    });
    challenger1.shikona = "Giant of the Steppe";
    challenger1.nationality = "Mongolia";

    const challenger2 = generateFullRikishi({
      id: `challenger_${world.year}_2`,
      rng,
      currentYear: world.year,
      rank: "ozeki",
      division: "makuuchi",
      side: "west",
      rankNumber: 2,
    });
    challenger2.shikona = "Estonian Colossus";
    challenger2.nationality = "Estonia";

    return [...jsaElites, challenger1, challenger2];
  },

  /**
   * Simulates the Global Cup results and logs the outcome.
   */
  processGlobalCup(world: WorldState): StateImpact {
    const builder = createImpactBuilder("processGlobalCup");
    const participants = this.selectParticipants(world);

    if (participants.length < 4) return builder.build();

    // Standard single-elimination logic (simulated for now)
    const winner = participants[0]; // The top seed wins simulation for this phase

    builder.logEvent(
      "GLOBAL_CUP_FINALE",
      "narrative",
      {
        winnerId: winner.id,
        winnerName: winner.shikona,
        incident: `The Worlds Exhibition has concluded. ${winner.shikona} has been crowned the Global Champion of ${world.year}.`,
        finalists: participants.map((p) => p.shikona).slice(0, 4),
      },
      { importance: "headline" }
    );

    // Reputation boost for the winning heya
    if (winner.heyaId) {
      builder.updateHeya(winner.heyaId, {
        reputation: 100, // Max reputation hit for winning the world cup
        politicalCapital: 10, // Bonus capital
      });
    }

    // Inject international challengers into talent pool for future discovery (Phase 3 Polish)
    for (const p of participants) {
      if (p.id.startsWith("challenger_")) {
        builder.merge(injectRikishiAsCandidate(world, p));
      }
    }

    return builder.build();
  },
};
