import { describe, it, expect } from "vitest";
import {
  computeInjuryPressure,
  calculateWeeklyWelfareDelta,
  getSeverityWeight,
} from "../WelfareCalculations";
import { mockRikishi } from "../../../__tests__/utils";
import type { WorldState } from "../../../types/world";
import type { Heya } from "../../../types/heya";
import type { WelfareState } from "../../../types/economy";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWorld(overrides: Partial<WorldState> = {}): WorldState {
  return {
    rikishi: new Map(),
    heyas: new Map(),
    staff: new Map(),
    events: { log: [], pendingEvents: [] } as any,
    history: [],
    oyakata: new Map(),
    historicalRikishi: new Map(),
    ftue: {} as any,
    calendar: { year: 2025, month: 1, currentWeek: 1, currentDay: 1 },
    year: 2025,
    week: 1,
    dayIndexGlobal: 0,
    id: "test-world",
    seed: "test",
    cyclePhase: "interim",
    records: {} as any,
    settings: { archiveMode: "standard" },
    ...overrides,
  } as unknown as WorldState;
}

function makeHeya(id: string, overrides: Partial<Heya> = {}): Heya {
  return {
    id,
    name: `Heya-${id}`,
    rikishiIds: [],
    facilities: { recovery: 50, nutrition: 50, training: 50, dojo: 50 },
    ...overrides,
  } as unknown as Heya;
}

function makeWelfareState(overrides: Partial<WelfareState> = {}): WelfareState {
  return {
    riskScore: 0,
    activeDiet: "maintenance",
    complianceLevel: "compliant",
    ...overrides,
  } as unknown as WelfareState;
}

// ---------------------------------------------------------------------------
// getSeverityWeight
// ---------------------------------------------------------------------------

