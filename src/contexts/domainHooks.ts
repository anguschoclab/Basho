/**
 * src/contexts/domainHooks.ts
 * ===========================
 * Domain-specific action hooks that decompose the GameContext actions
 * into organized, focused APIs. Each hook wraps `useGame()` and returns
 * only the actions relevant to its domain.
 *
 * @see GameContext for the underlying provider
 */

import { useGame } from "./GameContext";

export function useBashoActions() {
  const game = useGame();
  return {
    startBasho: game.startBasho,
    advanceDay: game.advanceDay,
    simulateBout: game.simulateBout,
    setBoutTactic: game.setBoutTactic,
    simulateAllBouts: game.simulateAllBouts,
    endDay: game.endDay,
    endBasho: game.endBasho,
    simFullBasho: game.simFullBasho,
  };
}

export function useTimeActions() {
  const game = useGame();
  return {
    advanceInterim: game.advanceInterim,
    advanceOneDay: game.advanceOneDay,
    tickMultipleDays: game.tickMultipleDays,
  };
}

export function useTutorialActions() {
  const game = useGame();
  return {
    advanceTutorialStep: game.advanceTutorialStep,
    setTutorialFlag: game.setTutorialFlag,
    completeTutorial: game.completeTutorial,
  };
}

export function useRosterActions() {
  const game = useGame();
  return {
    assignMentor: game.assignMentor,
    removeMentor: game.removeMentor,
    addSparringPair: game.addSparringPair,
    removeSparringPair: game.removeSparringPair,
  };
}

export function useBookmarkActions() {
  const game = useGame();
  return {
    bookmarkEntity: game.bookmarkEntity,
    unbookmarkEntity: game.unbookmarkEntity,
    updateBookmarkNote: game.updateBookmarkNote,
    isBookmarked: game.isBookmarked,
  };
}

export function useSaveActions() {
  const game = useGame();
  return {
    saveToSlot: game.saveToSlot,
    loadFromSlot: game.loadFromSlot,
    quickSave: game.quickSave,
    loadFromAutosave: game.loadFromAutosave,
    hasAutosave: game.hasAutosave,
    getSaveSlots: game.getSaveSlots,
  };
}

export function useEconomyActions() {
  const game = useGame();
  return {
    recruitSponsor: game.recruitSponsor,
    buildInfrastructure: game.buildInfrastructure,
  };
}
