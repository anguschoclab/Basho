// Game Reducer — pure state transitions using Slice Pattern
import type { GameState, GameAction } from "./gameTypes";
import { combineReducers } from "./gameHelpers";
import { bashoSlice } from "./bashoSlice";

/**
 * Core generic actions that don't fit cleanly into a domain slice.
 * World creation lives exclusively in the worker (START_WORLD) — the worker
 * is the single source of truth and main-thread generation would risk
 * divergence (V9-B05).
 */
function coreSlice(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "SET_PHASE":
      return { ...state, phase: action.phase };

    case "UPDATE_WORLD":
      return {
        ...state,
        world: action.world,
        playerHeyaId: action.world.playerHeyaId || state.playerHeyaId,
        playerOyakataId: action.world.playerHeyaId
          ? (action.world.heyas.get(action.world.playerHeyaId)?.oyakataId ?? state.playerOyakataId)
          : state.playerOyakataId,
      };

    case "LOAD_WORLD":
      return {
        ...state,
        world: action.world,
        // Bump the sync revision so GameContext's LOAD_WORLD effect pushes
        // this world to the worker — even mid-tick, where sendCommand would
        // drop it and the in-flight WORLD_UPDATED would then silently
        // revert the player's load (WS3-04).
        uiWorldRevision: (state.uiWorldRevision ?? 0) + 1,
        playerHeyaId: action.world.playerHeyaId || null,
        playerOyakataId: action.world.playerHeyaId
          ? (action.world.heyas.get(action.world.playerHeyaId)?.oyakataId ?? null)
          : null,
        phase: action.world.playerHeyaId ? "interim" : "menu",
      };

    default:
      return state;
  }
}

const baseReducer = combineReducers<GameState, GameAction>([coreSlice, bashoSlice]);

/**
 * Combined Game Reducer — pure state transitions only.
 * Digest building is the responsibility of the UI layer (GameContext selector).
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  const next = baseReducer(state, action);
  if (next.world !== state.world) {
    return { ...next, digestStale: true };
  }
  return next;
}
