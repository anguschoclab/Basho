/**
 * facilities.test.ts
 * Tests for the facility management and economics engine
 */

import { describe, it, expect } from "vitest";

import {
  computeFacilitiesBand,
  updateFacilitiesBand,
  investInFacility,
  tickMonthly,
  getUpgradeCostEstimate,
  getMonthlyMaintenanceCost,
  type FacilityAxis,
} from "../facilities";
import { tickWeek as economicsTickWeek } from "../economics";
import type { WorldState } from "../types/world";
import type { Heya } from "../types/heya";
import type { Oyakata } from "../types/oyakata";

// ============================================================================
// TEST HELPERS
// ============================================================================

function makeHeya(overrides: Partial<Heya> = {}): Heya {
  return {
    id: "test-heya",
    name: "Test Heya",
    oyakataId: "oyakata1",
    rikishiIds: ["r1", "r2"],
    statureBand: "established",
    prestigeBand: "respected",
    facilitiesBand: "adequate",
    koenkaiBand: "moderate",
    runwayBand: "comfortable",
    reputation: 50,
    funds: 10_000_000,
    scandalScore: 0,
    governanceStatus: "good_standing",
    facilities: { training: 50, recovery: 50, nutrition: 50 },
    riskIndicators: { financial: false, governance: false, rivalry: false },
    ...overrides,
  } as Heya;
}

function makeOyakata(overrides: Partial<Oyakata> = {}): Oyakata {
  return {
    id: "oyakata1",
    heyaId: "test-heya",
    name: "Test Oyakata",
    age: 55,
    archetype: "traditionalist",
    traits: { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 },
    yearsInCharge: 10,
    ...overrides,
  } as Oyakata;
}

function makeWorld(heyaOverrides: Partial<Heya> = {}, opts: { playerOwned?: boolean; oyakataOverrides?: Partial<Oyakata> } = {}): WorldState {
  const heya = makeHeya(heyaOverrides);
  const oyakata = makeOyakata(opts.oyakataOverrides);

  const rikishiMap = new Map();
  for (const rId of heya.rikishiIds) {
    rikishiMap.set(rId, {
      id: rId,
      shikona: `Rikishi-${rId}`,
      rank: "maegashira",
      division: "makuuchi",
      side: "east",
      heyaId: heya.id,
      fatigue: 10,
      injured: false,
      isRetired: false,
    });
  }

  return {
    seed: 42,
    year: 2025,
    week: 10,
    dayIndexGlobal: 70,
    calendar: { year: 2025, month: 3, currentDay: 15, currentWeek: 10 },
    cyclePhase: "interim",
    currentBashoName: "haru",
    currentBasho: null,
    rikishi: rikishiMap,
    heyas: new Map([[heya.id, heya]]),
    oyakata: new Map([[oyakata.id, oyakata]]),
    playerHeyaId: opts.playerOwned !== false ? heya.id : "other-heya",
    events: { version: "1.0.0", log: [], dedupe: {} },
    rivalriesState: { pairs: [], lastUpdatedWeek: 0, nextRivalryId: 1 },
  } as unknown as WorldState;
}

// ============================================================================
// FACILITIES BAND
// ============================================================================

