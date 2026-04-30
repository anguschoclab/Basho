import type { GameState, GameAction } from "./gameTypes";
import { investInFacility } from "@/engine/facilities";
import { hireStaff } from "@/engine/staff";
import { InfrastructureService } from "@/engine/systems/economy/InfrastructureService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";

/**
 * Handle finance-related global actions.
 */
export function financeSlice(state: GameState, action: GameAction): GameState {
  if (!state.world) return state;

  switch (action.type) {
    case "UPGRADE_HEYA": {
      const impact = investInFacility(state.world, action.heyaId, action.axis, action.points || 5);
      const updatedWorld = resolveImpacts(state.world, [impact]);
      return {
        ...state,
        world: updatedWorld,
      };
    }

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

    case "RECRUIT_STAFF": {
      const impact = hireStaff(state.world, action.heyaId, action.role);
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
