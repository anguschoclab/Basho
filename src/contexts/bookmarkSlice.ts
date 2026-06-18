import type { GameState, GameAction } from "./gameTypes";
import {
  addBookmark,
  removeBookmark,
  updateBookmarkNote,
} from "@/engine/systems/bookmark/BookmarkService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";

/**
 * Bookmark slice handling bookmark-related actions.
 *
 * Processes BOOKMARK_ENTITY, UNBOOKMARK_ENTITY, and UPDATE_BOOKMARK_NOTE actions.
 * Uses StateImpact pattern for transactional updates.
 */
export function bookmarkSlice(state: GameState, action: GameAction): GameState {
  if (!state.world) return state;

  switch (action.type) {
    case "BOOKMARK_ENTITY": {
      const impact = addBookmark(
        state.world,
        action.entityType,
        action.entityId,
        action.note
      );
      return {
        ...state,
        world: resolveImpacts(state.world, [impact]),
      };
    }
    case "UNBOOKMARK_ENTITY": {
      const impact = removeBookmark(
        state.world,
        action.entityType,
        action.entityId
      );
      return {
        ...state,
        world: resolveImpacts(state.world, [impact]),
      };
    }
    case "UPDATE_BOOKMARK_NOTE": {
      const impact = updateBookmarkNote(
        state.world,
        action.entityType,
        action.entityId,
        action.note
      );
      return {
        ...state,
        world: resolveImpacts(state.world, [impact]),
      };
    }
    default:
      return state;
  }
}
