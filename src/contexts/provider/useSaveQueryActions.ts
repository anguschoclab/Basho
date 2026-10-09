/**
 * useSaveQueryActions.ts
 *
 * Save/load and world-query actions for GameProvider.
 */

import { useCallback, useMemo } from "react";
import type { WorldState } from "@/engine/types/world";
import { saveGame, loadGame, hasAutosave, loadAutosave, getSaveSlotInfos } from "@/engine/saveload";
import { autosaveWithSignal, getMatchesForDay } from "../gameHelpers";
import { selectMakuuchiStandings } from "@/presenters/selectors";
import type { GameState } from "../gameTypes";
import * as actions from "../gameActions";

export function useSaveQueryActions(
  state: GameState,
  dispatch: React.Dispatch<import("../gameTypes").GameAction>
) {
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
        // The reducer's LOAD_WORLD case bumps uiWorldRevision; the sync effect
        // above pushes the world to the worker — and retries when a tick is in
        // flight, so the load can't be silently reverted mid-tick (WS3-04).
        dispatch(actions.loadWorld(world));
        return true;
      }
      return false;
    },
    [dispatch]
  );

  const quickSave = useCallback(() => {
    if (!state.world) return false;
    autosaveWithSignal(state.world);
    return true;
  }, [state.world]);

  const loadFromAutosave = useCallback(() => {
    const world = loadAutosave();
    if (world) {
      dispatch(actions.loadWorld(world));
      return true;
    }
    return false;
  }, [dispatch]);

  // V9-B01: external save import loads the deserialized world verbatim on both
  // sides of the boundary — reducer first, then the worker's authoritative
  // copy. No createWorld fallback: regenerating from the seed would discard
  // the imported save's progress.
  const loadWorldDirect = useCallback(
    (world: WorldState) => {
      dispatch(actions.loadWorld(world));
    },
    [dispatch]
  );

  const hasAutosaveCheck = useCallback(() => hasAutosave(), []);
  const getSaveSlots = useCallback(() => getSaveSlotInfos(), []);

  const getRikishi = useCallback((id: string) => state.world?.rikishi.get(id), [state.world]);
  const getHeya = useCallback((id: string) => state.world?.heyas.get(id), [state.world]);
  const getCurrentDayMatches = useCallback(() => getMatchesForDay(state.world), [state.world]);

  const getStandings = useCallback(() => {
    if (!state.world) return [];
    return selectMakuuchiStandings(state.world);
  }, [state.world]);

  const isBookmarked = useCallback(
    (entityType: string, entityId: string) => {
      const bookmarks = state.world?.playerKnowledge?.bookmarks ?? [];
      return bookmarks.some((b) => b.entityType === entityType && b.entityId === entityId);
    },
    [state.world]
  );

  return useMemo(
    () => ({
      saveToSlot,
      loadFromSlot,
      quickSave,
      loadFromAutosave,
      loadWorldDirect,
      hasAutosave: hasAutosaveCheck,
      getSaveSlots,
      getRikishi,
      getHeya,
      getCurrentDayMatches,
      getStandings,
      isBookmarked,
    }),
    [
      saveToSlot,
      loadFromSlot,
      quickSave,
      loadFromAutosave,
      loadWorldDirect,
      hasAutosaveCheck,
      getSaveSlots,
      getRikishi,
      getHeya,
      getCurrentDayMatches,
      getStandings,
      isBookmarked,
    ]
  );
}
