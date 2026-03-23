// Game Reducer — pure state transitions
import type { GameState, GameAction, GamePhase } from "./gameTypes";
import type { BoutResult } from "@/engine/types/basho";
import { generateWorld } from "@/engine/worldgen";
import * as worldEngine from "@/engine/world";
import { autosaveWithSignal } from "./gameHelpers";

// Handlers for specific actions to keep the main reducer clean

function handleCreateWorld(state: GameState, action: Extract<GameAction, { type: "CREATE_WORLD" }>): GameState {
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

function handleSetPlayerHeya(state: GameState, action: Extract<GameAction, { type: "SET_PLAYER_HEYA" }>): GameState {
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

function handleStartBasho(state: GameState): GameState {
  if (!state.world) return state;
  const world = structuredClone(state.world);
  worldEngine.startBasho(world, world.currentBashoName);
  return {
    ...state,
    world,
    phase: "day_preview",
    currentBoutIndex: 0,
    lastBoutResult: null,
  };
}

function handleAdvanceDay(state: GameState): GameState {
  if (!state.world?.currentBasho) return state;
  const world = structuredClone(state.world);
  worldEngine.advanceBashoDay(world);
  const day = world.currentBasho!.day;
  if (day > 15) {
    try { autosaveWithSignal(world); } catch { /* silent */ }
    return { ...state, world, phase: "basho_results" };
  }
  try { autosaveWithSignal(world); } catch { /* silent */ }
  return {
    ...state,
    world,
    phase: "day_preview",
    currentBoutIndex: 0,
    lastBoutResult: null,
  };
}

function handleSimulateBout(state: GameState, action: Extract<GameAction, { type: "SIMULATE_BOUT" }>): GameState {
  if (!state.world?.currentBasho) return state;
  const world = structuredClone(state.world);
  const { result } = worldEngine.simulateBoutForToday(world, action.boutIndex);
  return {
    ...state,
    world,
    lastBoutResult: result ?? state.lastBoutResult,
    currentBoutIndex: action.boutIndex + 1,
  };
}

function handleSimulateAllBouts(state: GameState): GameState {
  if (!state.world?.currentBasho) return state;
  const world = structuredClone(state.world);
  let lastResult: BoutResult | null = state.lastBoutResult;
  for (let i = 0; i < 64; i++) {
    const { result } = worldEngine.simulateBoutForToday(world, 0);
    if (!result) break;
    lastResult = result;
  }
  try { autosaveWithSignal(world); } catch { /* silent */ }
  return {
    ...state,
    world,
    lastBoutResult: lastResult,
    phase: "day_results",
  };
}

function handleEndBasho(state: GameState): GameState {
  if (!state.world?.currentBasho) return state;
  const world = structuredClone(state.world);
  worldEngine.endBasho(world);
  worldEngine.publishBanzukeUpdate(world);
  return {
    ...state,
    world,
    phase: "basho_recap",
    currentBoutIndex: 0,
    lastBoutResult: null,
  };
}

function handleSimFullBasho(state: GameState): GameState {
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
  return {
    ...state,
    world,
    phase: "basho_results",
    currentBoutIndex: 0,
    lastBoutResult: null,
  };
}

/**
 * Game reducer.
 *  * @param state - The State.
 *  * @param action - The Action.
 *  * @returns The result.
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "CREATE_WORLD":
      return handleCreateWorld(state, action);

    case "SET_PLAYER_HEYA":
      return handleSetPlayerHeya(state, action);

    case "SET_PHASE":
      return { ...state, phase: action.phase };

    case "START_BASHO":
      return handleStartBasho(state);

    case "ADVANCE_DAY":
      return handleAdvanceDay(state);

    case "SIMULATE_BOUT":
      return handleSimulateBout(state, action);

    case "SIMULATE_ALL_BOUTS":
      return handleSimulateAllBouts(state);

    case "END_DAY":
      return { ...state, phase: "day_results" };

    case "END_BASHO":
      return handleEndBasho(state);

    case "SIM_FULL_BASHO":
      return handleSimFullBasho(state);

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
      return { ...state, world, phase: hPhase as GamePhase };
    }

    case "RUN_AUTO_SIM": {
      if (!action.result.finalWorld) return state;
      return { ...state, world: structuredClone(action.result.finalWorld), phase: "interim" };
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
