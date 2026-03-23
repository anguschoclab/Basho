import type { GameState, GameAction } from "./gameTypes";

// Placeholder for future finance-related global actions (e.g. paying salary, upgrading heya)
// In Redux slice pattern, this intercepts finance actions and mutates world's economy
export function financeSlice(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    // e.g. case "PAY_SALARY": ...
    default:
      return state;
  }
}
