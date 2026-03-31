import type { GameState, GameAction } from "./gameTypes";
import type { BoutResult } from "../engine/types/basho";
import * as worldEngine from "../engine/world";
import { autosaveWithSignal } from "./gameHelpers";

export function bashoSlice(state: GameState, action: GameAction): GameState {
  if (!state.world) return state;

  switch (action.type) {
    case "START_BASHO": {
      const world = structuredClone(state.world);
      worldEngine.startBasho(world, world.currentBashoName);
      return { ...state, world, phase: "day_preview", currentBoutIndex: 0, lastBoutResult: null, boutTactics: {} };
    }

    case "ADVANCE_DAY": {
      if (!state.world.currentBasho) return state;
      const world = structuredClone(state.world);
      worldEngine.advanceBashoDay(world);
      const day = world.currentBasho!.day;
      if (day > 15) {
        try { autosaveWithSignal(world); } catch { /* silent */ }
        return { ...state, world, phase: "basho_results" };
      }
      try { autosaveWithSignal(world); } catch { /* silent */ }
      return { ...state, world, phase: "day_preview", currentBoutIndex: 0, lastBoutResult: null, boutTactics: {} };
    }

    case "SIMULATE_BOUT": {
      if (!state.world.currentBasho) return state;
      const world = structuredClone(state.world);
      
      const basho = world.currentBasho;
      const todays = basho.matches.filter((m) => m.day === basho.day && !m.result);
      const match = todays[action.boutIndex];
      const tactic = match?.boutId ? state.boutTactics[match.boutId] : undefined;
      
      const { result } = worldEngine.simulateBoutForToday(world, action.boutIndex, tactic);
      return { ...state, world, lastBoutResult: result ?? state.lastBoutResult, currentBoutIndex: action.boutIndex + 1 };
    }

    case "SET_BOUT_TACTIC":
      return {
        ...state,
        boutTactics: {
          ...state.boutTactics,
          [action.boutId]: action.tactic
        }
      };

    case "SIMULATE_ALL_BOUTS": {
      if (!state.world.currentBasho) return state;
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
      if (!state.world.currentBasho) return state;
      const world = structuredClone(state.world);
      worldEngine.endBasho(world);
      worldEngine.publishBanzukeUpdate(world);
      return { ...state, world, phase: "basho_recap", currentBoutIndex: 0, lastBoutResult: null };
    }

    case "SIM_FULL_BASHO": {
      if (!state.world.currentBasho) return state;
      const world = structuredClone(state.world);
      if (typeof (worldEngine as any).simulateBashoRest === 'function') {
        (worldEngine as any).simulateBashoRest(world);
      } else {
        const currentDay = world.currentBasho!.day;
        for (let d = currentDay; d <= 15; d++) {
            // Unroll to prevent excessive inner loop evaluations and memory leaks
            // Bout processing handles its own queue safely up to 64
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

    default:
      return state;
  }
}
