/**
 * GovernanceService.ts
 * =====================
 * Handles governance rulings and crisis resolution.
 */

import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { StateImpact } from "@/engine/core/StateImpact";
import type { WorldState } from "@/engine/types/world";

import { CrisisService } from "@/engine/narrative/CrisisService";
import { storedCrisisOptionEffect } from "@/engine/bard/dramaGenerator";
import { getHeya } from "@/engine/core/queries";

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
      // Execute the specific impact generator for this choice. Stored
      // (serialized / state-written) crises carry no generator — resolve
      // through the stored-crisis effect table like resolveNPCCrisis does,
      // or the player's choice is a silent no-op (V18-S7-2).
      const effect =
        option.impactGenerator ?? storedCrisisOptionEffect(crisis, choiceId);
      const impact = effect?.(world, playerHeyaId);
      if (impact) builder.merge(impact);

      // Clear the pending crisis from the world state. This must be part
      // of the returned impact — returning the option's impact directly
      // would drop the clear and leave the halt/modal active forever.
      builder.updateWorldField("pendingCrisis", undefined);
      // Also clear any residue on the NPC surface — a stuck activeCrisis
      // blocks every future crisis for this heya.
      builder.updateHeya(playerHeyaId, { activeCrisis: undefined });

      return builder.build();
    }
  }

  // Fallback/Legacy logic (if needed for old save files)
  const heya = getHeya(world, playerHeyaId);
  if (!heya) return builder.build();

  if (choiceId === "harsh") {
    // ... legacy logic ...
    const ws = heya.welfareState;
    builder.updateHeya(playerHeyaId, {
      reputation: Math.max(0, (heya.reputation ?? 50) - 15),
      // Only rewrite welfareState when one exists — spreading undefined
      // fabricated a sparse record that dropped live keys (morale, etc.).
      ...(ws
        ? {
            welfareState: {
              ...ws,
              complianceState: "compliant" as const,
              welfareRisk: Math.max(0, (ws.welfareRisk ?? 0) - 30),
            },
          }
        : {}),
    });
  }

  return builder.build();
}
