// Game Reducer — pure state transitions using Slice Pattern
import type { GameState, GameAction } from "./gameTypes";
import type { WorldState } from "@/engine/types/world";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";
import { combineReducers } from "./gameHelpers";
import { applyOyakataCreationConfig } from "@/engine/systems/generation/applyOyakataConfig";

/** Adapter matching the { seed, playerConfig? } call shape used in this reducer */
function generateWorld(opts: {
  seed: string;
  playerConfig?: { heyaId?: string };
}): ReturnType<typeof generateInitialWorld> {
  return generateInitialWorld(opts.seed);
}

import { timeSlice } from "./timeSlice";
import { heyaSlice } from "./heyaSlice";
import { bashoSlice } from "./bashoSlice";

/**
 * Core generic actions that don't fit cleanly into a domain slice
 * or that create the initial world.
 */
function coreSlice(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "CREATE_WORLD": {
      const world = generateWorld({ seed: action.seed });
      const playerHeyaId = action.playerHeyaId || null;

      let nextWorld: WorldState = { ...world, playerHeyaId: playerHeyaId || undefined };

      if (playerHeyaId) {
        const heya = world.heyas.get(playerHeyaId);
        if (heya) {
          const updatedHeya = { ...heya, isPlayerOwned: true };
          nextWorld.heyas = new Map(world.heyas);
          nextWorld.heyas.set(playerHeyaId, updatedHeya);
        }

        // Apply player's oyakata creation config if provided
        if (action.oyakataConfig) {
          nextWorld = applyOyakataCreationConfig(nextWorld, playerHeyaId, action.oyakataConfig);
        }
      }

      // Cache player's oyakata ID for convenience (avoids re-deriving everywhere)
      const playerOyakataId = playerHeyaId
        ? (nextWorld.heyas.get(playerHeyaId)?.oyakataId ?? null)
        : null;

      return {
        ...state,
        world: nextWorld,
        playerHeyaId,
        playerOyakataId,
        phase: playerHeyaId ? "interim" : "menu",
      };
    }

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

const baseReducer = combineReducers<GameState, GameAction>([
  coreSlice,
  timeSlice,
  heyaSlice,
  bashoSlice,
]);

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
