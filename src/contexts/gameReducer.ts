// Game Reducer — pure state transitions
import type { GameState, GameAction, GamePhase } from "./gameTypes";
import type { BoutResult } from "@/engine/types/basho";
import { generateWorld } from "@/engine/worldgen";
import * as worldEngine from "@/engine/world";
import { autosaveWithSignal } from "./gameHelpers";

/**
 * Game reducer.
 *  * @param state - The State.
 *  * @param action - The Action.
 *  * @returns The result.
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "CREATE_WORLD": {
      const world = generateWorld({ seed: action.seed });
      const playerHeyaId = action.playerHeyaId || null;
      if (playerHeyaId) {
        const heya = world.heyas.get(playerHeyaId);
        if (heya) heya.isPlayerOwned = true;
      }
      return {
        ...state,
        world: { ...world, playerHeyaId: playerHeyaId || undefined },
        playerHeyaId,
        phase: playerHeyaId ? "interim" : "menu",
      };
    }

    case "SET_PLAYER_HEYA": {
      if (!state.world) return state;
      const heya = state.world.heyas.get(action.heyaId);
      if (heya) heya.isPlayerOwned = true;
      return {
        ...state,
        world: { ...state.world, playerHeyaId: action.heyaId },
        playerHeyaId: action.heyaId,
        phase: "interim",
      };
    }

    case "SET_PHASE":
      return { ...state, phase: action.phase };

    case "START_BASHO": {
      if (!state.world) return state;
      worldEngine.startBasho(state.world, state.world.currentBashoName);
      return {
        ...state,
        world: { ...state.world },
        phase: "day_preview",
        currentBoutIndex: 0,
        lastBoutResult: null,
      };
    }

    case "ADVANCE_DAY": {
      if (!state.world?.currentBasho) return state;
      worldEngine.advanceBashoDay(state.world);
      const day = state.world.currentBasho.day;
      if (day > 15) {
        try { autosaveWithSignal(state.world); } catch { /* silent */ }
        return { ...state, world: { ...state.world }, phase: "basho_results" };
      }
      try { autosaveWithSignal(state.world); } catch { /* silent */ }
      return {
        ...state,
        world: { ...state.world },
        phase: "day_preview",
        currentBoutIndex: 0,
        lastBoutResult: null,
      };
    }

    case "SIMULATE_BOUT": {
      if (!state.world?.currentBasho) return state;
      const { result } = worldEngine.simulateBoutForToday(state.world, action.boutIndex);
      return {
        ...state,
        world: { ...state.world },
        lastBoutResult: result ?? state.lastBoutResult,
        currentBoutIndex: action.boutIndex + 1,
      };
    }

    case "SIMULATE_ALL_BOUTS": {
      if (!state.world?.currentBasho) return state;
      let lastResult: BoutResult | null = state.lastBoutResult;
      for (let i = 0; i < 64; i++) {
        const { result } = worldEngine.simulateBoutForToday(state.world, 0);
        if (!result) break;
        lastResult = result;
      }
      try { autosaveWithSignal(state.world); } catch { /* silent */ }
      return {
        ...state,
        world: { ...state.world },
        lastBoutResult: lastResult,
        phase: "day_results",
      };
    }

    case "END_DAY":
      return { ...state, phase: "day_results" };

    case "END_BASHO": {
      if (!state.world?.currentBasho) return state;
      worldEngine.endBasho(state.world);
      worldEngine.publishBanzukeUpdate(state.world);
      return {
        ...state,
        world: { ...state.world },
        phase: "basho_recap",
        currentBoutIndex: 0,
        lastBoutResult: null,
      };
    }

    case "SIM_FULL_BASHO": {
      if (!state.world?.currentBasho) return state;
      for (let safety = 0; safety < 15; safety++) {
        const day = state.world.currentBasho?.day;
        if (!day || day > 15) break;
        for (let b = 0; b < 64; b++) {
          const { result } = worldEngine.simulateBoutForToday(state.world, 0);
          if (!result) break;
        }
        worldEngine.advanceBashoDay(state.world);
      }
      try { autosaveWithSignal(state.world); } catch { /* silent */ }
      return { ...state, world: { ...state.world }, phase: "basho_results" };
    }

    case "ADVANCE_INTERIM": {
      if (!state.world) return state;
      worldEngine.advanceInterim(state.world, action.weeks);
      const newPhase = state.world.cyclePhase === "active_basho" ? "day_preview" : "interim";
      return { ...state, world: { ...state.world }, phase: newPhase };
    }

    case "ADVANCE_ONE_DAY": {
      if (!state.world) return state;
      worldEngine.advanceDay(state.world);
      const dayPhase = state.world.cyclePhase === "active_basho" ? "day_preview" : "interim";
      return { ...state, world: { ...state.world }, phase: dayPhase };
    }

    case "RUN_HOLIDAY": {
      if (!state.world) return state;
      const hPhase = state.world.cyclePhase === "active_basho" ? "day_preview" : "interim";
      return { ...state, world: { ...state.world }, phase: hPhase as GamePhase };
    }

    case "RUN_AUTO_SIM": {
      if (!action.result.finalWorld) return state;
      return { ...state, world: { ...action.result.finalWorld }, phase: "interim" };
    }

    case "SELECT_RIKISHI":
      return { ...state, selectedRikishiId: action.id, phase: action.id ? "rikishi" : state.phase };

    case "SELECT_HEYA":
      return { ...state, selectedHeyaId: action.id, phase: action.id ? "stable" : state.phase };

    case "SET_AUTO_PLAY":
      return { ...state, isAutoPlaying: action.value };

    case "UPDATE_WORLD":
      return { ...state, world: action.world };

    case "LOAD_WORLD":
      return {
        ...state,
        world: action.world,
        playerHeyaId: action.world.playerHeyaId || null,
        phase: action.world.playerHeyaId ? "interim" : "menu",
      };

    default:
      return state;
  }
}
