/**
 * YokozunaService.ts
 * ==================
 * Manages the high-stakes politics of Yokozuna promotion and the YDC.
 * (Phase Q: Promotion Politics)
 */

import { WorldState } from "../../types/world";
import type { Rikishi } from "../../types/rikishi";
import type { BashoPerformance } from "../../types/banzuke";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { StateImpact } from "../../core/StateImpact";

export interface YDCCandidate {
  rikishiId: string;
  name: string;
  performances: BashoPerformance[];
  sentiment: number; // 0..100
  recommendation: "promote" | "watch" | "reject";
  reasons: string[];
}

export const YokozunaService = {
  /**
   * Evaluates an Ozeki for potential Yokozuna promotion.
   * Standard requirement: 2 consecutive Yusho.
   * "Equivalent" requirement: 1 Yusho + 1 Jun-Yusho + High Dignity (Media/Reputation).
   */
  evaluateCandidate(world: WorldState, rikishi: Rikishi): YDCCandidate | null {
    if (rikishi.rank !== "yokozuna" && rikishi.rank !== "ozeki") {
      // Only Ozeki can be candidates, but let's check recent history
    }
    if (rikishi.rank !== "ozeki") return null;

    const history = world.history.slice(-2); // Last 2 basho
    if (history.length < 2) return null;

    // In a real implementation, we'd look at specifically this rikishi's performance record
    // For now, we simulate the 'equivalent' check
    const winsLast = rikishi.currentBashoWins;
    const isYushoLast = rikishi.currentBashoWins >= 14; // Simplified check

    // We'll need a way to look back further, but for this Phase P logic:
    const reputation = rikishi.economics?.popularity || 50;

    let sentiment = 0;
    const reasons: string[] = [];

    // Base sentiment on wins
    sentiment += (winsLast - 8) * 5;

    if (isYushoLast) {
      sentiment += 40;
      reasons.push("Recent Tournament Champion");
    }

    // Add Political/Dignity factors
    sentiment += reputation / 4;
    if (reputation > 80) reasons.push("High Public Dignity (Hinkaku)");

    let recommendation: "promote" | "watch" | "reject" = "reject";
    if (sentiment >= 85) recommendation = "promote";
    else if (sentiment >= 65) recommendation = "watch";

    return {
      rikishiId: rikishi.id,
      name: rikishi.shikona,
      performances: [], // Should be populated from historical banzuke records
      sentiment,
      recommendation,
      reasons,
    };
  },

  /**
   * Process the YDC Meeting during the post-basho transition.
   */
  processYDCCouncil(world: WorldState): StateImpact {
    const builder = createImpactBuilder("processYDCCouncil");

    // Find Ozeki candidates
    for (const rikishiId of world.activeRikishiIds) {
      const rikishi = world.rikishi.get(rikishiId);
      if (!rikishi || rikishi.rank !== "ozeki") continue;
      const evaluation = this.evaluateCandidate(world, rikishi);
      if (evaluation && evaluation.recommendation !== "reject") {
        builder.logEvent(
          "YOKOZUNA_DELIBERATION",
          "governance",
          {
            rikishiId: rikishi.id,
            status: evaluation.recommendation,
            incident:
              evaluation.recommendation === "promote"
                ? `The YDC recommends ${rikishi.shikona} for promotion to Yokozuna.`
                : `The YDC is monitoring ${rikishi.shikona} for potential promotion.`,
            score: Math.floor(evaluation.sentiment),
          },
          { heyaId: rikishi.heyaId, importance: "high" }
        );

        if (evaluation.recommendation === "promote") {
          // High-stakes promotion trigger
          // Note: Banzuke update will handle the actual rank flip next cycle
          builder.addMetadata("yokozuna_recommendation", rikishi.id);
        }
      }
    }

    return builder.build();
  },
};