describe("getSeverityWeight", () => {
  it("returns 8 for serious/high/3", () => {
    expect(getSeverityWeight("serious")).toBe(8);
    expect(getSeverityWeight("high")).toBe(8);
    expect(getSeverityWeight(3)).toBe(8);
  });

  it("returns 4 for moderate/medium/2", () => {
    expect(getSeverityWeight("moderate")).toBe(4);
    expect(getSeverityWeight("medium")).toBe(4);
    expect(getSeverityWeight(2)).toBe(4);
  });

  it("returns 2 for unknown/mild/1", () => {
    expect(getSeverityWeight("mild")).toBe(2);
    expect(getSeverityWeight(1)).toBe(2);
    expect(getSeverityWeight(undefined)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// computeInjuryPressure
// ---------------------------------------------------------------------------

describe("computeInjuryPressure", () => {
  it("returns zero pressure when no rikishi are injured", () => {
    const r = mockRikishi("r1", { heyaId: "h1", injured: false });
    const heya = makeHeya("h1", { rikishiIds: ["r1"] });
    const world = makeWorld({ rikishi: new Map([["r1", r]]) });
    const result = computeInjuryPressure(world, heya);
    expect(result.pressure).toBe(0);
    expect(result.seriousCount).toBe(0);
    expect(result.negligenceCount).toBe(0);
  });

  it("returns pressure = 8 for one seriously-injured rikishi", () => {
    const r = mockRikishi("r1", {
      heyaId: "h1",
      injured: true,
      injuryStatus: { isInjured: true, severity: "serious" } as any,
    });
    const heya = makeHeya("h1", { rikishiIds: ["r1"] });
    const world = makeWorld({ rikishi: new Map([["r1", r]]) });
    const result = computeInjuryPressure(world, heya);
    expect(result.pressure).toBe(8);
    expect(result.seriousCount).toBe(1);
  });

  it("counts negligence when harsh intensity + injured + no protect focus", () => {
    const r = mockRikishi("r1", {
      heyaId: "h1",
      injured: true,
      injuryStatus: { isInjured: true, severity: "moderate" } as any,
    });
    const heya = makeHeya("h1", { rikishiIds: ["r1"] });
    const world = makeWorld({
      rikishi: new Map([["r1", r]]),
      trainingState: new Map([
        [
          "h1",
          {
            activeProfile: { intensity: "punishing", recovery: "normal" },
            focusSlots: [],
          },
        ],
      ]) as any,
    });
    const result = computeInjuryPressure(world, heya);
    expect(result.negligenceCount).toBe(1);
  });

  it("does NOT count negligence when rikishi is on protect focus", () => {
    const r = mockRikishi("r1", {
      heyaId: "h1",
      injured: true,
      injuryStatus: { isInjured: true, severity: "moderate" } as any,
    });
    const heya = makeHeya("h1", { rikishiIds: ["r1"] });
    const world = makeWorld({
      rikishi: new Map([["r1", r]]),
      trainingState: new Map([
        [
          "h1",
          {
            activeProfile: { intensity: "punishing", recovery: "normal" },
            focusSlots: [{ rikishiId: "r1", focusType: "protect" }],
          },
        ],
      ]) as any,
    });
    const result = computeInjuryPressure(world, heya);
    expect(result.negligenceCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculateWeeklyWelfareDelta
// ---------------------------------------------------------------------------

describe("calculateWeeklyWelfareDelta", () => {
  it("returns positive delta for punishing intensity", () => {
    const heya = makeHeya("h1");
    const world = makeWorld({
      trainingState: new Map([
        [
          "h1",
          {
            activeProfile: { intensity: "punishing", recovery: "normal" },
            focusSlots: [],
          },
        ],
      ]) as any,
    });
    const welfare = makeWelfareState();
    const { delta } = calculateWeeklyWelfareDelta(world, heya, welfare);
    expect(delta).toBeGreaterThan(0);
  });

  it("delta decreases with premium diet", () => {
    const heya = makeHeya("h1");
    const world = makeWorld({
      trainingState: new Map([
        [
          "h1",
          {
            activeProfile: { intensity: "balanced", recovery: "normal" },
            focusSlots: [],
          },
        ],
      ]) as any,
    });
    const premiumWelfare = makeWelfareState({ activeDiet: "premium" });
    const maintenanceWelfare = makeWelfareState({ activeDiet: "maintenance" });
    const { delta: premDelta } = calculateWeeklyWelfareDelta(world, heya, premiumWelfare);
    const { delta: maintDelta } = calculateWeeklyWelfareDelta(world, heya, maintenanceWelfare);
    expect(premDelta).toBeLessThan(maintDelta);
  });

  it("includes healthy_drift-2 reason when all-clear conditions met", () => {
    const heya = makeHeya("h1");
    const world = makeWorld({
      trainingState: new Map([
        [
          "h1",
          {
            activeProfile: { intensity: "balanced", recovery: "normal" },
            focusSlots: [],
          },
        ],
      ]) as any,
    });
    const welfare = makeWelfareState();
    const { reasons } = calculateWeeklyWelfareDelta(world, heya, welfare);
    expect(reasons).toContain("healthy_drift-2");
  });

  it("adds negligence penalty to reasons when applicable", () => {
    const r = mockRikishi("r1", {
      heyaId: "h1",
      injured: true,
      injuryStatus: { isInjured: true, severity: "moderate" } as any,
    });
    const heya = makeHeya("h1", { rikishiIds: ["r1"] });
    const world = makeWorld({
      rikishi: new Map([["r1", r]]),
      trainingState: new Map([
        [
          "h1",
          {
            activeProfile: { intensity: "punishing", recovery: "normal" },
            focusSlots: [],
          },
        ],
      ]) as any,
    });
    const welfare = makeWelfareState();
    const { reasons } = calculateWeeklyWelfareDelta(world, heya, welfare);
    expect(reasons.some((r) => r.startsWith("negligence+"))).toBe(true);
  });
});
