import type { GameState, GameAction } from "./gameTypes";
import type { Reducer } from "./gameHelpers";
import { createDefaultTutorialState } from "@/engine/types/tutorial";

export const tutorialSlice: Reducer<GameState, GameAction> = (state, action) => {
  switch (action.type) {
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
                ...createDefaultTutorialState(),
                currentStep: action.step,
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
            ...(state.world.tutorialState ?? createDefaultTutorialState()),
            completed: true,
            currentStep: "DONE" as const,
          },
        },
      };
    }

    default:
      return state;
  }
};
