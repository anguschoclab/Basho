// Game State Context — slim provider + hook
// Types, reducer, and helpers split into sibling modules.

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from "react";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { Heya } from "@/engine/types/heya";
import { saveGame, loadGame, hasAutosave, loadAutosave, getSaveSlotInfos, type SaveSlotInfo } from "@/engine/saveload";
import { runHoliday, type HolidayConfig, type HolidayResult } from "@/engine/holiday";
import { runAutoSim, type AutoSimConfig, type AutoSimResult } from "@/engine/autoSim";

import type { GamePhase, GameState } from "./gameTypes";
import { initialGameState } from "./gameTypes";
import { gameReducer } from "./gameReducer";
import { autosaveWithSignal, getMatchesForDay } from "./gameHelpers";

// Re-export types so existing imports from GameContext still work
export type { GamePhase, GameState } from "./gameTypes";

// === CONTEXT VALUE ===

/** Defines the structure for game context value. */
interface GameContextValue {
  state: GameState;
  createWorld: (seed: string, playerHeyaId?: string) => void;
  setPhase: (phase: GamePhase) => void;
  selectRikishi: (id: string | null) => void;
  selectHeya: (id: string | null) => void;
  startBasho: () => void;
  advanceDay: () => void;
  simulateBout: (index: number) => void;
  simulateAllBouts: () => void;
  endDay: () => void;
  endBasho: () => void;
  simFullBasho: () => void;
  advanceInterim: (weeks?: number) => void;
  advanceOneDay: () => void;
  goOnHoliday: (config: HolidayConfig) => HolidayResult | null;
  runAutoSimAction: (config: AutoSimConfig) => Promise<AutoSimResult | null>;
  saveToSlot: (slotName: string) => boolean;
  loadFromSlot: (slotName: string) => boolean;
  quickSave: () => boolean;
  loadFromAutosave: () => boolean;
  hasAutosave: () => boolean;
  getSaveSlots: () => SaveSlotInfo[];
  getRikishi: (id: string) => Rikishi | undefined;
  getHeya: (id: string) => Heya | undefined;
  getCurrentDayMatches: () => ReturnType<typeof getMatchesForDay>;
  getStandings: () => Array<{ rikishi: Rikishi; wins: number; losses: number }>;
  updateWorld: (world: WorldState) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

// === PROVIDER ===

/**
 * game provider.
 *  * @param { children } - The { children }.
 */
export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);

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

  const startBasho = useCallback(() => dispatch({ type: "START_BASHO" }), []);
  const advanceDay = useCallback(() => dispatch({ type: "ADVANCE_DAY" }), []);
  const simulateBoutAction = useCallback((index: number) => dispatch({ type: "SIMULATE_BOUT", boutIndex: index }), []);
  const simulateAllBouts = useCallback(() => dispatch({ type: "SIMULATE_ALL_BOUTS" }), []);
  const endDay = useCallback(() => dispatch({ type: "END_DAY" }), []);
  const endBasho = useCallback(() => dispatch({ type: "END_BASHO" }), []);
  const simFullBasho = useCallback(() => dispatch({ type: "SIM_FULL_BASHO" }), []);
  const advanceInterim = useCallback((weeks: number = 1) => dispatch({ type: "ADVANCE_INTERIM", weeks }), []);
  const advanceOneDayAction = useCallback(() => dispatch({ type: "ADVANCE_ONE_DAY" }), []);
  const updateWorld = useCallback((world: WorldState) => dispatch({ type: "UPDATE_WORLD", world }), []);

  const goOnHoliday = useCallback((config: HolidayConfig): HolidayResult | null => {
    if (!state.world) return null;
    const result = runHoliday(state.world, config);
    dispatch({ type: "RUN_HOLIDAY", result });
    return result;
  }, [state.world]);

  const runAutoSimAction = useCallback(async (config: AutoSimConfig): Promise<AutoSimResult | null> => {
    if (!state.world) return null;
    const result = runAutoSim(state.world, config);
    dispatch({ type: "RUN_AUTO_SIM", result });
    return result;
  }, [state.world]);

  const getRikishi = useCallback((id: string) => state.world?.rikishi.get(id), [state.world]);
  const getHeya = useCallback((id: string) => state.world?.heyas.get(id), [state.world]);
  const getCurrentDayMatches = useCallback(() => getMatchesForDay(state.world), [state.world]);

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

  const saveToSlot = useCallback((slotName: string) => {
    if (!state.world) return false;
    return saveGame(state.world, slotName);
  }, [state.world]);

  const loadFromSlot = useCallback((slotName: string) => {
    const world = loadGame(slotName);
    if (world) { dispatch({ type: "LOAD_WORLD", world }); return true; }
    return false;
  }, []);

  const quickSaveAction = useCallback(() => {
    if (!state.world) return false;
    autosaveWithSignal(state.world);
    return true;
  }, [state.world]);

  const loadFromAutosaveAction = useCallback(() => {
    const world = loadAutosave();
    if (world) { dispatch({ type: "LOAD_WORLD", world }); return true; }
    return false;
  }, []);

  const hasAutosaveCheck = useCallback(() => hasAutosave(), []);
  const getSaveSlots = useCallback(() => getSaveSlotInfos(), []);

  const value: GameContextValue = {
    state,
    createWorld, setPhase, selectRikishi, selectHeya,
    startBasho, advanceDay, simulateBout: simulateBoutAction, simulateAllBouts,
    endDay, endBasho, simFullBasho, advanceInterim, advanceOneDay: advanceOneDayAction,
    saveToSlot, loadFromSlot, quickSave: quickSaveAction,
    loadFromAutosave: loadFromAutosaveAction, hasAutosave: hasAutosaveCheck, getSaveSlots,
    getRikishi, getHeya, getCurrentDayMatches, getStandings,
    updateWorld, goOnHoliday, runAutoSimAction,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

// === HOOK ===

/** Use game. */
export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used within a GameProvider");
  return context;
}
