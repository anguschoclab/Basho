/**
 * archetypeDrift.ts
 * =================
 * Monthly archetype drift evaluation for rikishi.
 * Extracted from phase05_monthly_boundary.ts for modularity.
 */

import type { WorldState } from "../../../../types/world";
import type { Rikishi } from "../../../../types/rikishi";
import type { ImpactBuilder } from "../../../../core/ImpactBuilder";

export function processArchetypeDrift(
  _world: WorldState,
  nextR: Rikishi,
  id: string,
  builder: ImpactBuilder
): boolean {
  const evidence = nextR.archetypeEvidence;
  if (evidence && !Array.isArray(evidence)) {
    let newArchetype = nextR.tacticalArchetypePrimary;
    if (evidence.push.success >= 5 && evidence.push.success > evidence.grapple.success)
      newArchetype = "oshi";
    else if (evidence.grapple.success >= 5 && evidence.grapple.success > evidence.push.success)
      newArchetype = "yotsu";

    if (newArchetype !== nextR.tacticalArchetypePrimary) {
      builder.logEvent(
        "TRAINING_UPDATE",
        "training",
        {
          rikishiId: id,
          shikona: nextR.shikona,
          from: nextR.tacticalArchetypePrimary,
          to: newArchetype,
          reason: "monthly_archetype_evaluation",
        },
        { rikishiId: id, importance: "notable" }
      );
      nextR.tacticalArchetypePrimary = newArchetype;
    }
    nextR.archetypeEvidence = {
      push: { success: 0, fail: 0 },
      grapple: { success: 0, fail: 0 },
      evade: { success: 0, fail: 0 },
    };
    return true;
  }
  return false;
}
