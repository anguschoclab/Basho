import { cloneWorldForTick } from "@/engine/tick/tickOrchestrator";
import type { GameState, GameAction } from "./gameTypes";
import * as worldEngine from "../engine/world";

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
      const world = cloneWorldForTick(state.world);
      const nextWorld = worldEngine.advanceInterim(world, action.weeks);
      const newPhase = nextWorld.cyclePhase === "active_basho" ? "day_preview" : "interim";
      return { ...state, world: nextWorld, phase: newPhase };
    }

    case "ADVANCE_ONE_DAY": {
      if (!state.world) return state;
      const world = cloneWorldForTick(state.world);
      const nextWorld = worldEngine.advanceDay(world) ?? world;
      const dayPhase = nextWorld.cyclePhase === "active_basho" ? "day_preview" : "interim";
      return { ...state, world: nextWorld, phase: dayPhase };
    }

    case "RUN_HOLIDAY": {
      if (!state.world) return state;
      const world = cloneWorldForTick(state.world);
      const hPhase = world.cyclePhase === "active_basho" ? "day_preview" : "interim";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase type narrowing limitation
      return { ...state, world, phase: hPhase as any };
    }

    case "RUN_AUTO_SIM": {
      if (!action.result.finalWorld) return state;
      return { ...state, world: structuredClone(action.result.finalWorld), phase: "interim" };
    }

    default:
      return state;
  }
}
