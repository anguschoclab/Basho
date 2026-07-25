import { describe, it, expect, vi, beforeEach } from "vitest";
import { bashoSlice } from "@/contexts/bashoSlice";
import type { GameState, GameAction } from "@/contexts/gameTypes";

vi.mock("@/contexts/gameHelpers", () => ({
  autosaveWithSignal: vi.fn(),
}));

vi.mock("@/engine/world", () => ({
  advanceBashoDay: vi.fn((world: any) => ({
    ...world,
    currentBasho: { ...world.currentBasho, day: world.currentBasho.day + 1 },
  })),
  simulateBoutForToday: vi.fn((world: any) => {
    const basho = world.currentBasho;
    if (!basho) return { world };
    const todays = (basho.matches ?? []).filter((m: any) => m.day === basho.day && !m.result);
    if (todays.length === 0) return { world };
    return {
      world: {
        ...world,
        currentBasho: {
          ...basho,
          matches: basho.matches.map((m: any) =>
            m.day === basho.day && !m.result ? { ...m, result: { winnerRikishiId: "r1" } } : m
          ),
        },
      },
      result: { winnerRikishiId: "r1" },
    };
  }),
  endBasho: vi.fn((world: any) => ({ ...world, currentBasho: undefined })),
}));

vi.mock("@/engine/tick/tickOrchestrator", () => ({
  cloneWorldForTick: vi.fn((world: any) => ({ ...world })),
}));

/**
 * P4.17: BashoSlice immutability tests.
 * Verifies that ADVANCE_DAY, SIMULATE_BOUT, and SIM_FULL_BASHO do not
 * mutate the input state.world.
 */

function makeState(day = 5): GameState {
  return {
    phase: "day_preview",
    boutTactics: {},
    world: {
      currentBasho: {
        day,
        matches: [
          { boutId: "b1", day, eastRikishiId: "r1", westRikishiId: "r2", result: undefined },
        ],
        standings: new Map(),
      },
    },
  } as unknown as GameState;
}

describe("P3.4: bashoSlice immutability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ADVANCE_DAY does not mutate state.world", () => {
    const state = makeState(5);
    const originalDay = (state.world as any).currentBasho.day;
    const originalMatches = (state.world as any).currentBasho.matches;

    bashoSlice(state, { type: "ADVANCE_DAY" } as GameAction);

    expect((state.world as any).currentBasho.day).toBe(originalDay);
    expect((state.world as any).currentBasho.matches).toBe(originalMatches);
  });

  it("SIMULATE_BOUT does not mutate state.world", () => {
    const state = makeState(5);
    const originalMatches = (state.world as any).currentBasho.matches;

    bashoSlice(state, { type: "SIMULATE_BOUT", boutIndex: 0 } as GameAction);

    expect((state.world as any).currentBasho.matches).toBe(originalMatches);
  });

  it("SIM_FULL_BASHO does not mutate state.world", () => {
    const state = makeState(1);
    const originalDay = (state.world as any).currentBasho.day;
    const originalMatches = (state.world as any).currentBasho.matches;

    bashoSlice(state, { type: "SIM_FULL_BASHO" } as GameAction);

    expect((state.world as any).currentBasho.day).toBe(originalDay);
    expect((state.world as any).currentBasho.matches).toBe(originalMatches);
  });
});
