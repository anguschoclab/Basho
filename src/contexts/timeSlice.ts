import type { GameState, GameAction } from "./gameTypes";
import type { BoutResult } from "../engine/types/basho";
import * as worldEngine from "../engine/world";
import { autosaveWithSignal } from "./gameHelpers";

export function timeSlice(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_BASHO": {
      if (!state.world) return state;
      const world = structuredClone(state.world);
      worldEngine.startBasho(world, world.currentBashoName);
      return { ...state, world, phase: "day_preview", currentBoutIndex: 0, lastBoutResult: null };
    }

    case "ADVANCE_DAY": {
      if (!state.world?.currentBasho) return state;
      const world = structuredClone(state.world);
      worldEngine.advanceBashoDay(world);
      const day = world.currentBasho!.day;
      if (day > 15) {
        try { autosaveWithSignal(world); } catch { /* silent */ }
        return { ...state, world, phase: "basho_results" };
      }
      try { autosaveWithSignal(world); } catch { /* silent */ }
      return { ...state, world, phase: "day_preview", currentBoutIndex: 0, lastBoutResult: null };
    }

    case "SIMULATE_BOUT": {
      if (!state.world?.currentBasho) return state;
      const world = structuredClone(state.world);
      const { result } = worldEngine.simulateBoutForToday(world, action.boutIndex);
      return { ...state, world, lastBoutResult: result ?? state.lastBoutResult, currentBoutIndex: action.boutIndex + 1 };
    }

    case "SIMULATE_ALL_BOUTS": {
      if (!state.world?.currentBasho) return state;
      const world = structuredClone(state.world);
      let lastResult: BoutResult | null = state.lastBoutResult;
      for (let i = 0; i < 64; i++) {
        const { result } = worldEngine.simulateBoutForToday(world, 0);
        if (!result) break;
        lastResult = result;
      }
      try { autosaveWithSignal(world); } catch { /* silent */ }
      return { ...state, world, lastBoutResult: lastResult, phase: "day_results" };
    }

    case "END_DAY":
      return { ...state, phase: "day_results" };

    case "END_BASHO": {
      if (!state.world?.currentBasho) return state;
      const world = structuredClone(state.world);
      worldEngine.endBasho(world);
      worldEngine.publishBanzukeUpdate(world);
      return { ...state, world, phase: "basho_recap", currentBoutIndex: 0, lastBoutResult: null };
    }

    case "SIM_FULL_BASHO": {
      if (!state.world?.currentBasho) return state;
      const world = structuredClone(state.world);
      if (typeof (worldEngine as any).simulateBashoRest === 'function') {
        (worldEngine as any).simulateBashoRest(world);
      } else {
        const currentDay = world.currentBasho!.day;
        for (let d = currentDay; d <= 15; d++) {
            for (let i = 0; i < 64; i++) {
               const { result } = worldEngine.simulateBoutForToday(world, 0);
               if (!result) break;
            }
            if (d < 15) worldEngine.advanceBashoDay(world);
        }
      }
      try { autosaveWithSignal(world); } catch { /* silent */ }
      return { ...state, world, phase: "basho_results", currentBoutIndex: 0, lastBoutResult: null };
    }

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
