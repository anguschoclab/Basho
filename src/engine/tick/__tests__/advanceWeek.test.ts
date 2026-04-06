/**
 * advanceWeek.test.ts — Integration tests for weekly training pipeline consequences.
 * Tests TrainingService.applyWeeklyTraining() with realistic world state.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { TrainingService } from "../../systems/training/TrainingService";
import { mockRikishi } from "../../__tests__/utils";
import type { WorldState } from "../../types/world";
import type { BeyaTrainingState, IndividualFocus } from "../../types/training";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMinimalWorld(overrides: Partial<WorldState> = {}): WorldState {
  return {
    rikishi: new Map(),
    historicalRikishi: new Map(),
    heyas: new Map(),
    staff: new Map(),
    oyakata: new Map(),
    events: { log: [], pendingEvents: [] } as any,
    history: [],
    ftue: {} as any,
    calendar: { year: 2025, month: 1, currentWeek: 1, currentDay: 1 },
    year: 2025,
    week: 1,
    dayIndexGlobal: 0,
    id: "world-test",
    seed: "test",
    cyclePhase: "interim",
    records: {} as any,
    settings: { archiveMode: "standard" },
    ...overrides,
  } as unknown as WorldState;
}

function makeTrainingState(
  heyaId: string,
  intensity: string,
  recovery: string,
  focusSlots: IndividualFocus[] = []
): Record<string, BeyaTrainingState> {
  return {
    [heyaId]: {
      heyaId,
      activeProfile: {
        id: "default",
        name: "Default",
        intensity,
        recovery,
        volume: "normal",
        // "neutral" is a valid TrainingFocus key in FOCUS_BIAS_MATRIX
        focus: "neutral",
      },
      focusSlots,
      weeklyHistory: [],
    } as unknown as BeyaTrainingState,
  };
}

// ---------------------------------------------------------------------------
// Injured + protect focus → fatigue DECREASES
// ---------------------------------------------------------------------------

describe("TrainingService.applyWeeklyTraining — injured rikishi on protect focus", () => {
  it("reduces fatigue when injured rikishi has protect focus", () => {
    const rikishi = mockRikishi("r1", {
      heyaId: "h1",
      injured: true,
      fatigue: 60,
    });
    const heya = { id: "h1", name: "TestHeya", rikishiIds: ["r1"] } as any;

    const focusSlots: IndividualFocus[] = [
      { rikishiId: "r1", focusType: "protect" } as IndividualFocus,
    ];

    const world = makeMinimalWorld({
      rikishi: new Map([["r1", rikishi]]),
      heyas: new Map([["h1", heya]]),
      trainingState: makeTrainingState("h1", "balanced", "normal", focusSlots) as any,
    });

    TrainingService.applyWeeklyTraining(world);

    const updated = world.rikishi.get("r1")!;
    expect(updated.fatigue).toBeLessThan(60);
  });

  it("reduces fatigue when injured rikishi has rebuild focus", () => {
    const rikishi = mockRikishi("r1", {
      heyaId: "h1",
      injured: true,
      fatigue: 70,
    });
    const heya = { id: "h1", name: "TestHeya", rikishiIds: ["r1"] } as any;

    const focusSlots: IndividualFocus[] = [
      { rikishiId: "r1", focusType: "rebuild" } as IndividualFocus,
    ];

    const world = makeMinimalWorld({
      rikishi: new Map([["r1", rikishi]]),
      heyas: new Map([["h1", heya]]),
      trainingState: makeTrainingState("h1", "balanced", "high", focusSlots) as any,
    });

    TrainingService.applyWeeklyTraining(world);

    const updated = world.rikishi.get("r1")!;
    expect(updated.fatigue).toBeLessThan(70);
  });
});

// ---------------------------------------------------------------------------
// Injured + no protect focus + punishing intensity → fatigue INCREASES
// ---------------------------------------------------------------------------

describe("TrainingService.applyWeeklyTraining — injured rikishi with no protection", () => {
  it("still accumulates fatigue when injured with no protect/rebuild focus", () => {
    const rikishi = mockRikishi("r1", {
      heyaId: "h1",
      injured: true,
      fatigue: 60,
    });
    const heya = { id: "h1", name: "TestHeya", rikishiIds: ["r1"] } as any;

    // No focus slots for this rikishi
    const world = makeMinimalWorld({
      rikishi: new Map([["r1", rikishi]]),
      heyas: new Map([["h1", heya]]),
      trainingState: makeTrainingState("h1", "punishing", "low") as any,
    });

    TrainingService.applyWeeklyTraining(world);

    const updated = world.rikishi.get("r1")!;
    // Fatigue should stay the same or increase — not decrease
    expect(updated.fatigue).toBeGreaterThanOrEqual(60);
  });
});

// ---------------------------------------------------------------------------
// Healthy rikishi — growth applies, fatigue within bounds
// ---------------------------------------------------------------------------

describe("TrainingService.applyWeeklyTraining — healthy rikishi growth", () => {
  it("does not apply growth to injured rikishi", () => {
    const rikishi = mockRikishi("r1", {
      heyaId: "h1",
      injured: true,
      power: 60,
    });
    const heya = { id: "h1", name: "TestHeya", rikishiIds: ["r1"] } as any;

    const world = makeMinimalWorld({
      rikishi: new Map([["r1", rikishi]]),
      heyas: new Map([["h1", heya]]),
      trainingState: makeTrainingState("h1", "intensive", "normal") as any,
    });

    const powerBefore = rikishi.power;
    TrainingService.applyWeeklyTraining(world);
    const updated = world.rikishi.get("r1")!;

    // Power should NOT change for injured rikishi
    expect(updated.power).toBe(powerBefore);
  });

  it("keeps fatigue within [0, 100] bounds", () => {
    const rikishi = mockRikishi("r1", {
      heyaId: "h1",
      injured: false,
      fatigue: 95,
    });
    const heya = { id: "h1", name: "TestHeya", rikishiIds: ["r1"] } as any;

    const world = makeMinimalWorld({
      rikishi: new Map([["r1", rikishi]]),
      heyas: new Map([["h1", heya]]),
      trainingState: makeTrainingState("h1", "punishing", "low") as any,
    });

    TrainingService.applyWeeklyTraining(world);
    const updated = world.rikishi.get("r1")!;
    expect(updated.fatigue).toBeLessThanOrEqual(100);
    expect(updated.fatigue).toBeGreaterThanOrEqual(0);
  });
});
