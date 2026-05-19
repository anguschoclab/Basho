/**
 * src/contexts/GameContext.tsx
 * ===========================
 * Game State Context Provider
 *
 * Provides the main game state context with actions for world management,
 * basho simulation, and UI interactions.
 *
 * @see gameReducer for the main reducer logic
 * @see gameActions for action creators
 * @see gameTypes for type definitions
 */

import { createContext, useContext, useReducer, useCallback, useMemo, ReactNode } from "react";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { Heya } from "@/engine/types/heya";
import {
  saveGame,
  loadGame,
  hasAutosave,
  loadAutosave,
  getSaveSlotInfos,
  type SaveSlotInfo,
} from "@/engine/saveload";
import { runHoliday, type HolidayConfig, type HolidayResult } from "@/engine/holiday";
import { runAutoSim, type AutoSimConfig, type AutoSimResult } from "@/engine/autoSim";
import { registerElectronStorage } from "./electronStorageProvider";

// Register electron-store as the engine's storage backend (falls back to localStorage for web builds)
registerElectronStorage();

import type { GamePhase, GameState } from "./gameTypes";
import type { UIDigest } from "@/presenters/uiDigest";
import { initialGameState } from "./gameTypes";
import { gameReducer } from "./gameReducer";
import { autosaveWithSignal, getMatchesForDay } from "./gameHelpers";
import { recruitSponsor } from "@/presenters/uiDigest";

// Re-export types so existing imports from GameContext still work
export type { GamePhase, GameState } from "./gameTypes";

import * as actions from "./gameActions";

// === CONTEXT VALUE ===

/**
 * Defines the structure for game context value.
 * Contains the current game state and all available actions.
 */
