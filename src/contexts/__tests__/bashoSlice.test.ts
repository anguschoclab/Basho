import { describe, it, expect, vi, beforeEach } from "vitest";
import { bashoSlice } from "../bashoSlice";
import type { GameState, GameAction } from "../gameTypes";
import * as gameHelpers from "../gameHelpers";
import * as worldEngine from "../../engine/world";
import * as tickOrchestrator from "../../engine/tick/tickOrchestrator";

// Mock dependencies
vi.mock("../gameHelpers", async () => {
  const actual = await vi.importActual("../gameHelpers");
  return {
    ...actual,
    autosaveWithSignal: vi.fn(),
  };
});

vi.mock("../../engine/world", () => ({
  advanceBashoDay: vi.fn(),
  simulateBoutForToday: vi
    .fn()
    .mockReturnValue({
      result: { winnerId: "w1", loserId: "l1", kimarite: "yorikiri" },
    }),
}));

vi.mock("../../engine/tick/tickOrchestrator", () => ({
  cloneWorldForTick: vi.fn((world) => ({ ...world })),
}));

describe("bashoSlice - autosave errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles autosave errors gracefully on ADVANCE_DAY (day <= 15)", () => {
    const mockAutosave = vi.mocked(gameHelpers.autosaveWithSignal);
    mockAutosave.mockImplementation(() => {
      throw new Error("Disk full");
    });

    const initialState: Partial<GameState> = {
      world: {
        currentBasho: { day: 10 },
      } as any,
    };

    const action: GameAction = { type: "ADVANCE_DAY" };

    const newState = bashoSlice(initialState as GameState, action);

    expect(mockAutosave).toHaveBeenCalled();
    expect(newState.phase).toBe("day_preview");
    expect(newState.currentBoutIndex).toBe(0);
    expect(newState.lastBoutResult).toBeNull();
  });

  it("handles autosave errors gracefully on ADVANCE_DAY (day > 15)", () => {
    const mockAutosave = vi.mocked(gameHelpers.autosaveWithSignal);
    mockAutosave.mockImplementation(() => {
      throw new Error("Disk full");
    });

    const initialState: Partial<GameState> = {
      world: {
        currentBasho: { day: 16 },
      } as any,
    };

    const action: GameAction = { type: "ADVANCE_DAY" };

    const newState = bashoSlice(initialState as GameState, action);

    expect(mockAutosave).toHaveBeenCalled();
    expect(newState.phase).toBe("basho_results");
  });

  it("handles autosave errors gracefully on SIMULATE_ALL_BOUTS", () => {
    const mockAutosave = vi.mocked(gameHelpers.autosaveWithSignal);
    mockAutosave.mockImplementation(() => {
      throw new Error("Disk full");
    });

    // Mock simulateBoutForToday to return a result only once to avoid infinite loop
    let called = false;
    vi.mocked(worldEngine.simulateBoutForToday).mockImplementation(() => {
      if (!called) {
        called = true;
        return {
          result: { winnerId: "w1", loserId: "l1", kimarite: "yorikiri" },
        } as any;
      }
      return { result: null };
    });

    const initialState: Partial<GameState> = {
      world: {
        currentBasho: { day: 10 },
      } as any,
      lastBoutResult: null,
    };

    const action: GameAction = { type: "SIMULATE_ALL_BOUTS" };

    const newState = bashoSlice(initialState as GameState, action);

    expect(mockAutosave).toHaveBeenCalled();
    expect(newState.phase).toBe("day_results");
    expect(newState.lastBoutResult).not.toBeNull();
  });

  it("handles autosave errors gracefully on SIM_FULL_BASHO", () => {
    const mockAutosave = vi.mocked(gameHelpers.autosaveWithSignal);
    mockAutosave.mockImplementation(() => {
      throw new Error("Disk full");
    });

    // Mock advanceBashoDay to increase day to terminate loop
    vi.mocked(worldEngine.advanceBashoDay).mockImplementation((world: any) => {
      world.currentBasho.day += 1;
    });

    // Mock simulateBoutForToday to return null to skip internal loop
    vi.mocked(worldEngine.simulateBoutForToday).mockReturnValue({
      result: null,
    });

    const initialState: Partial<GameState> = {
      world: {
        currentBasho: { day: 10 },
      } as any,
    };

    const action: GameAction = { type: "SIM_FULL_BASHO" };

    const newState = bashoSlice(initialState as GameState, action);

    expect(mockAutosave).toHaveBeenCalled();
    expect(newState.phase).toBe("basho_results");
    expect(newState.currentBoutIndex).toBe(0);
    expect(newState.lastBoutResult).toBeNull();
  });
});
