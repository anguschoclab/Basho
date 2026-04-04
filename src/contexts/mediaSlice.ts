import type { GameState, GameAction } from "./gameTypes";

/**
 * Handle media and scandal related actions.
 */
export function mediaSlice(state: GameState, action: GameAction): GameState {
  if (!state.world) return state;

  switch (action.type) {
    case "HANDLE_MEDIA_EVENT": {
      // TODO(10434881180276762453): Implement media choice handling (requires cloning state.world and calling an engine handler)
      return state;
    }

    case "ISSUE_RULING": {
      // Handle governance rulings
      return state;
    }

    default:
      return state;
  }
}
