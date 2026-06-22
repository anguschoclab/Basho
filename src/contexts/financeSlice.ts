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
<<<<<<< HEAD
      return { ...state, world: resolveImpacts(state.world, [impact]) };
=======
      const updatedWorld = resolveImpacts(state.world, [impact]);
      return {
        ...state,
        world: updatedWorld,
      };
>>>>>>> 2c4f2f20565b4e02797f4d84848b9b0a10c899ae
    }

    default:
      return state;
  }
}
