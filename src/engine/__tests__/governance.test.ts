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
export const generateScandalHeadlineMock = mock(() => null);

mock.module("../media", () => ({
  generateScandalHeadline: generateScandalHeadlineMock,
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
  it("should process governance for all heyas in the world", () => {
    const heya1 = makeHeya({ id: "heya1", scandalScore: 10 });
    const heya2 = makeHeya({ id: "heya2", scandalScore: 20 });
    const world = makeWorld(heya1);
    world.heyas.set(heya2.id, heya2);

    tickWeek(world);

    expect(heya1.scandalScore).toBe(10 - SCANDAL_DECAY_RATE);
    expect(heya2.scandalScore).toBe(20 - SCANDAL_DECAY_RATE);
  });

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


  it("should catch errors from media generation and not throw", () => {
    generateScandalHeadlineMock.mockImplementationOnce(() => {
      throw new Error("API Limit Reached");
    });

    const heya = makeHeya({
      scandalScore: SCANDAL_PROBATION_THRESHOLD + 1,
      governanceStatus: "warning"
    });
    const world = makeWorld(heya);

    expect(() => tickWeek(world)).not.toThrow();

    // Verify it still updated the status
    expect(heya.governanceStatus).toBe("probation");
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


  it("should catch errors from media generation in reportScandal and not throw", () => {
    generateScandalHeadlineMock.mockImplementationOnce(() => {
      throw new Error("API Limit Reached");
    });

    const heya = makeHeya();
    const world = makeWorld(heya);

    expect(() => reportScandal(world, heya.id, "minor", "Test minor reason")).not.toThrow();

    // Verify it still applied effects
    expect(heya.scandalScore).toBe(10 - SCANDAL_DECAY_RATE);
    expect(heya.funds).toBe(10_000_000 - 500_000);
    expect(world.events.log.length).toBeGreaterThan(0);
    expect(heya.governanceHistory!.length).toBeGreaterThan(0);
  });





  it("should apply effects and log for a critical scandal", () => {
    const heya = makeHeya();
    const world = makeWorld(heya);

    reportScandal(world, heya.id, "critical", "Test critical reason");

    expect(heya.scandalScore).toBe(60 - SCANDAL_DECAY_RATE);
    expect(heya.funds).toBe(10_000_000 - 10_000_000);
    expect(world.events.log.length).toBeGreaterThan(0);
  });

  it("should not halt scandal reporting when generateScandalHeadline throws an error", () => {
    // Mock the media generation to throw an error
    generateScandalHeadlineMock.mockImplementationOnce(() => {
      throw new Error("Simulated media generation failure");
    });

    const heya = makeHeya({ scandalScore: 0, funds: 1_000_000 });
    const world = makeWorld(heya);

    // Call reportScandal and ensure it does not throw
    expect(() => {
      reportScandal(world, heya.id, "minor", "Test try/catch");
    }).not.toThrow();

    // Verify side effects still happen
    expect(heya.scandalScore).toBe(10 - SCANDAL_DECAY_RATE);
    expect(heya.funds).toBe(1_000_000 - 500_000);
    expect(world.events.log.some(e => e.type === "SCANDAL_REPORTED")).toBe(true);
    expect(heya.governanceHistory!.length).toBeGreaterThan(0);
  });
});

describe("Governance: Public Helpers", () => {
  describe("getStatusLabel", () => {
    it("should return correct label for each status", () => {
      const { getStatusLabel } = require("../governance");
      expect(getStatusLabel("good_standing")).toBe("Good Standing");
      expect(getStatusLabel("warning")).toBe("Under Review");
      expect(getStatusLabel("probation")).toBe("Probation");
      expect(getStatusLabel("sanctioned")).toBe("Sanctioned");
    });
  });

  describe("getStatusColor", () => {
    it("should return correct tailwind color class for each status", () => {
      const { getStatusColor } = require("../governance");
      expect(getStatusColor("good_standing")).toBe("text-green-600");
      expect(getStatusColor("warning")).toBe("text-yellow-600");
      expect(getStatusColor("probation")).toBe("text-orange-600");
      expect(getStatusColor("sanctioned")).toBe("text-red-600");
    });
  });
});
