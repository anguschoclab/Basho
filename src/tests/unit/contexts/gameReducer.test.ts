// src/contexts/__tests__/gameReducer.test.ts
import { describe, it, expect } from "vitest";
import { gameReducer } from "@/contexts/gameReducer";
import { initialGameState } from "@/contexts/gameTypes";
import type { GameAction } from "@/contexts/gameTypes";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";

describe("Game Reducer Purity", () => {
  it("MUST NOT mutate the previous state object on CREATE_WORLD", () => {
    const initialState = {
      ...initialGameState,
      world: generateInitialWorld("test-purity"),
    };

    const nextState = gameReducer(initialState, {
      type: "CREATE_WORLD",
      seed: "test-purity-new",
      playerHeyaId: undefined,
    } as unknown as GameAction);

    expect(nextState).not.toBe(initialState);
    expect(nextState.world).not.toBe(initialState.world);
  });
});

describe("Game Reducer: World Change Flag", () => {
  it("MUST set digestStale when world changes", () => {
    const world = generateInitialWorld("test-stale");
    const initialState = { ...initialGameState, world };

    const nextState = gameReducer(initialState, {
      type: "UPDATE_WORLD",
      world: { ...world, week: world.week + 1 },
    } as GameAction);

    expect(nextState).not.toBe(initialState);
    expect(nextState.world).not.toBe(initialState.world);
    expect(nextState.digestStale).toBe(true);
    expect(nextState.digest).toBeNull();
  });

  it("MUST NOT set digestStale when world does not change", () => {
    const initialState = {
      ...initialGameState,
      world: generateInitialWorld("test-nochange"),
    };

    const nextState = gameReducer(initialState, {
      type: "SET_PHASE",
      phase: "menu",
    } as unknown as GameAction);

    expect(nextState).not.toBe(initialState);
    expect(nextState.world).toBe(initialState.world);
    expect(nextState.digestStale).toBe(false);
  });
});
