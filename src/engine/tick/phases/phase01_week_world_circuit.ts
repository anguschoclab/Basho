import type { WorldState } from "../../types/world";
import type { DailyTickReport } from "../tickDaily";
import { WorldCircuitService } from "../../systems/global/WorldCircuitService";
import { applyImpact } from "../../core/ImpactResolver";

/**
 * Phase: World Circuit Processing (Weekly)
 * 1. Process style drift for all heyas.
 * 2. Generate invitations if it's the right week (e.g., every 8 weeks).
 */
export function phase01_week_world_circuit(world: WorldState, report: DailyTickReport): WorldState {
  let nextWorld = world;
  report.subsystemsRun.push("world_circuit");

  // 1. Apply Style Drift for all heyas (if enabled)
  if (world.settings?.enableStyleDrift) {
    for (const heyaId of world.heyas.keys()) {
      const driftImpact = WorldCircuitService.applyStyleDrift(nextWorld, heyaId);
      nextWorld = applyImpact(nextWorld, driftImpact);
    }
  }

  // 2. Yearly Invitations (REMOVED: Now handled by phase06_yearly_boundary for all stables)

  return nextWorld;
}
