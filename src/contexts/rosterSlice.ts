import type { GameState, GameAction } from "./gameTypes";

export function rosterSlice(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "SELECT_RIKISHI":
      return { 
        ...state, 
        selectedRikishiId: action.id, 
        phase: action.id ? "rikishi" : state.phase 
      };
    default:
      return state;
  }
}
