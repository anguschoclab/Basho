import type { GameState, GameAction } from "./gameTypes";

export function heyaSlice(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "SET_PLAYER_HEYA": {
      if (!state.world) return state;
      const world = { ...state.world, heyas: new Map(state.world.heyas) };
      const heya = world.heyas.get(action.heyaId);
      if (heya) world.heyas.set(action.heyaId, { ...heya, isPlayerOwned: true });

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