describe("Facilities: Band Calculation", () => {
  it("should compute world_class for avg >= 85", () => {
    const heya = makeHeya({ facilities: { training: 90, recovery: 85, nutrition: 85 } });
    expect(computeFacilitiesBand(heya)).toBe("world_class");
  });

  it("should compute excellent for avg >= 65", () => {
    const heya = makeHeya({ facilities: { training: 70, recovery: 65, nutrition: 70 } });
    expect(computeFacilitiesBand(heya)).toBe("excellent");
  });

  it("should compute adequate for avg >= 45", () => {
    const heya = makeHeya({ facilities: { training: 50, recovery: 45, nutrition: 50 } });
    expect(computeFacilitiesBand(heya)).toBe("adequate");
  });

  it("should compute basic for avg >= 25", () => {
    const heya = makeHeya({ facilities: { training: 30, recovery: 25, nutrition: 30 } });
    expect(computeFacilitiesBand(heya)).toBe("basic");
  });

  it("should compute minimal for avg < 25", () => {
    const heya = makeHeya({ facilities: { training: 10, recovery: 10, nutrition: 10 } });
    expect(computeFacilitiesBand(heya)).toBe("minimal");
  });

  describe("updateFacilitiesBand updates heya.facilitiesBand correctly", () => {
    it("should set to world_class for exactly 85 average", () => {
      const heya = makeHeya({ facilities: { training: 85, recovery: 85, nutrition: 85 }, facilitiesBand: "minimal" });
      updateFacilitiesBand(heya);
      expect(heya.facilitiesBand).toBe("world_class");
    });

    it("should set to excellent for exactly 65 average", () => {
      const heya = makeHeya({ facilities: { training: 65, recovery: 65, nutrition: 65 }, facilitiesBand: "minimal" });
      updateFacilitiesBand(heya);
      expect(heya.facilitiesBand).toBe("excellent");
    });

    it("should set to adequate for exactly 45 average", () => {
      const heya = makeHeya({ facilities: { training: 45, recovery: 45, nutrition: 45 }, facilitiesBand: "minimal" });
      updateFacilitiesBand(heya);
      expect(heya.facilitiesBand).toBe("adequate");
    });

    it("should set to basic for exactly 25 average", () => {
      const heya = makeHeya({ facilities: { training: 25, recovery: 25, nutrition: 25 }, facilitiesBand: "minimal" });
      updateFacilitiesBand(heya);
      expect(heya.facilitiesBand).toBe("basic");
    });

    it("should set to minimal for less than 25 average", () => {
      const heya = makeHeya({ facilities: { training: 24, recovery: 24, nutrition: 24 }, facilitiesBand: "world_class" });
      updateFacilitiesBand(heya);
      expect(heya.facilitiesBand).toBe("minimal");
    });
  });
});

// ============================================================================
// FACILITY INVESTMENT
// ============================================================================

describe("Facilities: Investment", () => {
  it("should upgrade facility and deduct funds", () => {
    const world = makeWorld({ funds: 5_000_000, facilities: { training: 30, recovery: 30, nutrition: 30 } });
    const result = investInFacility(world, "test-heya", "training", 5);

    expect(result.success).toBe(true);
    expect(result.newLevel).toBe(35);
    expect(result.cost).toBeGreaterThan(0);

    const heya = world.heyas.get("test-heya")!;
    expect(heya.funds).toBeLessThan(5_000_000);
    expect(heya.facilities.training).toBe(35);
  });

  it("should fail if funds are insufficient", () => {
    const world = makeWorld({ funds: 100, facilities: { training: 30, recovery: 30, nutrition: 30 } });
    const result = investInFacility(world, "test-heya", "training", 5);

    expect(result.success).toBe(false);
    expect(result.reason).toContain("Insufficient");
  });

  it("should fail if already at max level", () => {
    const world = makeWorld({ facilities: { training: 100, recovery: 50, nutrition: 50 } });
    const result = investInFacility(world, "test-heya", "training", 5);

    expect(result.success).toBe(false);
    expect(result.reason).toContain("maximum");
  });

  it("should cap upgrade at MAX_FACILITY (100)", () => {
    const world = makeWorld({ funds: 50_000_000, facilities: { training: 98, recovery: 50, nutrition: 50 } });
    const result = investInFacility(world, "test-heya", "training", 5);

    expect(result.success).toBe(true);
    expect(result.newLevel).toBe(100);
  });

  it("should update facilitiesBand after upgrade", () => {
    const world = makeWorld({
      funds: 50_000_000,
      facilities: { training: 83, recovery: 85, nutrition: 85 },
      facilitiesBand: "excellent",
    });
    investInFacility(world, "test-heya", "training", 5);

    const heya = world.heyas.get("test-heya")!;
    expect(heya.facilitiesBand).toBe("world_class");
  });

  it("should return error for unknown heya", () => {
    const world = makeWorld();
    const result = investInFacility(world, "nonexistent-heya", "training", 5);
    expect(result.success).toBe(false);
    expect(result.reason).toContain("not found");
  });

  it("should scale cost with facility level", () => {
    const lowHeya = makeHeya({ facilities: { training: 20, recovery: 50, nutrition: 50 } });
    const highHeya = makeHeya({ facilities: { training: 85, recovery: 50, nutrition: 50 } });

    const lowCost = getUpgradeCostEstimate(lowHeya, "training", 5);
    const highCost = getUpgradeCostEstimate(highHeya, "training", 5);

    expect(highCost).toBeGreaterThan(lowCost);
  });
});

