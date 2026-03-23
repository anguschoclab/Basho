import type { GameState, GameAction } from "./gameTypes";

export function heyaSlice(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "SELECT_HEYA":
      return { ...state, selectedHeyaId: action.id, phase: action.id ? "stable" : state.phase };
    
    case "SET_PLAYER_HEYA": {
      if (!state.world) return state;
      const world = structuredClone(state.world);
      const heya = world.heyas.get(action.heyaId);
      if (heya) heya.isPlayerOwned = true;
      
      return {
        ...state,
        world: { ...world, playerHeyaId: action.heyaId },
        playerHeyaId: action.heyaId,
        phase: "interim",
      };
    }
    
    default:
      return state;
  }
}
