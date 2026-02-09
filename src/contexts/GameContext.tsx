// Game State Context - Central state management for Basho
// Provides world state, basho control, and game actions

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from "react";
import type { WorldState, Rikishi, Heya, BoutResult } from "@/engine/types";
import { generateWorld } from "@/engine/worldgen";
import * as worldEngine from "@/engine/world";
import { saveGame, loadGame, autosave, hasAutosave, loadAutosave, getSaveSlotInfos, type SaveSlotInfo } from "@/engine/saveload";

// === STATE TYPES ===

export type GamePhase = 
  | "menu"           // Main menu / world selection
  | "worldgen"       // Creating new world
  | "interim"        // Between basho
  | "basho"          // During tournament
  | "day_preview"    // Before day's bouts
  | "bout"           // Watching a bout
  | "day_results"    // After day's bouts
  | "basho_results"  // End of tournament
  | "stable"         // Managing stable
  | "banzuke"        // Viewing rankings
  | "rikishi"        // Viewing wrestler
  | "economy"        // Financial view
  | "governance"     // Council/rules
  | "history";       // Past results

export interface GameState {
  phase: GamePhase;
  world: WorldState | null;
  selectedRikishiId: string | null;
  selectedHeyaId: string | null;
  currentBoutIndex: number;
  lastBoutResult: BoutResult | null;
  playerHeyaId: string | null;
  isAutoPlaying: boolean;
}

// === ACTIONS ===

type GameAction =
  | { type: "CREATE_WORLD"; seed: string; playerHeyaId?: string }
  | { type: "SET_PLAYER_HEYA"; heyaId: string }
  | { type: "SET_PHASE"; phase: GamePhase }
  | { type: "START_BASHO" }
  | { type: "ADVANCE_DAY" }
  | { type: "SIMULATE_BOUT"; boutIndex: number }
  | { type: "SIMULATE_ALL_BOUTS" }
  | { type: "END_DAY" }
  | { type: "END_BASHO" }
  | { type: "ADVANCE_INTERIM"; weeks: number }
  | { type: "SELECT_RIKISHI"; id: string | null }
  | { type: "SELECT_HEYA"; id: string | null }
  | { type: "SET_AUTO_PLAY"; value: boolean }
  | { type: "UPDATE_WORLD"; world: WorldState }
  | { type: "LOAD_WORLD"; world: WorldState };

// === INITIAL STATE ===

const initialState: GameState = {
  phase: "menu",
  world: null,
  selectedRikishiId: null,
  selectedHeyaId: null,
  currentBoutIndex: 0,
  lastBoutResult: null,
  playerHeyaId: null,
  isAutoPlaying: false,
};

// === REDUCER ===

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "CREATE_WORLD": {
      const world = generateWorld({ seed: action.seed });
      
      // Only set player heya if explicitly provided
      const playerHeyaId = action.playerHeyaId || null;
      
      // Mark player's heya as owned if selected
      if (playerHeyaId) {
        const heya = world.heyas.get(playerHeyaId);
        if (heya) {
          heya.isPlayerOwned = true;
        }
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
      if (heya) {
        heya.isPlayerOwned = true;
      }
      return {
        ...state,
        world: { ...state.world, playerHeyaId: action.heyaId },
        playerHeyaId: action.heyaId,
        phase: "interim",
      };
    }

    case "SET_PHASE": {
      return { ...state, phase: action.phase };
    }

    case "START_BASHO": {
      if (!state.world) return state;

      // Use the orchestrator engine to start the basho (ensures hooks + schedule are consistent).
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
        // Tournament is over; UI can route to results.
        return { ...state, world: { ...state.world }, phase: "basho_results" };
      }

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

      // Keep simulating the first unplayed bout until there are none left today.
      let lastResult: BoutResult | null = state.lastBoutResult;
      // Safety cap: max bouts per day is limited (makuuchi ~ 21), but we cap to avoid infinite loops.
      for (let i = 0; i < 64; i++) {
        const { result } = worldEngine.simulateBoutForToday(state.world, 0);
        if (!result) break;
        lastResult = result;
      }

      return {
        ...state,
        world: { ...state.world },
        lastBoutResult: lastResult,
        phase: "day_results",
      };
    }

    case "END_DAY": {
      return { ...state, phase: "day_results" };
    }

    case "END_BASHO": {
      if (!state.world?.currentBasho) return state;

      // Orchestrator handles: basho result, lifecycle, then banzuke update + next basho.
      worldEngine.endBasho(state.world);
      worldEngine.publishBanzukeUpdate(state.world);

      return {
        ...state,
        world: { ...state.world },
        phase: "interim",
        currentBoutIndex: 0,
        lastBoutResult: null,
      };
    }

    case "ADVANCE_INTERIM": {
      if (!state.world) return state;
      worldEngine.advanceInterim(state.world, action.weeks);
      return {
        ...state,
        world: { ...state.world },
        phase: "interim",
      };
    }

    case "SELECT_RIKISHI": {
      return { 
        ...state, 
        selectedRikishiId: action.id,
        phase: action.id ? "rikishi" : state.phase,
      };
    }

    case "SELECT_HEYA": {
      return { 
        ...state, 
        selectedHeyaId: action.id,
        phase: action.id ? "stable" : state.phase,
      };
    }

    case "SET_AUTO_PLAY": {
      return { ...state, isAutoPlaying: action.value };
    }

    case "UPDATE_WORLD": {
      return { ...state, world: action.world };
    }

    case "LOAD_WORLD": {
      return {
        ...state,
        world: action.world,
        playerHeyaId: action.world.playerHeyaId || null,
        phase: action.world.playerHeyaId ? "interim" : "menu",
      };
    }

    default:
      return state;
  }
}

