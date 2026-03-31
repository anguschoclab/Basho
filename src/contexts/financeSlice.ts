import { cloneWorldForTick } from "@/engine/tick/tickOrchestrator";
import type { GameState, GameAction } from "./gameTypes";
import { investInFacility } from "@/engine/facilities";
import { hireStaff } from "@/engine/staff";

/**
 * Handle finance-related global actions.
 */
export function financeSlice(state: GameState, action: GameAction): GameState {
  if (!state.world) return state;

  switch (action.type) {
    case "UPGRADE_HEYA": {
      const world = cloneWorldForTick(state.world);
      const result = investInFacility(world, action.heyaId, action.axis, action.points || 5);
      
      if (result.success) {
        return {
          ...state,
          world,
        };
      }
      return state;
    }

    case "RECRUIT_STAFF": {
      const world = cloneWorldForTick(state.world);
      const result = hireStaff(world, action.heyaId, action.role);
      
      if (result) {
        return {
          ...state,
          world,
        };
      }
      return state;
    }

    default:
      return state;
  }
}