// ============================================================================
// MONTHLY MAINTENANCE & DECAY
// ============================================================================

describe("Facilities: Monthly Tick", () => {
  it("should deduct maintenance costs when heya can afford it", () => {
    const world = makeWorld({ funds: 10_000_000, facilities: { training: 50, recovery: 50, nutrition: 50 } }, { playerOwned: false });
    const initialFunds = world.heyas.get("test-heya")!.funds;

    tickMonthly(world);

    const heya = world.heyas.get("test-heya")!;
    expect(heya.funds).toBeLessThan(initialFunds);
    // Facilities should NOT decay (maintenance paid)
    expect(heya.facilities.training).toBeGreaterThanOrEqual(50);
  });

  it("should decay facilities when heya cannot afford maintenance", () => {
    const world = makeWorld({ funds: 0, facilities: { training: 50, recovery: 50, nutrition: 50 } }, { playerOwned: false });

    tickMonthly(world);

    const heya = world.heyas.get("test-heya")!;
    expect(heya.facilities.training).toBeLessThan(50);
    expect(heya.facilities.recovery).toBeLessThan(50);
    expect(heya.facilities.nutrition).toBeLessThan(50);
  });

  it("should not decay below MIN_FACILITY (5)", () => {
    const world = makeWorld({ funds: 0, facilities: { training: 5, recovery: 5, nutrition: 5 } }, { playerOwned: false });

    tickMonthly(world);

    const heya = world.heyas.get("test-heya")!;
    expect(heya.facilities.training).toBe(5);
    expect(heya.facilities.recovery).toBe(5);
    expect(heya.facilities.nutrition).toBe(5);
  });

  describe("getMonthlyMaintenanceCost", () => {
    it("should calculate monthly maintenance cost correctly for symmetric levels", () => {
      const heya = makeHeya({ facilities: { training: 50, recovery: 50, nutrition: 50 } });
      const cost = getMonthlyMaintenanceCost(heya);
      // 50 * 3000 * 3 axes = 450,000
      expect(cost).toBe(450_000);
    });

    it("should calculate correctly at minimum facility levels", () => {
      // MIN_FACILITY = 5
      const heya = makeHeya({ facilities: { training: 5, recovery: 5, nutrition: 5 } });
      const cost = getMonthlyMaintenanceCost(heya);
      // 5 * 3000 * 3 axes = 45,000
      expect(cost).toBe(45_000);
    });

    it("should calculate correctly at maximum facility levels", () => {
      // MAX_FACILITY = 100
      const heya = makeHeya({ facilities: { training: 100, recovery: 100, nutrition: 100 } });
      const cost = getMonthlyMaintenanceCost(heya);
      // 100 * 3000 * 3 axes = 900,000
      expect(cost).toBe(900_000);
    });

    it("should calculate correctly with asymmetric facility levels", () => {
      const heya = makeHeya({ facilities: { training: 10, recovery: 20, nutrition: 30 } });
      const cost = getMonthlyMaintenanceCost(heya);
      // (10 * 3000) + (20 * 3000) + (30 * 3000) = 30,000 + 60,000 + 90,000 = 180,000
      expect(cost).toBe(180_000);
    });
  });
});

