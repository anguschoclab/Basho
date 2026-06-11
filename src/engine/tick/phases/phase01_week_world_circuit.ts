import type { WorldState } from "../../types/world";
import type { StateImpact } from "../../core/StateImpact";
import { WorldCircuitService } from "../../systems/worldCircuit/WorldCircuitService";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { mergeImpacts } from "../../core/ImpactResolver";

/**
 * Phase: World Circuit Processing (Weekly)
 * 1. Process style drift for all heyas (when enableStyleDrift is on).
 */
export function phase01_week_world_circuit(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase01_week_world_circuit");

  // Apply Style Drift for all heyas (if enabled)
  if (!world.settings?.enableStyleDrift) return builder.build();

  const impacts: StateImpact[] = [builder.build()];
  for (const heyaId of world.heyas.keys()) {
    impacts.push(WorldCircuitService.applyStyleDrift(world, heyaId));
  }

  return mergeImpacts(impacts);
}
