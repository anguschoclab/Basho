// Game Reducer — pure state transitions using Slice Pattern
import type { GameState, GameAction } from "./gameTypes";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";
import { combineReducers } from "./gameHelpers";
import { buildWeeklyDigest } from "@/presenters/uiDigest";
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
import { rosterSlice } from "./rosterSlice";
import { financeSlice } from "./financeSlice";
import { bashoSlice } from "./bashoSlice";
import { mediaSlice } from "./mediaSlice";
import { advanceOneDay } from "@/engine/tick";

/**
 * Core generic actions that don't fit cleanly into a domain slice
 * or that create the initial world.
 */
function coreSlice(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "CREATE_WORLD": {
      const world = generateWorld({ seed: action.seed });
      const playerHeyaId = action.playerHeyaId || null;

      let nextWorld = { ...world, playerHeyaId: playerHeyaId || undefined };

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

    case "SET_AUTO_PLAY":
      return { ...state, isAutoPlaying: action.value };

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

    case "TICK_DAY":
      if (!state.world) return state;
      return {
        ...state,
        world: advanceOneDay(state.world),
      };

    case "TICK_MULTIPLE_DAYS": {
      if (!state.world) return state;
      let currentWorld = state.world;
      for (let i = 0; i < action.payload.days; i++) {
        currentWorld = advanceOneDay(currentWorld);
      }
      return {
        ...state,
        world: currentWorld,
      };
    }

    case "ADVANCE_TUTORIAL_STEP": {
      if (!state.world) return state;
      const ts = state.world.tutorialState;
      return {
        ...state,
        world: {
          ...state.world,
          tutorialState: ts
            ? { ...ts, currentStep: action.step }
            : {
                completed: false,
                currentStep: action.step,
                flags: {
                  seenStaminaTooltip: false,
                  seenGripTooltip: false,
                  seenMomentumTooltip: false,
                  seenBashoRecordTooltip: false,
                  finishedExhibition: false,
                },
              },
        },
      };
    }

    case "SET_TUTORIAL_FLAG": {
      if (!state.world?.tutorialState) return state;
      return {
        ...state,
        world: {
          ...state.world,
          tutorialState: {
            ...state.world.tutorialState,
            flags: { ...state.world.tutorialState.flags, [action.flag]: true },
          },
        },
      };
    }

    case "COMPLETE_TUTORIAL": {
      if (!state.world) return state;
      return {
        ...state,
        world: {
          ...state.world,
          tutorialState: {
            ...(state.world.tutorialState ?? {
              flags: {
                seenStaminaTooltip: false,
                seenGripTooltip: false,
                seenMomentumTooltip: false,
                seenBashoRecordTooltip: false,
                finishedExhibition: false,
              },
            }),
            completed: true,
            currentStep: "DONE" as const,
          },
        },
      };
    }

    case "SET_IMPACTS": {
      const currentWeek = state.world?.week ?? 0;
      const newImpactEntry = { week: currentWeek, impacts: action.impacts };

      // Limit impact history to last 52 weeks
      const impactHistory = [...(state.impactHistory || []), newImpactEntry];
      const limitedHistory = impactHistory.slice(-52);

      return {
        ...state,
        lastImpacts: action.impacts,
        impactHistory: limitedHistory,
      };
    }

    default:
      return state;
  }
}

const baseReducer = combineReducers<GameState, GameAction>([
  coreSlice,
  timeSlice,
  heyaSlice,
  rosterSlice,
  financeSlice,
  bashoSlice,
  mediaSlice,
]);

/**
 * Combined Game Reducer — rebuilds UIDigest whenever the world changes.
 * This ensures InboxNewsTicker and other digest consumers always see fresh data.
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  const next = baseReducer(state, action);
  if (next.world !== state.world) {
    try {
      return { ...next, digest: buildWeeklyDigest(next.world) };
    } catch (error) {
      console.error("Error building weekly digest:", error);
      return next;
    }
  }
  return next;
}