interface GameContextValue {
  /** Current game state. */
  state: GameState;
  /** Latest UI digest built from world state. */
  digest: UIDigest | null;
  /** Creates a new world with the given seed. */
  createWorld: (seed: string, playerHeyaId?: string, oyakataConfig?: import("@/engine/types/oyakata").OyakataCreationConfig) => void;
  /** Sets the current game phase. */
  setPhase: (phase: GamePhase) => void;
  /** Selects a rikishi as the currently selected rikishi. */
  selectRikishi: (id: string | null) => void;
  /** Selects a heya as the currently selected heya. */
  selectHeya: (id: string | null) => void;
  /** Starts a new basho. */
  startBasho: () => void;
  /** Advances to the next day. */
  advanceDay: () => void;
  /** Simulates a specific bout. */
  simulateBout: (boutIndex: number) => void;
  /** Sets the tactic for a specific bout. */
  setBoutTactic: (boutId: string, tactic: import("@/engine/types/combat").BoutTactic) => void;
  /** Simulates all bouts for the current day. */
  simulateAllBouts: () => void;
  /** Ends the current day. */
  endDay: () => void;
  /** Ends the current basho. */
  endBasho: () => void;
  /** Simulates a full basho (all 15 days). */
  simFullBasho: () => void;
  /** Ticks multiple days at once. */
  tickMultipleDays: (days: number) => void;
  /** Advances the interim period by the specified number of weeks. */
  advanceInterim: (weeks?: number) => void;
  /** Advances by one day. */
  advanceOneDay: () => void;
  /** Runs a holiday event with the given configuration. */
  goOnHoliday: (config: HolidayConfig) => HolidayResult | null;
  /** Runs an auto-simulation with the given configuration. */
  runAutoSimAction: (config: AutoSimConfig) => Promise<AutoSimResult | null>;
  /** Saves the game to the specified slot. */
  saveToSlot: (slotName: string) => boolean;
  /** Loads the game from the specified slot. */
  loadFromSlot: (slotName: string) => boolean;
  /** Performs a quick save. */
  quickSave: () => boolean;
  /** Loads the most recent autosave. */
  loadFromAutosave: () => boolean;
  /** Checks if an autosave exists. */
  hasAutosave: () => boolean;
  /** Gets information about all save slots. */
  getSaveSlots: () => SaveSlotInfo[];
  /** Gets a rikishi by ID. */
  getRikishi: (id: string) => Rikishi | undefined;
  /** Gets a heya by ID. */
  getHeya: (id: string) => Heya | undefined;
  /** Gets the matches for the current day. */
  getCurrentDayMatches: () => ReturnType<typeof getMatchesForDay>;
  /** Gets the current standings. */
  getStandings: () => Array<{ rikishi: Rikishi; wins: number; losses: number }>;
  /** Updates the world state with a new world. */
  updateWorld: (world: WorldState) => void;
  /** Issues a governance ruling with the given severity. */
  issueRuling: (rulingId: string, severity: "lenient" | "standard" | "harsh") => void;
  /** Handles a media event with the given choice. */
  handleMediaEvent: (eventId: string, choice: string) => void;
  /** Advances the tutorial to the next step. */
  advanceTutorialStep: (step: import("@/engine/types/tutorial").TutorialStep) => void;
  /** Sets a tutorial flag. */
  setTutorialFlag: (flag: keyof import("@/engine/types/tutorial").TutorialFlags) => void;
  /** Completes the tutorial. */
  completeTutorial: () => void;
  /** Builds infrastructure for a heya. */
  buildInfrastructure: (
    heyaId: string,
    facilityId: import("@/engine/types/infrastructure").FacilityId
  ) => void;
  /** Assigns a mentor to an apprentice rikishi. */
  assignMentor: (mentorId: string, apprenticeId: string) => void;
  /** Removes a mentor from an apprentice rikishi. */
  removeMentor: (apprenticeId: string) => void;
  /** Runs an auto-simulation with the given configuration. */
  runAutoSim: (config: AutoSimConfig) => Promise<AutoSimResult | null>;
  /** Recruits a sponsor for the player's heya. */
  recruitSponsor: (sponsorId: string) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

// === PROVIDER ===

/**
 * Game provider component.
 * Wraps the application with the game context provider.
 *
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Child components to wrap
 */
export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);

  const createWorld = useCallback((seed: string, playerHeyaId?: string, oyakataConfig?: import("@/engine/types/oyakata").OyakataCreationConfig) => {
    dispatch(actions.createWorld(seed, playerHeyaId, oyakataConfig));
  }, []);

  const setPhase = useCallback((phase: GamePhase) => {
    dispatch(actions.setPhase(phase));
  }, []);

  const selectRikishi = useCallback((id: string | null) => {
    dispatch(actions.selectRikishi(id));
  }, []);

  const selectHeya = useCallback((id: string | null) => {
    dispatch(actions.selectHeya(id));
  }, []);

  const startBasho = useCallback(() => dispatch(actions.startBasho()), []);
  const advanceDay = useCallback(() => dispatch(actions.advanceDay()), []);
  const simulateBoutAction = useCallback(
    (index: number) => dispatch(actions.simulateBout(index)),
    []
  );
  const setBoutTacticAction = useCallback(
    (id: string, tactic: import("@/engine/types/combat").BoutTactic) =>
      dispatch(actions.setBoutTactic(id, tactic)),
    []
  );
  const simulateAllBouts = useCallback(() => dispatch(actions.simulateAllBouts()), []);
  const endDay = useCallback(() => dispatch(actions.endDay()), []);
  const endBasho = useCallback(() => dispatch(actions.endBasho()), []);
  const simFullBasho = useCallback(() => dispatch(actions.simFullBasho()), []);
  const tickMultipleDays = useCallback(
    (days: number) => dispatch(actions.tickMultipleDays(days)),
    []
  );
  const advanceInterim = useCallback(
    (weeks: number = 1) => dispatch(actions.advanceInterim(weeks)),
    []
  );
  const advanceOneDayAction = useCallback(() => dispatch(actions.advanceOneDay()), []);
  const updateWorld = useCallback((world: WorldState) => dispatch(actions.updateWorld(world)), []);

  const buildInfrastructureAction = useCallback(
    (heyaId: string, facilityId: import("@/engine/types/infrastructure").FacilityId) => {
      dispatch(actions.buildInfrastructure(heyaId, facilityId));
    },
    []
  );

  const issueRuling = useCallback(
    (rulingId: string, severity: "lenient" | "standard" | "harsh") => {
      dispatch(actions.issueRuling(rulingId, severity));
    },
    []
  );

  const handleMediaEvent = useCallback(
    (eventId: string, choice: string) => {
      if (!state.world) return;
      dispatch(actions.handleMediaEvent(eventId, choice));
    },
    [state.world]
  );

  const recruitSponsorAction = useCallback(
    (sponsorId: string) => {
      if (!state.world || !state.world.playerHeyaId || !state.world.rng) return;
      recruitSponsor(state.world, state.world.playerHeyaId, sponsorId, state.world.rng);
      updateWorld({ ...state.world });
    },
    [state.world, updateWorld]
  );

  const advanceTutorialStepAction = useCallback(
    (step: import("@/engine/types/tutorial").TutorialStep) => {
      dispatch(actions.advanceTutorialStep(step));
    },
    []
  );

  const setTutorialFlagAction = useCallback(
    (flag: keyof import("@/engine/types/tutorial").TutorialFlags) => {
      dispatch(actions.setTutorialFlag(flag));
    },
    []
  );

  const completeTutorialAction = useCallback(() => {
    dispatch(actions.completeTutorial());
  }, []);

  const goOnHoliday = useCallback(
    (config: HolidayConfig): HolidayResult | null => {
      if (!state.world) return null;
      const result = runHoliday(state.world, config);
      dispatch(actions.runHoliday(result));
      return result;
    },
    [state.world]
  );

  const runAutoSimAction = useCallback(
    async (config: AutoSimConfig): Promise<AutoSimResult | null> => {
      if (!state.world) return null;
      const result = runAutoSim(state.world, config);
      dispatch(actions.runAutoSim(result));
      return result;
    },
    [state.world]
  );

  const getRikishi = useCallback((id: string) => state.world?.rikishi.get(id), [state.world]);
  const getHeya = useCallback((id: string) => state.world?.heyas.get(id), [state.world]);
  const getCurrentDayMatches = useCallback(() => getMatchesForDay(state.world), [state.world]);

  const getStandings = useCallback(() => {
    if (!state.world?.currentBasho) return [];
    const standings = state.world.currentBasho.standings;
    return Array.from(state.world.rikishi.values())
      .filter((r) => r.division === "makuuchi")
      .map((r) => ({
        rikishi: r,
        wins: standings.get(r.id)?.wins || 0,
        losses: standings.get(r.id)?.losses || 0,
      }))
      .sort((a, b) => b.wins - a.wins || a.losses - b.losses);
  }, [state.world]);

  const saveToSlot = useCallback(
    (slotName: string) => {
      if (!state.world) return false;
      return saveGame(state.world, slotName, new Date().toISOString());
    },
    [state.world]
  );

  const loadFromSlot = useCallback((slotName: string) => {
    const world = loadGame(slotName);
    if (world) {
      dispatch(actions.loadWorld(world));
      return true;
    }
    return false;
  }, []);

  const quickSaveAction = useCallback(() => {
    if (!state.world) return false;
    autosaveWithSignal(state.world);
    return true;
  }, [state.world]);

  const loadFromAutosaveAction = useCallback(() => {
    const world = loadAutosave();
    if (world) {
      dispatch(actions.loadWorld(world));
      return true;
    }
    return false;
  }, []);

  const hasAutosaveCheck = useCallback(() => hasAutosave(), []);
  const getSaveSlots = useCallback(() => getSaveSlotInfos(), []);

  const assignMentorAction = useCallback(
    (mentorId: string, apprenticeId: string) => {
      dispatch(actions.assignMentor(mentorId, apprenticeId));
    },
    []
  );

  const removeMentorAction = useCallback((apprenticeId: string) => {
    dispatch(actions.removeMentor(apprenticeId));
  }, []);

  const value: GameContextValue = useMemo(
    () => ({
      state,
      digest: state.digest,
      createWorld,
      setPhase,
      selectRikishi,
      selectHeya,
      startBasho,
      advanceDay,
      simulateBout: simulateBoutAction,
      setBoutTactic: setBoutTacticAction,
      simulateAllBouts,
      endDay,
      endBasho,
      simFullBasho,
      advanceInterim,
      advanceOneDay: advanceOneDayAction,
      saveToSlot,
      loadFromSlot,
      quickSave: quickSaveAction,
      loadFromAutosave: loadFromAutosaveAction,
      hasAutosave: hasAutosaveCheck,
      getSaveSlots,
      getRikishi,
      getHeya,
      getCurrentDayMatches,
      getStandings,
      updateWorld,
      goOnHoliday,
      runAutoSim: runAutoSimAction,
      tickMultipleDays,
      issueRuling,
      handleMediaEvent,
      recruitSponsor: recruitSponsorAction,
      advanceTutorialStep: advanceTutorialStepAction,
      setTutorialFlag: setTutorialFlagAction,
      completeTutorial: completeTutorialAction,
      buildInfrastructure: buildInfrastructureAction,
      assignMentor: assignMentorAction,
      removeMentor: removeMentorAction,
      runAutoSimAction,
    }),
    [
      state,
      createWorld,
      setPhase,
      selectRikishi,
      selectHeya,
      startBasho,
      advanceDay,
      simulateBoutAction,
      setBoutTacticAction,
      simulateAllBouts,
      endDay,
      endBasho,
      simFullBasho,
      advanceInterim,
      advanceOneDayAction,
      saveToSlot,
      loadFromSlot,
      quickSaveAction,
      loadFromAutosaveAction,
      hasAutosaveCheck,
      getSaveSlots,
      getRikishi,
      getHeya,
      getCurrentDayMatches,
      getStandings,
      updateWorld,
      goOnHoliday,
      runAutoSimAction,
      tickMultipleDays,
      issueRuling,
      handleMediaEvent,
      recruitSponsorAction,
      advanceTutorialStepAction,
      setTutorialFlagAction,
      completeTutorialAction,
      buildInfrastructureAction,
      assignMentorAction,
      removeMentorAction,
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

// === HOOK ===

/** Use game. */
export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used within a GameProvider");
  return context;
}
