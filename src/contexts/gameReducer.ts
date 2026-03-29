// Game Reducer — pure state transitions using Slice Pattern
import type { GameState, GameAction } from "./gameTypes";
import { generateWorld } from "@/engine/worldgen";
import { combineReducers } from "./gameHelpers";

import { timeSlice } from "./timeSlice";
import { heyaSlice } from "./heyaSlice";
import { rosterSlice } from "./rosterSlice";
import { financeSlice } from "./financeSlice";
import { bashoSlice } from "./bashoSlice";
import { mediaSlice } from "./mediaSlice";
import { tickOrchestrator, cloneWorldForTick } from "@/engine/tick/tickOrchestrator";
import { advanceOneDay } from "@/engine/tick/tickDaily";

/** 
 * Core generic actions that don't fit cleanly into a domain slice 
 * or that create the initial world.
 */
function coreSlice(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "CREATE_WORLD": {
      const world = generateWorld({ seed: action.seed });
      const playerHeyaId = action.playerHeyaId || null;
      
      const nextWorld = { ...world, playerHeyaId: playerHeyaId || undefined };
      
      if (playerHeyaId) {
        const heya = world.heyas.get(playerHeyaId);
        if (heya) {
          const updatedHeya = { ...heya, isPlayerOwned: true };
          nextWorld.heyas = new Map(world.heyas);
          nextWorld.heyas.set(playerHeyaId, updatedHeya);
        }
      }
      
      return {
        ...state,
        world: nextWorld,
        playerHeyaId,
        phase: playerHeyaId ? "interim" : "menu",
      };
    }

    case "SET_PHASE":
      return { ...state, phase: action.phase };

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

    case "TICK_DAY":
      if (!state.world) return state;
      return {
        ...state,
        world: tickOrchestrator(state.world),
      };

    case "TICK_MULTIPLE_DAYS": {
      if (!state.world) return state;
      // Deep clone ONCE to enforce pure state transitions without massive memory bloat
      const nextWorld = cloneWorldForTick(state.world);
      for (let i = 0; i < action.payload.days; i++) {
        advanceOneDay(nextWorld);
      }
      return {
        ...state,
        world: nextWorld,
      };
    }

    default:
      return state;
  }
}

/**
 * Combined Game Reducer
 * Sequentially applies slice reducers to handle specific domains of the GameState.
 */
export const gameReducer = combineReducers<GameState, GameAction>([
  coreSlice,
  timeSlice,
  heyaSlice,
  rosterSlice,
  financeSlice,
  bashoSlice,
  mediaSlice,
]);