// ============================================================================
// NPC FACILITY INVESTMENT
// ============================================================================

describe("Facilities: NPC Auto-Investment", () => {
  it("should invest for NPC heya with healthy funds", () => {
    const world = makeWorld(
      { funds: 50_000_000, facilities: { training: 30, recovery: 30, nutrition: 30 } },
      {
        playerOwned: false,
        oyakataOverrides: { traits: { ambition: 80, patience: 50, risk: 50, tradition: 50, compassion: 50 } },
      }
    );

    tickMonthly(world);

    const heya = world.heyas.get("test-heya")!;
    // NPC should have invested in training (ambition > 70)
    // Funds should have decreased beyond just maintenance
    expect(heya.facilities.training).toBeGreaterThan(30);
  });

  it("should not invest for NPC heya with low funds", () => {
    const world = makeWorld(
      { funds: 500_000, facilities: { training: 30, recovery: 30, nutrition: 30 } },
      { playerOwned: false }
    );

    tickMonthly(world);

    const heya = world.heyas.get("test-heya")!;
    // Facilities may have decayed (can't afford maintenance), but no investment
    expect(heya.facilities.training).toBeLessThanOrEqual(30);
  });

  it("compassionate oyakata should prioritize recovery", () => {
    const world = makeWorld(
      { funds: 50_000_000, facilities: { training: 50, recovery: 30, nutrition: 50 } },
      {
        playerOwned: false,
        oyakataOverrides: { traits: { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 80 } },
      }
    );

    tickMonthly(world);

    const heya = world.heyas.get("test-heya")!;
    expect(heya.facilities.recovery).toBeGreaterThan(30);
  });
});

// ============================================================================
// ECONOMICS: WEEKLY TICK
// ============================================================================

describe("Economics: Weekly Finance Tick", () => {
  it("should apply weekly income and expenses", () => {
    const world = makeWorld({ funds: 5_000_000, reputation: 50 });
    const initialFunds = world.heyas.get("test-heya")!.funds;

    economicsTickWeek(world);

    // Funds change (income - burn)
    const heya = world.heyas.get("test-heya")!;
    expect(heya.funds).not.toBe(initialFunds);
  });

  it("should apply survival floor for low-reputation heya", () => {
    const world = makeWorld({ funds: 5_000_000, reputation: 1 });

    economicsTickWeek(world);

    // Despite very low reputation, heya still gets survival floor income
    const heya = world.heyas.get("test-heya")!;
    // Should not have lost catastrophic funds
    expect(heya.funds).toBeGreaterThan(0);
  });

  it("should flag financial risk when funds are negative", () => {
    const world = makeWorld({ funds: -100_000, reputation: 10 });

    economicsTickWeek(world);

    const heya = world.heyas.get("test-heya")!;
    expect(heya.riskIndicators.financial).toBe(true);
  });

  it("should flag financial risk when runway is below 8 weeks", () => {
    const world = makeWorld({ funds: 100_000, reputation: 10 });

    economicsTickWeek(world);

    const heya = world.heyas.get("test-heya")!;
    expect(heya.riskIndicators.financial).toBe(true);
  });

  it("should not flag financial risk with healthy funds", () => {
    const world = makeWorld({ funds: 50_000_000, reputation: 80 });

    economicsTickWeek(world);

    const heya = world.heyas.get("test-heya")!;
    expect(heya.riskIndicators.financial).toBe(false);
  });
});

// ============================================================================
// ECONOMICS: INSOLVENCY
// ============================================================================

describe("Economics: Insolvency Handling", () => {
  it("should cap debt at debt limit", () => {
    const world = makeWorld({ funds: -25_000_000, reputation: 5, governanceStatus: "good_standing" });

    economicsTickWeek(world);

    const heya = world.heyas.get("test-heya")!;
    // Funds should be capped at -20M (debt limit)
    expect(heya.funds).toBeGreaterThanOrEqual(-20_000_000);
  });
});
