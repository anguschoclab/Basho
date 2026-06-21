import type { GameState, GameAction } from "./gameTypes";
import { InfrastructureService } from "@/engine/systems/economy/InfrastructureService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";

/**
 * Handle finance-related global actions.
 */
export function financeSlice(state: GameState, action: GameAction): GameState {
  if (!state.world) return state;

  switch (action.type) {
    case "BUILD_INFRASTRUCTURE": {
      const impact = InfrastructureService.startConstruction(
        state.world,
        action.heyaId,
        action.facilityId
      );
      const updatedWorld = resolveImpacts(state.world, [impact]);
      return {
        ...state,
        world: updatedWorld,
      };
    }

    default:
      return state;
  }
}
