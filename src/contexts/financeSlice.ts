import type { GameState, GameAction } from "./gameTypes";
import { InfrastructureService } from "@/engine/systems/economy/InfrastructureService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";

export function financeSlice(state: GameState, action: GameAction): GameState {
  if (!state.world) return state;

  switch (action.type) {
    case "BUILD_INFRASTRUCTURE": {
      const impact = InfrastructureService.startConstruction(
        state.world,
        action.heyaId,
        action.facilityId
      );
      return { ...state, world: resolveImpacts(state.world, [impact]) };
    }

    default:
      return state;
  }
}
