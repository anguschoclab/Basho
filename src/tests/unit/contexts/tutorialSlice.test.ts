import { describe, it, expect } from "vitest";
import { tutorialSlice } from "@/contexts/tutorialSlice";
import type { GameState, GameAction } from "@/contexts/gameTypes";
import type { WorldState } from "@/engine/types/world";
import { createDefaultTutorialState } from "@/engine/types/tutorial";

function mkState(world?: Partial<WorldState>): GameState {
  return {
    phase: "interim",
    world: world
      ? ({ ...world } as WorldState)
      : ({
          tutorialState: createDefaultTutorialState(),
        } as WorldState),
    digest: null,
    currentBoutIndex: 0,
    lastBoutResult: null,
    playerHeyaId: "h1",
    playerOyakataId: "o1",
    isAutoPlaying: false,
    boutTactics: {},
    digestStale: false,
  };
}

describe("tutorialSlice", () => {
  it("ADVANCE_TUTORIAL_STEP updates currentStep when tutorialState exists", () => {
    const state = mkState();
    const action: GameAction = {
      type: "ADVANCE_TUTORIAL_STEP",
      step: "FIRST_BASHO_STARTED",
    };
    const result = tutorialSlice(state, action);
    expect(result.world?.tutorialState?.currentStep).toBe("FIRST_BASHO_STARTED");
    expect(result.world?.tutorialState?.completed).toBe(false);
  });

  it("ADVANCE_TUTORIAL_STEP creates default state when tutorialState missing", () => {
    const state = mkState({} as Partial<WorldState>);
    const action: GameAction = {
      type: "ADVANCE_TUTORIAL_STEP",
      step: "TOUR_BANZUKE",
    };
    const result = tutorialSlice(state, action);
    expect(result.world?.tutorialState?.currentStep).toBe("TOUR_BANZUKE");
    expect(result.world?.tutorialState?.flags).toBeDefined();
    expect(result.world?.tutorialState?.flags.seenStaminaTooltip).toBe(false);
  });

  it("ADVANCE_TUTORIAL_STEP returns state unchanged when world is null", () => {
    const state: GameState = {
      phase: "menu",
      world: null,
      digest: null,
      currentBoutIndex: 0,
      lastBoutResult: null,
      playerHeyaId: null,
      playerOyakataId: null,
      isAutoPlaying: false,
      boutTactics: {},
      digestStale: false,
    };
    const action: GameAction = {
      type: "ADVANCE_TUTORIAL_STEP",
      step: "DONE",
    };
    const result = tutorialSlice(state, action);
    expect(result).toBe(state);
  });

  it("SET_TUTORIAL_FLAG sets a specific flag to true", () => {
    const state = mkState();
    const action: GameAction = {
      type: "SET_TUTORIAL_FLAG",
      flag: "seenStaminaTooltip",
    };
    const result = tutorialSlice(state, action);
    expect(result.world?.tutorialState?.flags.seenStaminaTooltip).toBe(true);
    expect(result.world?.tutorialState?.flags.seenGripTooltip).toBe(false);
  });

  it("SET_TUTORIAL_FLAG returns state unchanged when no tutorialState", () => {
    const state = mkState({} as Partial<WorldState>);
    const action: GameAction = {
      type: "SET_TUTORIAL_FLAG",
      flag: "seenGripTooltip",
    };
    const result = tutorialSlice(state, action);
    expect(result).toBe(state);
  });

  it("COMPLETE_TUTORIAL sets completed=true and currentStep=DONE", () => {
    const state = mkState();
    const action: GameAction = { type: "COMPLETE_TUTORIAL" };
    const result = tutorialSlice(state, action);
    expect(result.world?.tutorialState?.completed).toBe(true);
    expect(result.world?.tutorialState?.currentStep).toBe("DONE");
  });

  it("COMPLETE_TUTORIAL creates default flags when tutorialState missing", () => {
    const state = mkState({} as Partial<WorldState>);
    const action: GameAction = { type: "COMPLETE_TUTORIAL" };
    const result = tutorialSlice(state, action);
    expect(result.world?.tutorialState?.completed).toBe(true);
    expect(result.world?.tutorialState?.currentStep).toBe("DONE");
    expect(result.world?.tutorialState?.flags).toBeDefined();
  });

  it("COMPLETE_TUTORIAL returns state unchanged when world is null", () => {
    const state: GameState = {
      phase: "menu",
      world: null,
      digest: null,
      currentBoutIndex: 0,
      lastBoutResult: null,
      playerHeyaId: null,
      playerOyakataId: null,
      isAutoPlaying: false,
      boutTactics: {},
      digestStale: false,
    };
    const action: GameAction = { type: "COMPLETE_TUTORIAL" };
    const result = tutorialSlice(state, action);
    expect(result).toBe(state);
  });

  it("returns state unchanged for non-tutorial actions", () => {
    const state = mkState();
    const action: GameAction = { type: "SET_PHASE", phase: "interim" };
    const result = tutorialSlice(state, action);
    expect(result).toBe(state);
  });
});
