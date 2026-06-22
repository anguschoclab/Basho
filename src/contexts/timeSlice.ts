import type { GameState, GameAction } from "./gameTypes";

export function timeSlice(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "RUN_HOLIDAY": {
      if (!state.world) return state;
      const hPhase = state.world.cyclePhase === "active_basho" ? "day_preview" : "interim";
      return { ...state, phase: hPhase };
    }

    case "RUN_AUTO_SIM": {
      if (!action.result.finalWorld) return state;
      return { ...state, world: structuredClone(action.result.finalWorld), phase: "interim" };
    }

    default:
      return state;
  }
}
