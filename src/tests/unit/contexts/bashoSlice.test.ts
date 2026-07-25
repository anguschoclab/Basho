import { describe, it, expect, vi, beforeEach } from "vitest";
import { bashoSlice } from "@/contexts/bashoSlice";
import type { GameState, GameAction } from "@/contexts/gameTypes";
import * as gameHelpers from "@/contexts/gameHelpers";
import * as worldEngine from "@/engine/world";

// Mock dependencies
vi.mock("@/contexts/gameHelpers", () => ({
  autosaveWithSignal: vi.fn(),
}));

vi.mock("@/engine/world", () => ({
  advanceBashoDay: vi.fn((world: any) => ({
    ...world,
    currentBasho: { ...world.currentBasho, day: world.currentBasho.day + 1 },
  })),
  simulateBoutForToday: vi.fn((world: any) => ({
    world,
    result: { winnerId: "w1", loserId: "l1", kimarite: "yorikiri" },
  })),
  startBasho: vi.fn((world: any) => world),
  endBasho: vi.fn((world: any) => world),
  publishBanzukeUpdate: vi.fn(() => ({ type: "noop" })),
}));

describe("bashoSlice - autosave errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles autosave errors gracefully on ADVANCE_DAY (day <= 15)", () => {
    const mockAutosave = gameHelpers.autosaveWithSignal as ReturnType<typeof vi.fn>;
    mockAutosave.mockImplementation(() => {
      throw new Error("Disk full");
    });

    const initialState: Partial<GameState> = {
      world: {
        currentBasho: { day: 10, matches: [] },
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
    const mockAutosave = gameHelpers.autosaveWithSignal as ReturnType<typeof vi.fn>;
    mockAutosave.mockImplementation(() => {
      throw new Error("Disk full");
    });

    const initialState: Partial<GameState> = {
      world: {
        currentBasho: { day: 16, matches: [] },
      } as any,
    };

    const action: GameAction = { type: "ADVANCE_DAY" };

    const newState = bashoSlice(initialState as GameState, action);

    expect(mockAutosave).toHaveBeenCalled();
    expect(newState.phase).toBe("basho_results");
  });

  it("handles autosave errors gracefully on SIMULATE_ALL_BOUTS", () => {
    const mockAutosave = gameHelpers.autosaveWithSignal as ReturnType<typeof vi.fn>;
    mockAutosave.mockImplementation(() => {
      throw new Error("Disk full");
    });

    // Mock simulateBoutForToday to return a result with world updated (bout marked resolved)
    let callCount = 0;
    (worldEngine.simulateBoutForToday as ReturnType<typeof vi.fn>).mockImplementation((world: any) => {
      callCount++;
      const basho = world.currentBasho;
      if (!basho) return { world, result: null };
      // Mark the first unplayed match as resolved so the loop terminates
      const updatedMatches = basho.matches.map((m: any) =>
        m.day === basho.day && !m.result ? { ...m, result: { winnerId: "w1" } } : m
      );
      return {
        world: {
          ...world,
          currentBasho: { ...basho, matches: updatedMatches },
        },
        result: { winnerId: "w1", loserId: "l1", kimarite: "yorikiri" },
      };
    });

    const initialState: Partial<GameState> = {
      world: {
        currentBasho: { day: 10, matches: [{ day: 10, boutId: "b1", result: null }] },
      } as any,
      lastBoutResult: null,
      boutTactics: {},
    } as any;

    const action: GameAction = { type: "SIMULATE_ALL_BOUTS" };

    const newState = bashoSlice(initialState as GameState, action);

    expect(mockAutosave).toHaveBeenCalled();
    expect(newState.phase).toBe("day_results");
    expect(newState.lastBoutResult).not.toBeNull();
  });

  it("handles autosave errors gracefully on SIM_FULL_BASHO", () => {
    const mockAutosave = gameHelpers.autosaveWithSignal as ReturnType<typeof vi.fn>;
    mockAutosave.mockImplementation(() => {
      throw new Error("Disk full");
    });

    // Mock advanceBashoDay to increase day to terminate loop
    (worldEngine.advanceBashoDay as ReturnType<typeof vi.fn>).mockImplementation((world: any) => ({
      ...world,
      currentBasho: { ...world.currentBasho, day: world.currentBasho.day + 1 },
    }));

    // Mock simulateBoutForToday to return null result to skip internal loop
    (worldEngine.simulateBoutForToday as ReturnType<typeof vi.fn>).mockReturnValue({
      world: undefined as any,
      result: null,
    });

    const initialState: Partial<GameState> = {
      world: {
        currentBasho: { day: 10, matches: [] },
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