// === CONTEXT ===

interface GameContextValue {
  state: GameState;
  
  // World management
  createWorld: (seed: string, playerHeyaId?: string) => void;
  
  // Navigation
  setPhase: (phase: GamePhase) => void;
  selectRikishi: (id: string | null) => void;
  selectHeya: (id: string | null) => void;
  
  // Basho control
  startBasho: () => void;
  advanceDay: () => void;
  simulateBout: (index: number) => void;
  simulateAllBouts: () => void;
  endDay: () => void;
  endBasho: () => void;

  // Interim control
  advanceInterim: (weeks?: number) => void;
  
  // Save/Load
  saveToSlot: (slotName: string) => boolean;
  loadFromSlot: (slotName: string) => boolean;
  quickSave: () => boolean;
  loadFromAutosave: () => boolean;
  hasAutosave: () => boolean;
  getSaveSlots: () => SaveSlotInfo[];
  
  // Helpers
  getRikishi: (id: string) => Rikishi | undefined;
  getHeya: (id: string) => Heya | undefined;
  getCurrentDayMatches: () => ReturnType<typeof getMatchesForDay>;
  getStandings: () => Array<{ rikishi: Rikishi; wins: number; losses: number }>;

  // Escape hatch for pages that directly edit world objects (e.g., training plan persistence)
  updateWorld: (world: WorldState) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

// Helper to get matches for current day
function getMatchesForDay(world: WorldState | null) {
  if (!world?.currentBasho) return [];
  
  const day = world.currentBasho.day;
  return world.currentBasho.matches
    .filter(m => m.day === day)
    .map(m => ({
      ...m,
      east: world.rikishi.get(m.eastRikishiId),
      west: world.rikishi.get(m.westRikishiId),
    }));
}

// === PROVIDER ===

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const createWorld = useCallback((seed: string, playerHeyaId?: string) => {
    dispatch({ type: "CREATE_WORLD", seed, playerHeyaId });
  }, []);

  const setPhase = useCallback((phase: GamePhase) => {
    dispatch({ type: "SET_PHASE", phase });
  }, []);

  const selectRikishi = useCallback((id: string | null) => {
    dispatch({ type: "SELECT_RIKISHI", id });
  }, []);

  const selectHeya = useCallback((id: string | null) => {
    dispatch({ type: "SELECT_HEYA", id });
  }, []);

  const startBasho = useCallback(() => {
    dispatch({ type: "START_BASHO" });
  }, []);

  const advanceDay = useCallback(() => {
    dispatch({ type: "ADVANCE_DAY" });
  }, []);

  const simulateBoutAction = useCallback((index: number) => {
    dispatch({ type: "SIMULATE_BOUT", boutIndex: index });
  }, []);

  const simulateAllBouts = useCallback(() => {
    dispatch({ type: "SIMULATE_ALL_BOUTS" });
  }, []);

  const endDay = useCallback(() => {
    dispatch({ type: "END_DAY" });
  }, []);

  const endBasho = useCallback(() => {
    dispatch({ type: "END_BASHO" });
  }, []);

  const advanceInterim = useCallback((weeks: number = 1) => {
    dispatch({ type: "ADVANCE_INTERIM", weeks });
  }, []);

  const updateWorld = useCallback((world: WorldState) => {
    dispatch({ type: "UPDATE_WORLD", world });
  }, []);

  const getRikishi = useCallback((id: string) => {
    return state.world?.rikishi.get(id);
  }, [state.world]);

  const getHeya = useCallback((id: string) => {
    return state.world?.heyas.get(id);
  }, [state.world]);

  const getCurrentDayMatches = useCallback(() => {
    return getMatchesForDay(state.world);
  }, [state.world]);

  const getStandings = useCallback(() => {
    if (!state.world?.currentBasho) return [];
    
    const standings = state.world.currentBasho.standings;
    return Array.from(state.world.rikishi.values())
      .filter(r => r.division === "makuuchi")
      .map(r => ({
        rikishi: r,
        wins: standings.get(r.id)?.wins || 0,
        losses: standings.get(r.id)?.losses || 0,
      }))
      .sort((a, b) => b.wins - a.wins || a.losses - b.losses);
  }, [state.world]);

  // Save/Load functions
  const saveToSlot = useCallback((slotName: string) => {
    if (!state.world) return false;
    return saveGame(state.world, slotName);
  }, [state.world]);

  const loadFromSlot = useCallback((slotName: string) => {
    const world = loadGame(slotName);
    if (world) {
      dispatch({ type: "LOAD_WORLD", world });
      return true;
    }
    return false;
  }, []);

  const quickSaveAction = useCallback(() => {
    if (!state.world) return false;
    autosave(state.world);
    return true;
  }, [state.world]);

  const loadFromAutosave = useCallback(() => {
    const world = loadAutosave();
    if (world) {
      dispatch({ type: "LOAD_WORLD", world });
      return true;
    }
    return false;
  }, []);

  const hasAutosaveCheck = useCallback(() => hasAutosave(), []);
  const getSaveSlots = useCallback(() => getSaveSlotInfos(), []);

  const value: GameContextValue = {
    state,
    createWorld,
    setPhase,
    selectRikishi,
    selectHeya,
    startBasho,
    advanceDay,
    simulateBout: simulateBoutAction,
    simulateAllBouts,
    endDay,
    endBasho,
    advanceInterim,
    saveToSlot,
    loadFromSlot,
    quickSave: quickSaveAction,
    loadFromAutosave,
    hasAutosave: hasAutosaveCheck,
    getSaveSlots,
    getRikishi,
    getHeya,
    getCurrentDayMatches,
    getStandings,
    updateWorld,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

// === HOOK ===

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}
