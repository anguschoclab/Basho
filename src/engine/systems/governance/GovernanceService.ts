/**
 * GovernanceService.ts
 * =====================
 * Handles governance rulings and crisis resolution.
 */

import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import type { WorldState } from "../../types/world";

import { CrisisService } from "../narrative/CrisisService";

export function resolveCrisis(world: WorldState, crisisId: string, choiceId: string): StateImpact {
  const builder = createImpactBuilder("resolveCrisis");
  const playerHeyaId = world.playerHeyaId;
  if (!playerHeyaId) return builder.build();

  // 1. Look up the crisis in the registry or world state
  const registry = CrisisService.getRegistry();
  const crisis = registry.find((c) => c.id === crisisId) || world.pendingCrisis;

  if (crisis && crisis.id === crisisId) {
    const option = crisis.options.find((o) => o.id === choiceId);
    if (option) {
      // Execute the specific impact generator for this choice
      const impact = option.impactGenerator(world);

      // Clear the pending crisis from the world state
      builder.updateWorldField("pendingCrisis", undefined);

      return impact;
    }
  }

  // Fallback/Legacy logic (if needed for old save files)
  const heya = world.heyas.get(playerHeyaId);
  if (!heya) return builder.build();

  if (choiceId === "harsh") {
    // ... legacy logic ...
    builder.updateHeya(playerHeyaId, {
      reputation: Math.max(0, (heya.reputation ?? 50) - 15),
      welfareState: {
        ...heya.welfareState!,
        complianceState: "compliant",
        welfareRisk: Math.max(0, (heya.welfareState?.welfareRisk ?? 0) - 30),
      },
    });
  }

  return builder.build();
}
