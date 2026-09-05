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

import { useReducer, useCallback, useMemo, useEffect, useTransition, ReactNode } from "react";
import { error as logError } from "@/engine/utils/Logger";
import type { WorldState } from "@/engine/types/world";
import { saveGame, loadGame, hasAutosave, loadAutosave, getSaveSlotInfos } from "@/engine/saveload";
import { type HolidayConfig, type HolidayResult } from "@/engine/holiday";
import { runAutoSim, type AutoSimConfig, type AutoSimResult } from "@/engine/autoSim";
import { registerElectronStorage } from "./electronStorageProvider";

// Register electron-store as the engine's storage backend (falls back to localStorage for web builds)
registerElectronStorage();

import { initialGameState } from "./gameTypes";
import { gameReducer } from "./gameReducer";
import { autosaveWithSignal, getMatchesForDay } from "./gameHelpers";
import { selectMakuuchiStandings } from "@/presenters/selectors";
import { buildWeeklyDigest } from "@/presenters/uiDigest";

// Re-export types so existing imports from GameContext still work
export type { GamePhase, GameState } from "./gameTypes";

import { GameContext, type GameContextValue } from "./gameContextInstance";
import type { GamePhase } from "./gameTypes";
import * as actions from "./gameActions";
import { useGameStore } from "@/store/gameStore";

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
  const [isPending, startTransition] = useTransition();
  const sendCommand = useGameStore((s) => s.sendCommand);
  const initWorker = useGameStore((s) => s.initWorker);
  const setOnWorldUpdated = useGameStore((s) => s.setOnWorldUpdated);

  // Build digest outside the reducer (selector pattern) — pure, memoized.
  // The worker already builds the digest via buildWeeklyDigest — we only
  // rebuild locally if the store doesn't have one yet (e.g. main-thread
  // actions like SIMULATE_BOUT that don't go through the worker).
  const storeDigest = useGameStore((s) => s.digest);
  const digest = useMemo(() => {
    if (storeDigest) return storeDigest;
    if (!state.world) return null;
    try {
      return buildWeeklyDigest(state.world);
    } catch (err) {
      logError("Error building weekly digest", "GameContext", err);
      return null;
    }
  }, [storeDigest, state.world]);

  // Initialize worker once on mount and wire world-update sync
  useEffect(() => {
    initWorker();
    setOnWorldUpdated((world: WorldState) => {
      startTransition(() => dispatch(actions.updateWorld(world)));
    });
  }, [initWorker, setOnWorldUpdated]);

  // B4.1.2: Autosave as a side-effect of world changes, not inside the reducer.
  // This preserves reducer purity. The effect debounces via the world reference.
  useEffect(() => {
    if (state.world) {
      try {
        autosaveWithSignal(state.world);
      } catch {
        /* silent */
      }
    }
  }, [state.world]);

  const createWorld = useCallback(
    (
      seed: string,
      playerHeyaId?: string,
      _oyakataConfig?: import("@/engine/types/oyakata").OyakataCreationConfig
    ) => {
      // B4.1.1: Worker is the single source of truth.
      // Only send START_WORLD to the worker — the worker generates the world
      // and emits WORLD_UPDATED, which is handled by the onWorldUpdated callback
      // (wired above) to dispatch updateWorld into the reducer.
      // This eliminates the redundant main-thread world generation that caused
      // divergence risk between reducer and worker state.
      sendCommand({ type: "START_WORLD", seed, playerHeyaId });
    },
    [sendCommand]
  );

  const setPhase = useCallback((phase: GamePhase) => {
    dispatch(actions.setPhase(phase));
  }, []);

  const startBasho = useCallback(() => dispatch(actions.startBasho()), []);
  const advanceDay = useCallback(() => sendCommand({ type: "TICK_DAY" }), [sendCommand]);
  const simulateBoutAction = useCallback(
    (index: number, boutId?: string) => dispatch(actions.simulateBout(index, boutId)),
    []
  );
  const setBoutTacticAction = useCallback(
    (id: string, tactic: import("@/engine/types/combat").BoutTactic) =>
      dispatch(actions.setBoutTactic(id, tactic)),
    []
  );
  const simulateAllBouts = useCallback(
    () => startTransition(() => dispatch(actions.simulateAllBouts())),
    []
  );
  const endDay = useCallback(() => dispatch(actions.endDay()), []);
  const endBasho = useCallback(() => dispatch(actions.endBasho()), []);
  const simFullBasho = useCallback(() => {
    // Route through the worker as TICK_MULTIPLE_DAYS with enough days to
    // finish the remaining basho days. The pipeline's phase01_basho_bouts
    // phase handles bout resolution and basho day advancement.
    const currentDay = state.world?.currentBasho?.day ?? 1;
    const remainingDays = Math.max(1, 15 - currentDay + 1);
    sendCommand({ type: "TICK_MULTIPLE_DAYS", days: remainingDays });
  }, [sendCommand, state.world?.currentBasho?.day]);
  const tickMultipleDays = useCallback(
    (days: number) => sendCommand({ type: "TICK_MULTIPLE_DAYS", days }),
    [sendCommand]
  );
  const advanceInterim = useCallback(
    (weeks: number = 1) => sendCommand({ type: "TICK_MULTIPLE_DAYS", days: weeks * 7 }),
    [sendCommand]
  );
  const advanceOneDayAction = useCallback(() => sendCommand({ type: "TICK_DAY" }), [sendCommand]);
  const updateWorld = useCallback((world: WorldState) => dispatch(actions.updateWorld(world)), []);

  const buildInfrastructureAction = useCallback(
    (heyaId: string, facilityId: import("@/engine/types/infrastructure").FacilityId) => {
      sendCommand({ type: "BUILD_INFRASTRUCTURE", heyaId, facilityId });
    },
    [sendCommand]
  );

  const issueRuling = useCallback(
    (rulingId: string, severity: "lenient" | "standard" | "harsh") => {
      sendCommand({ type: "ISSUE_RULING", rulingId, severity });
    },
    [sendCommand]
  );

  const recruitSponsorAction = useCallback(
    (sponsorId: string) => {
      const heyaId = state.world?.playerHeyaId;
      if (!heyaId) return;
      sendCommand({ type: "RECRUIT_SPONSOR", heyaId, sponsorId });
    },
    [state.world?.playerHeyaId, sendCommand]
  );

  const applyPressConferenceAction = useCallback(
    (heyaId: string, reputationDelta: number) => {
      sendCommand({ type: "APPLY_PRESS_CONFERENCE", heyaId, reputationDelta });
    },
    [sendCommand]
  );

  const setHeyaDietAction = useCallback(
    (heyaId: string, diet: import("@/engine/types/economy").DietRegimen) => {
      sendCommand({ type: "SET_HEYA_DIET", heyaId, diet });
    },
    [sendCommand]
  );

  const retireRikishiAction = useCallback(
    (rikishiId: string, reason: string) => {
      sendCommand({ type: "RETIRE_RIKISHI", rikishiId, reason });
    },
    [sendCommand]
  );

  const spendPoliticalCapitalAction = useCallback(
    (heyaId: string, amount: number) => {
      sendCommand({ type: "SPEND_POLITICAL_CAPITAL", heyaId, amount });
    },
    [sendCommand]
  );

  const setScoutingInvestmentAction = useCallback(
    (rikishiId: string, investment: import("@/engine/types/narrative").ScoutingInvestment) => {
      sendCommand({ type: "SET_SCOUTING_INVESTMENT", rikishiId, investment });
    },
    [sendCommand]
  );

  const setKeshoConfigAction = useCallback(
    (
      rikishiId: string,
      config: Partial<import("@/engine/types/keshoMawashi").KeshoMawashi>
    ) => {
      sendCommand({ type: "SET_KESHO_CONFIG", rikishiId, config });
    },
    [sendCommand]
  );

  const advanceTutorialStepAction = useCallback(
    (step: import("@/engine/types/tutorial").TutorialStep) => {
      sendCommand({ type: "ADVANCE_TUTORIAL_STEP", step });
    },
    [sendCommand]
  );

  const setTutorialFlagAction = useCallback(
    (flag: keyof import("@/engine/types/tutorial").TutorialFlags) => {
      sendCommand({ type: "SET_TUTORIAL_FLAG", flag });
    },
    [sendCommand]
  );

  const finishExhibitionAction = useCallback(
    (
      flag: keyof import("@/engine/types/tutorial").TutorialFlags,
      step: import("@/engine/types/tutorial").TutorialStep
    ) => {
      sendCommand({ type: "FINISH_EXHIBITION", flag, step });
    },
    [sendCommand]
  );

  const completeTutorialAction = useCallback(() => {
    sendCommand({ type: "COMPLETE_TUTORIAL" });
  }, [sendCommand]);

  const goOnHoliday = useCallback(
    (config: HolidayConfig): HolidayResult | null => {
      // Route through the worker so the holiday runs on the worker thread
      // and the world state is synced back via the normal command pipeline.
      sendCommand({ type: "GO_ON_HOLIDAY", config });
      return null;
    },
    [sendCommand]
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
    if (!state.world) return [];
    return selectMakuuchiStandings(state.world);
  }, [state.world]);

  const saveToSlot = useCallback(
    (slotName: string) => {
      if (!state.world) return false;
      return saveGame(state.world, slotName, new Date().toISOString());
    },
    [state.world]
  );

  const loadFromSlot = useCallback(
    (slotName: string) => {
      const world = loadGame(slotName);
      if (world) {
        dispatch(actions.loadWorld(world));
        sendCommand({ type: "LOAD_WORLD", world });
        return true;
      }
      return false;
    },
    [sendCommand]
  );

  const quickSaveAction = useCallback(() => {
    if (!state.world) return false;
    autosaveWithSignal(state.world);
    return true;
  }, [state.world]);

  const loadFromAutosaveAction = useCallback(() => {
    const world = loadAutosave();
    if (world) {
      dispatch(actions.loadWorld(world));
      sendCommand({ type: "LOAD_WORLD", world });
      return true;
    }
    return false;
  }, [sendCommand]);

  const hasAutosaveCheck = useCallback(() => hasAutosave(), []);
  const getSaveSlots = useCallback(() => getSaveSlotInfos(), []);

  const assignMentorAction = useCallback(
    (mentorId: string, apprenticeId: string) => {
      sendCommand({ type: "ASSIGN_MENTOR", mentorId, apprenticeId });
    },
    [sendCommand]
  );

  const removeMentorAction = useCallback(
    (apprenticeId: string) => {
      sendCommand({ type: "REMOVE_MENTOR", apprenticeId });
    },
    [sendCommand]
  );

  const addSparringPairAction = useCallback(
    (heyaId: string, aId: string, bId: string) => {
      sendCommand({ type: "ADD_SPARRING_PAIR", heyaId, aId, bId });
    },
    [sendCommand]
  );

  const removeSparringPairAction = useCallback(
    (heyaId: string, aId: string, bId: string) => {
      sendCommand({ type: "REMOVE_SPARRING_PAIR", heyaId, aId, bId });
    },
    [sendCommand]
  );

  const bookmarkEntityAction = useCallback(
    (entityType: string, entityId: string, note?: string) => {
      sendCommand({ type: "BOOKMARK_ENTITY", entityType, entityId, note });
    },
    [sendCommand]
  );

  const unbookmarkEntityAction = useCallback(
    (entityType: string, entityId: string) => {
      sendCommand({ type: "UNBOOKMARK_ENTITY", entityType, entityId });
    },
    [sendCommand]
  );

  const updateBookmarkNoteAction = useCallback(
    (entityType: string, entityId: string, note: string) => {
      sendCommand({ type: "UPDATE_BOOKMARK_NOTE", entityType, entityId, note });
    },
    [sendCommand]
  );

  const isBookmarkedCheck = useCallback(
    (entityType: string, entityId: string) => {
      const bookmarks = state.world?.playerKnowledge?.bookmarks ?? [];
      return bookmarks.some((b) => b.entityType === entityType && b.entityId === entityId);
    },
    [state.world]
  );

  const investInFacilityAction = useCallback(
    (heyaId: string, axis: import("@/engine/facilities").FacilityAxis, points: number) => {
      sendCommand({ type: "INVEST_IN_FACILITY", heyaId, axis, points });
    },
    [sendCommand]
  );

  const value: GameContextValue = useMemo(
    () => ({
      state,
      digest,
      isPending,
      createWorld,
      setPhase,
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
      issueRuling,
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
      recruitSponsor: recruitSponsorAction,
      applyPressConference: applyPressConferenceAction,
      setHeyaDiet: setHeyaDietAction,
      retireRikishi: retireRikishiAction,
      spendPoliticalCapital: spendPoliticalCapitalAction,
      setScoutingInvestment: setScoutingInvestmentAction,
      setKeshoConfig: setKeshoConfigAction,
      advanceTutorialStep: advanceTutorialStepAction,
      setTutorialFlag: setTutorialFlagAction,
      finishExhibition: finishExhibitionAction,
      completeTutorial: completeTutorialAction,
      buildInfrastructure: buildInfrastructureAction,
      assignMentor: assignMentorAction,
      removeMentor: removeMentorAction,
      addSparringPair: addSparringPairAction,
      removeSparringPair: removeSparringPairAction,
      bookmarkEntity: bookmarkEntityAction,
      unbookmarkEntity: unbookmarkEntityAction,
      updateBookmarkNote: updateBookmarkNoteAction,
      isBookmarked: isBookmarkedCheck,
      runAutoSimAction,
      investInFacility: investInFacilityAction,
    }),
    [
      state,
      digest,
      isPending,
      createWorld,
      setPhase,
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
      issueRuling,
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
      recruitSponsorAction,
      applyPressConferenceAction,
      setHeyaDietAction,
      retireRikishiAction,
      spendPoliticalCapitalAction,
      setScoutingInvestmentAction,
      setKeshoConfigAction,
      advanceTutorialStepAction,
      setTutorialFlagAction,
      finishExhibitionAction,
      completeTutorialAction,
      buildInfrastructureAction,
      assignMentorAction,
      removeMentorAction,
      addSparringPairAction,
      removeSparringPairAction,
      bookmarkEntityAction,
      unbookmarkEntityAction,
      updateBookmarkNoteAction,
      isBookmarkedCheck,
      investInFacilityAction,
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

// === HOOK ===
// useGame has been moved to ./useGame.ts to satisfy react-refresh/only-export-components.
