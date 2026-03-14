import { describe, it, expect, mock } from "bun:test";

// Mock rng.ts entirely
mock.module("../rng", () => ({
  rngFromSeed: () => ({
    next: () => 0.5,
    int: (min: number, max: number) => Math.floor(0.5 * (max - min + 1)) + min,
    bool: (p: number = 0.5) => 0.5 < p,
    pick: <T>(arr: T[]) => arr[0],
    shuffle: <T>(arr: T[]) => arr,
  }),
  rngForWorld: () => ({
    next: () => 0.5,
    int: (min: number, max: number) => Math.floor(0.5 * (max - min + 1)) + min,
    bool: (p: number = 0.5) => 0.5 < p,
    pick: <T>(arr: T[]) => arr[0],
    shuffle: <T>(arr: T[]) => arr,
  }),
}));

// Mock media.ts to avoid its dependencies
mock.module("../media", () => ({
  generateScandalHeadline: () => null,
}));

import { tickWeek, reportScandal, SCANDAL_DECAY_RATE, SCANDAL_WARNING_THRESHOLD, SCANDAL_PROBATION_THRESHOLD, SCANDAL_SANCTION_THRESHOLD } from "../governance";
import type { WorldState, Heya } from "../types";

function makeHeya(overrides: Partial<Heya> = {}): Heya {
  return {
    id: "test-heya",
    name: "Test Heya",
    oyakataId: "oyakata1",
    rikishiIds: [],
    statureBand: "established",
    prestigeBand: "respected",
    facilitiesBand: "adequate",
    koenkaiBand: "moderate",
    runwayBand: "comfortable",
    reputation: 50,
    funds: 10_000_000,
    scandalScore: 0,
    governanceStatus: "good_standing",
    governanceHistory: [],
    facilities: { training: 50, recovery: 50, nutrition: 50 },
    riskIndicators: { financial: false, governance: false, rivalry: false },
    ...overrides,
  } as Heya;
}

function makeWorld(heya: Heya): WorldState {
  return {
    seed: "test-seed",
    year: 2024,
    week: 1,
    calendar: { year: 2024, month: 1, currentWeek: 1, currentDay: 1 },
    heyas: new Map([[heya.id, heya]]),
    events: { version: "1.0.0", log: [], dedupe: {} },
    governanceLog: [],
    rikishi: new Map(),
    oyakata: new Map(),
  } as unknown as WorldState;
}

describe("Governance: tickWeek", () => {
  it("should decay scandal score", () => {
    const heya = makeHeya({ scandalScore: 10 });
    const world = makeWorld(heya);

    tickWeek(world);

    expect(heya.scandalScore).toBe(10 - SCANDAL_DECAY_RATE);
  });

  it("should not decay scandal score below 0", () => {
    const heya = makeHeya({ scandalScore: 0.2 });
    const world = makeWorld(heya);

    tickWeek(world);

    expect(heya.scandalScore).toBe(0);
  });

  it("should transition to warning status when threshold reached", () => {
    const heya = makeHeya({ scandalScore: SCANDAL_WARNING_THRESHOLD + 1 });
    const world = makeWorld(heya);

    tickWeek(world);

    expect(heya.governanceStatus).toBe("warning");
    expect(heya.riskIndicators.governance).toBe(false); // Warning is not yet true risk
  });

  it("should transition to probation status when threshold reached", () => {
    const heya = makeHeya({ scandalScore: SCANDAL_PROBATION_THRESHOLD + 1 });
    const world = makeWorld(heya);

    tickWeek(world);

    expect(heya.governanceStatus).toBe("probation");
    expect(heya.riskIndicators.governance).toBe(true);
  });

  it("should transition to sanctioned status when threshold reached", () => {
    const heya = makeHeya({ scandalScore: SCANDAL_SANCTION_THRESHOLD + 1 });
    const world = makeWorld(heya);

    tickWeek(world);

    expect(heya.governanceStatus).toBe("sanctioned");
    expect(heya.riskIndicators.governance).toBe(true);
  });

  it("should recover status as scandal decays", () => {
    const heya = makeHeya({
      scandalScore: SCANDAL_WARNING_THRESHOLD + SCANDAL_DECAY_RATE,
      governanceStatus: "warning"
    });
    const world = makeWorld(heya);

    // After 1 tick, scandalScore should be SCANDAL_WARNING_THRESHOLD
    tickWeek(world);
    expect(heya.scandalScore).toBe(SCANDAL_WARNING_THRESHOLD);
    expect(heya.governanceStatus).toBe("warning");

    // After another tick, scandalScore should be below threshold
    tickWeek(world);
    expect(heya.scandalScore).toBe(SCANDAL_WARNING_THRESHOLD - SCANDAL_DECAY_RATE);
    expect(heya.governanceStatus).toBe("good_standing");
  });

  it("should log events and rulings on status change", () => {
    const heya = makeHeya({
      scandalScore: SCANDAL_WARNING_THRESHOLD + 1,
      governanceStatus: "good_standing"
    });
    const world = makeWorld(heya);

    tickWeek(world);

    expect(world.events.log.length).toBeGreaterThan(0);
    expect(world.events.log[0].type).toBe("GOVERNANCE_STATUS_CHANGED");
    expect(world.governanceLog!.length).toBeGreaterThan(0);
    expect(heya.governanceHistory!.length).toBeGreaterThan(0);
  });
});

describe("Governance: reportScandal", () => {
  it("should return early and do nothing if heya is not found", () => {
    const heya = makeHeya();
    const world = makeWorld(heya);

    // Use an ID that doesn't exist in the world's heya map
    reportScandal(world, "non-existent-heya-id", "minor", "Test reason");

    // The heya should be untouched
    expect(heya.scandalScore).toBe(0);
    expect(heya.funds).toBe(10_000_000);
    expect(world.events.log.length).toBe(0);
    expect(world.governanceLog!.length).toBe(0);
  });

  it("should apply effects and log for a minor scandal", () => {
    const heya = makeHeya();
    const world = makeWorld(heya);

    reportScandal(world, heya.id, "minor", "Test minor reason");

    // heya.scandalScore is reduced by SCANDAL_DECAY_RATE because reportScandal
    // immediately calls processHeyaGovernance
    expect(heya.scandalScore).toBe(10 - SCANDAL_DECAY_RATE);
    expect(heya.funds).toBe(10_000_000 - 500_000);
    expect(world.events.log.length).toBeGreaterThan(0);
    expect(world.events.log[0].type).toBe("SCANDAL_REPORTED");
    expect(world.governanceLog!.length).toBeGreaterThan(0);
    expect(heya.governanceHistory!.length).toBeGreaterThan(0);
  });

  it("should apply effects and log for a major scandal", () => {
    const heya = makeHeya();
    const world = makeWorld(heya);

    reportScandal(world, heya.id, "major", "Test major reason");

    expect(heya.scandalScore).toBe(35 - SCANDAL_DECAY_RATE);
    expect(heya.funds).toBe(10_000_000 - 2_000_000);
    expect(world.events.log.length).toBeGreaterThan(0);
  });

  it("should apply effects and log for a critical scandal", () => {
    const heya = makeHeya();
    const world = makeWorld(heya);

    reportScandal(world, heya.id, "critical", "Test critical reason");

    expect(heya.scandalScore).toBe(60 - SCANDAL_DECAY_RATE);
    expect(heya.funds).toBe(10_000_000 - 10_000_000);
    expect(world.events.log.length).toBeGreaterThan(0);
  });
});
