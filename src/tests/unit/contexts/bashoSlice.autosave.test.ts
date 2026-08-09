/**
 * Autosave Effect Migration Tests (B4.1.2)
 * Verifies that bashoSlice no longer calls autosaveWithSignal (reducer purity).
 */

import { describe, it, expect, vi } from "vitest";
import { initialGameState, type GameState, type GameAction } from "@/contexts/gameTypes";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";

// Use vi.hoisted to ensure mock is available before module imports
const { mockAutosave } = vi.hoisted(() => ({
  mockAutosave: vi.fn(),
}));

vi.mock("@/contexts/gameHelpers", () => ({
  autosaveWithSignal: mockAutosave,
  getMatchesForDay: vi.fn(() => []),
  applyImpact: vi.fn((state: unknown) => state),
  combineReducers: vi.fn((slices: unknown[]) => slices[0]),
}));

vi.mock("@/engine/world", () => ({
  startBasho: vi.fn((world: unknown) => world),
  advanceBashoDay: vi.fn((world: any) => ({
    ...world,
    currentBasho: { ...world.currentBasho, day: (world.currentBasho?.day ?? 0) + 1 },
  })),
  simulateBoutForToday: vi.fn((world: unknown) => ({ world, result: null })),
  endBasho: vi.fn((world: unknown) => world),
  publishBanzukeUpdate: vi.fn(() => ({
    metadata: { source: "test" },
    entities: {},
    worldFields: {},
  })),
}));

vi.mock("@/engine/core/ImpactResolver", () => ({
  resolveImpacts: vi.fn((world: unknown) => world),
}));

// Import after mocks are set up
const { bashoSlice } = await import("@/contexts/bashoSlice");

function makeState(): GameState {
  const world = MockFactory.createWorld({
    currentBasho: MockFactory.createBasho({ day: 5, isActive: true }),
  });
  return {
    ...initialGameState,
    world,
    phase: "day_preview",
  };
}

describe("Autosave effect migration (B4.1.2)", () => {
  it("ADVANCE_DAY does not call autosaveWithSignal (reducer purity)", () => {
    mockAutosave.mockClear();
    bashoSlice(makeState(), { type: "ADVANCE_DAY" } as GameAction);

    expect(mockAutosave).not.toHaveBeenCalled();
  });

  it("SIMULATE_ALL_BOUTS does not call autosaveWithSignal", () => {
    mockAutosave.mockClear();
    bashoSlice(makeState(), { type: "SIMULATE_ALL_BOUTS" } as GameAction);

    expect(mockAutosave).not.toHaveBeenCalled();
  });

  it("SIM_FULL_BASHO does not call autosaveWithSignal", () => {
    mockAutosave.mockClear();
    bashoSlice(makeState(), { type: "SIM_FULL_BASHO" } as GameAction);

    expect(mockAutosave).not.toHaveBeenCalled();
  });
});
