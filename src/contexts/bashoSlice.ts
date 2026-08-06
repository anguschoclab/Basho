import type { GameState, GameAction } from "./gameTypes";
import type { BoutResult } from "../engine/types/basho";
import * as worldEngine from "../engine/world";
import { autosaveWithSignal } from "./gameHelpers";
import { resolveImpacts } from "../engine/core/ImpactResolver";

/**
 * P3.4: bashoSlice is now fully immutable — no cloneWorldForTick needed.
 * All worldEngine.* functions return new WorldState objects via resolveImpacts.
 * P2.4: SIMULATE_ALL_BOUTS and SIM_FULL_BASHO pre-compute todays bouts
 * instead of using a 64-iteration loop with re-filtering.
 */
export function bashoSlice(state: GameState, action: GameAction): GameState {
  if (!state.world) return state;

  switch (action.type) {
    case "START_BASHO": {
      const world = worldEngine.startBasho(state.world, state.world.currentBashoName);
      return {
        ...state,
        world,
        phase: "day_preview",
        currentBoutIndex: 0,
        lastBoutResult: null,
        boutTactics: {},
      };
    }

    case "ADVANCE_DAY": {
      if (!state.world.currentBasho) return state;
      const world = worldEngine.advanceBashoDay(state.world);
      const day = world.currentBasho?.day ?? 0;
      if (day > 15) {
        try {
          autosaveWithSignal(world);
        } catch {
          /* silent */
        }
        return { ...state, world, phase: "basho_results" };
      }
      try {
        autosaveWithSignal(world);
      } catch {
        /* silent */
      }
      return {
        ...state,
        world,
        phase: "day_preview",
        currentBoutIndex: 0,
        lastBoutResult: null,
        boutTactics: {},
      };
    }

    case "SIMULATE_BOUT": {
      if (!state.world.currentBasho) return state;
      const basho = state.world.currentBasho;
      const todays = basho.matches.filter((m) => m.day === basho.day && !m.result);
      let unplayedIndex = action.boutIndex;
      if (action.boutId) {
        const idx = todays.findIndex((m) => m.boutId === action.boutId);
        if (idx >= 0) unplayedIndex = idx;
      }
      const playerTactic = action.boutId ? state.boutTactics[action.boutId] : undefined;
      const { world, result } = worldEngine.simulateBoutForToday(state.world, unplayedIndex, playerTactic);
      return {
        ...state,
        world,
        lastBoutResult: result ?? state.lastBoutResult,
        currentBoutIndex: action.boutIndex + 1,
      };
    }

    case "SET_BOUT_TACTIC":
      return {
        ...state,
        boutTactics: {
          ...state.boutTactics,
          [action.boutId]: action.tactic,
        },
      };

    case "SIMULATE_ALL_BOUTS": {
      if (!state.world.currentBasho) return state;
      let world = state.world;
      let lastResult: BoutResult | null = state.lastBoutResult;
      const basho = world.currentBasho;
      if (basho) {
        const todays = (basho.matches ?? []).filter((m) => m.day === basho.day && !m.result);
        for (let i = 0; i < todays.length; i++) {
          const match = todays[i];
          const playerTactic = match?.boutId ? state.boutTactics[match.boutId] : undefined;
          const result = worldEngine.simulateBoutForToday(world, 0, playerTactic);
          world = result.world;
          if (result.result) lastResult = result.result;
        }
      }
      try {
        autosaveWithSignal(world);
      } catch {
        /* silent */
      }
      return { ...state, world, lastBoutResult: lastResult, phase: "day_results" };
    }

    case "END_DAY":
      return { ...state, phase: "day_results" };

    case "END_BASHO": {
      if (!state.world.currentBasho) return state;
      let world = worldEngine.endBasho(state.world);
      const banzukeImpact = worldEngine.publishBanzukeUpdate(world);
      world = resolveImpacts(world, [banzukeImpact]);
      return { ...state, world, phase: "basho_recap", currentBoutIndex: 0, lastBoutResult: null };
    }

    case "SIM_FULL_BASHO": {
      if (!state.world.currentBasho) return state;
      let world = state.world;
      const currentDay = world.currentBasho?.day ?? 1;
      for (let d = currentDay; d <= 15; d++) {
        const basho = world.currentBasho;
        if (!basho) break;
        const todays = (basho.matches ?? []).filter((m) => m.day === basho.day && !m.result);
        for (let i = 0; i < todays.length; i++) {
          const match = todays[i];
          const playerTactic = match?.boutId ? state.boutTactics[match.boutId] : undefined;
          const result = worldEngine.simulateBoutForToday(world, 0, playerTactic);
          world = result.world;
        }
        if (d < 15) world = worldEngine.advanceBashoDay(world);
      }
      try {
        autosaveWithSignal(world);
      } catch {
        /* silent */
      }
      return { ...state, world, phase: "basho_results", currentBoutIndex: 0, lastBoutResult: null };
    }

    default:
      return state;
  }
}
