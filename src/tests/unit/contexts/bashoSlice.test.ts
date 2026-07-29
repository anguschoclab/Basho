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

    // Mock simulateBoutForToday to return a result with world updated (one bout at a time)
    (worldEngine.simulateBoutForToday as ReturnType<typeof vi.fn>).mockImplementation((world: any) => {
      const basho = world.currentBasho;
      if (!basho) return { world, result: null };
      // Find the first unplayed match for today and resolve only that one
      const matchIdx = basho.matches.findIndex((m: any) => m.day === basho.day && !m.result);
      if (matchIdx < 0) return { world, result: null };
      const updatedMatches = basho.matches.map((m: any, i: number) =>
        i === matchIdx ? { ...m, result: { winnerId: "w1" } } : m
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

    // Mock simulateBoutForToday to return null result (no matches to sim)
    (worldEngine.simulateBoutForToday as ReturnType<typeof vi.fn>).mockImplementation((world: any) => ({
      world,
      result: null,
    }));

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

  it("SIMULATE_ALL_BOUTS simulates multiple bouts and all are resolved", () => {
    const mockAutosave = gameHelpers.autosaveWithSignal as ReturnType<typeof vi.fn>;
    mockAutosave.mockImplementation(() => {});

    let callCount = 0;
    (worldEngine.simulateBoutForToday as ReturnType<typeof vi.fn>).mockImplementation((world: any) => {
      const basho = world.currentBasho;
      if (!basho) return { world, result: null };
      const matchIdx = basho.matches.findIndex((m: any) => m.day === basho.day && !m.result);
      if (matchIdx < 0) return { world, result: null };
      const updatedMatches = basho.matches.map((m: any, i: number) =>
        i === matchIdx ? { ...m, result: { winnerId: `w${callCount}` } } : m
      );
      callCount++;
      return {
        world: {
          ...world,
          currentBasho: { ...basho, matches: updatedMatches },
        },
        result: { winnerId: `w${callCount}`, loserId: "l1", kimarite: "yorikiri" },
      };
    });

    const initialState: Partial<GameState> = {
      world: {
        currentBasho: {
          day: 10,
          matches: [
            { day: 10, boutId: "b1", result: null },
            { day: 10, boutId: "b2", result: null },
            { day: 10, boutId: "b3", result: null },
          ],
        },
      } as any,
      lastBoutResult: null,
      boutTactics: {},
    } as any;

    const action: GameAction = { type: "SIMULATE_ALL_BOUTS" };
    const newState = bashoSlice(initialState as GameState, action);

    expect(callCount).toBe(3);
    expect(newState.phase).toBe("day_results");
    expect(newState.lastBoutResult).not.toBeNull();
    const allResolved = newState.world!.currentBasho!.matches.every(
      (m: any) => m.result !== null
    );
    expect(allResolved).toBe(true);
  });

  it("SIM_FULL_BASHO simulates bouts across multiple days with valid world", () => {
    const mockAutosave = gameHelpers.autosaveWithSignal as ReturnType<typeof vi.fn>;
    mockAutosave.mockImplementation(() => {});

    let simCallCount = 0;
    (worldEngine.simulateBoutForToday as ReturnType<typeof vi.fn>).mockImplementation((world: any) => {
      const basho = world.currentBasho;
      if (!basho) return { world, result: null };
      const matchIdx = basho.matches.findIndex((m: any) => m.day === basho.day && !m.result);
      if (matchIdx < 0) return { world, result: null };
      const updatedMatches = basho.matches.map((m: any, i: number) =>
        i === matchIdx ? { ...m, result: { winnerId: `w${simCallCount}` } } : m
      );
      simCallCount++;
      return {
        world: {
          ...world,
          currentBasho: { ...basho, matches: updatedMatches },
        },
        result: { winnerId: `w${simCallCount}`, loserId: "l1", kimarite: "yorikiri" },
      };
    });

    let advanceCallCount = 0;
    (worldEngine.advanceBashoDay as ReturnType<typeof vi.fn>).mockImplementation((world: any) => {
      advanceCallCount++;
      return {
        ...world,
        currentBasho: { ...world.currentBasho, day: world.currentBasho.day + 1 },
      };
    });

    const initialState: Partial<GameState> = {
      world: {
        currentBasho: {
          day: 14,
          matches: [
            { day: 14, boutId: "b14", result: null },
            { day: 15, boutId: "b15", result: null },
          ],
        },
      } as any,
      boutTactics: {},
    } as any;

    const action: GameAction = { type: "SIM_FULL_BASHO" };
    const newState = bashoSlice(initialState as GameState, action);

    expect(simCallCount).toBe(2);
    expect(advanceCallCount).toBe(1);
    expect(newState.phase).toBe("basho_results");
    expect(newState.world).toBeDefined();
    expect(newState.world!.currentBasho).toBeDefined();
    const allResolved = newState.world!.currentBasho!.matches.every(
      (m: any) => m.result !== null
    );
    expect(allResolved).toBe(true);
  });
});
