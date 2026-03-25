import type { GameState, GameAction } from "./gameTypes";
import type { BoutResult } from "../engine/types/basho";
import * as worldEngine from "../engine/world";
import { autosaveWithSignal } from "./gameHelpers";

export function timeSlice(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_BASHO":
    case "ADVANCE_DAY":
    case "SIMULATE_BOUT":
    case "SIMULATE_ALL_BOUTS":
    case "END_DAY":
    case "END_BASHO":
    case "SIM_FULL_BASHO":
      // These are now handled by bashoSlice
      return state;

    case "ADVANCE_INTERIM": {
      if (!state.world) return state;
      const world = structuredClone(state.world);
      worldEngine.advanceInterim(world, action.weeks);
      const newPhase = world.cyclePhase === "active_basho" ? "day_preview" : "interim";
      return { ...state, world, phase: newPhase };
    }

    case "ADVANCE_ONE_DAY": {
      if (!state.world) return state;
      const world = structuredClone(state.world);
      worldEngine.advanceDay(world);
      const dayPhase = world.cyclePhase === "active_basho" ? "day_preview" : "interim";
      return { ...state, world, phase: dayPhase };
    }

    case "RUN_HOLIDAY": {
      if (!state.world) return state;
      const world = structuredClone(state.world);
      const hPhase = world.cyclePhase === "active_basho" ? "day_preview" : "interim";
      return { ...state, world, phase: hPhase as any }; // Cast for strict phase typing if needed
    }

    case "RUN_AUTO_SIM": {
      if (!action.result.finalWorld) return state;
      return { ...state, world: structuredClone(action.result.finalWorld), phase: "interim" };
    }

    default:
      return state;
  }
}
