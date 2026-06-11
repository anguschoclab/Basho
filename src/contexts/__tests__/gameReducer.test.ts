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
  it("MUST NOT mutate the previous state object on CREATE_WORLD", () => {
    const initialState = {
      ...initialGameState,
      world: generateInitialWorld("test-purity"),
    };

    mockBuildWeeklyDigest.mockReturnValue({} as any);

    const nextState = gameReducer(
      initialState,
      { type: "CREATE_WORLD", seed: "test-purity-new", playerHeyaId: undefined } as unknown as GameAction
    );

    expect(nextState).not.toBe(initialState);
    expect(nextState.world).not.toBe(initialState.world);
  });
});

describe("Game Reducer: Bulk Actions", () => {
  it("MUST set digestStale for bulk actions instead of rebuilding digest", () => {
    const initialState = {
      ...initialGameState,
      world: generateInitialWorld("test-batch"),
    };

    mockBuildWeeklyDigest.mockReturnValue({} as any);

    const nextState = gameReducer(initialState, {
      type: "ADVANCE_INTERIM",
      weeks: 2,
    } as unknown as GameAction);

    expect(nextState).not.toBe(initialState);
    expect(nextState.world).not.toBe(initialState.world);
    expect(nextState.digestStale).toBe(true);
    expect(nextState.digest).toBeNull();
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

    const nextState = gameReducer(
      initialState,
      { type: "CREATE_WORLD", seed: "test-error", playerHeyaId: undefined } as unknown as GameAction
    );

    expect(consoleSpy).toHaveBeenCalledWith("Error building weekly digest:", error);
    expect(nextState).not.toBe(initialState);
    expect(nextState.world).not.toBe(initialState.world);
    expect(nextState.digest).toBeNull();

    consoleSpy.mockRestore();
  });
});
