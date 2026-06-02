// src/contexts/__tests__/gameReducer.test.ts
import { describe, it, expect, vi, type Mock } from "vitest";
import { gameReducer } from "../gameReducer";
import { initialGameState } from "../gameTypes";
import type { GameAction } from "../gameTypes";
import { generateInitialWorld } from "../../engine/systems/generation/WorldFactory";
import { buildWeeklyDigest } from "../../presenters/uiDigest";

vi.mock("../../presenters/uiDigest", () => ({
  buildWeeklyDigest: vi.fn(),
}));

const mockBuildWeeklyDigest = buildWeeklyDigest as Mock;

describe("Game Reducer Purity", () => {
  it("MUST NOT mutate the previous state object on TICK_DAY", () => {
    const initialState = {
      ...initialGameState,
      world: generateInitialWorld("test-purity"),
    };

    mockBuildWeeklyDigest.mockReturnValue({} as any);

    const nextState = gameReducer(initialState, { type: "TICK_DAY" } as unknown as GameAction);

    expect(nextState).not.toBe(initialState);
    expect(nextState.world).not.toBe(initialState.world);
    expect(nextState.world.dayIndexGlobal).toBe(initialState.world.dayIndexGlobal + 1);
  });
});

describe("Game Reducer: Batch Processing", () => {
  it("MUST process multiple days atomically without intermediate states", () => {
    const initialState = {
      ...initialGameState,
      world: generateInitialWorld("test-batch"),
    };

    const startDay = initialState.world.calendar!.currentDay;

    mockBuildWeeklyDigest.mockReturnValue({} as any);

    const nextState = gameReducer(initialState, {
      type: "TICK_MULTIPLE_DAYS",
      payload: { days: 5 }
    } as unknown as GameAction);

    expect(nextState).not.toBe(initialState);
    expect(nextState.world).not.toBe(initialState.world);
    expect(nextState.world.calendar!.currentDay).not.toBe(startDay);
  }, 30000);
});

describe("Game Reducer Error Handling", () => {
  it("MUST catch errors from buildWeeklyDigest and return next state without digest", () => {
    const initialState = {
      ...initialGameState,
      world: generateInitialWorld("test-error"),
    };

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("Digest failed");
    mockBuildWeeklyDigest.mockImplementation(() => {
      throw error;
    });

    const nextState = gameReducer(initialState, { type: "TICK_DAY" } as unknown as GameAction);

    expect(consoleSpy).toHaveBeenCalledWith("Error building weekly digest:", error);
    expect(nextState).not.toBe(initialState);
    expect(nextState.world).not.toBe(initialState.world);
    expect(nextState.digest).toBeNull();

    consoleSpy.mockRestore();
  });
});
