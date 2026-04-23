/**
 * GovernanceService.ts
 * =====================
 * Handles governance rulings and crisis resolution.
 */

import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import type { WorldState } from "../../types/world";

export function resolveCrisis(
  world: WorldState,
  crisisId: string,
  choice: "harsh" | "cover_up"
): StateImpact {
  const builder = createImpactBuilder("resolveCrisis");
  const playerHeyaId = world.playerHeyaId;
  if (!playerHeyaId) return builder.build();

  const heya = world.heyas.get(playerHeyaId);
  if (!heya) return builder.build();

  if (choice === "harsh") {
    // Reputation Down, Compliance Up
    builder.updateHeya(playerHeyaId, {
      reputation: Math.max(0, (heya.reputation ?? 50) - 15),
      welfareState: {
        ...heya.welfareState!,
        complianceState: "compliant",
        welfareRisk: Math.max(0, (heya.welfareState?.welfareRisk ?? 0) - 30),
      },
    });

    builder.logEvent(
      "GOVERNANCE_RULING",
      "discipline",
      {
        incident: "crisis_resolved_harsh",
        choice: "harsh_action",
        status: "resolved",
      },
      { heyaId: playerHeyaId, importance: "major" }
    );
  } else if (choice === "cover_up") {
    // Reputation Neutral, Compliance Down, Risk Up
    builder.updateHeya(playerHeyaId, {
      welfareState: {
        ...heya.welfareState!,
        complianceState: "investigation",
        welfareRisk: Math.min(100, (heya.welfareState?.welfareRisk ?? 0) + 20),
      },
    });

    builder.logEvent(
      "GOVERNANCE_RULING",
      "discipline",
      {
        incident: "crisis_resolved_coverup",
        choice: "cover_up",
        status: "hidden",
      },
      { heyaId: playerHeyaId, importance: "major" }
    );
  }

  return builder.build();
}
