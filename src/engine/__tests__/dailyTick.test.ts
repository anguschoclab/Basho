/**
 * dailyTick.test.ts
 * Tests for the daily tick and time progression mechanics
 */

import { describe, it, expect, beforeEach } from "vitest";
import { advanceOneDay, advanceDays, enterPostBasho, enterInterim } from "../dailyTick";
import type { WorldState, CyclePhase } from "../types/world";
import type { Heya } from "../types/heya";

// Helper to create a minimal world state for testing
function createTestWorld(overrides: Partial<WorldState> = {}): WorldState {
  const heya: Heya = {
    id: "test-heya",
    name: "Test Heya",
    oyakataId: "oyakata1",
    rikishiIds: ["r1", "r2", "r3"],
    statureBand: "established",
    prestigeBand: "respected",
    facilitiesBand: "adequate",
    koenkaiBand: "moderate",
    runwayBand: "comfortable",
    reputation: 50,
    funds: 10_000_000,
    scandalScore: 0,
    governanceStatus: "good_standing",
    facilities: { training: 3, recovery: 3, nutrition: 3 },
    riskIndicators: { financial: false, governance: false, rivalry: false }
  };

  return {
    seed: 12345,
    year: 2025,
    week: 1,
    dayIndexGlobal: 0,
    calendar: {
      year: 2025,
      month: 1,
      currentDay: 1,
      currentWeek: 1
    },
    cyclePhase: "interim" as CyclePhase,
    currentBashoName: "hatsu",
    currentBasho: null,
    _interimDaysRemaining: 42,
    _postBashoDays: undefined,
    rikishi: new Map([
      ["r1", {
        id: "r1",
        shikona: "TestRikishi1",
        realName: "Test One",
        age: 25,
        birthYear: 1999,
        rank: "maegashira",
        division: "makuuchi",
        side: "east",
        rankNumber: 5,
        heyaId: "test-heya",
        archetype: "pusher-thruster",
        fatigue: 20,
        injured: false,
        isRetired: false,
        stats: { power: 70, technique: 60, speed: 65, balance: 68, stamina: 72, mentalFocus: 60 }
      }],
      ["r2", {
        id: "r2",
        shikona: "TestRikishi2",
        realName: "Test Two",
        age: 28,
        birthYear: 1996,
        rank: "juryo",
        division: "juryo",
        side: "east",
        rankNumber: 3,
        heyaId: "test-heya",
        archetype: "technician",
        fatigue: 30,
        injured: false,
        isRetired: false,
        stats: { power: 60, technique: 75, speed: 62, balance: 70, stamina: 65, mentalFocus: 68 }
      }],
      ["r3", {
        id: "r3",
        shikona: "RetiredRikishi",
        realName: "Retired One",
        age: 35,
        birthYear: 1989,
        rank: "maegashira",
        division: "makuuchi",
        side: "west",
        rankNumber: 10,
        heyaId: "test-heya",
        archetype: "yotsu-specialist",
        fatigue: 50,
        injured: false,
        isRetired: true,
        stats: { power: 65, technique: 70, speed: 55, balance: 72, stamina: 60, mentalFocus: 75 }
      }]
    ]) as unknown as Map<string, any>,
    heyas: new Map([["test-heya", heya]]) as unknown as Map<string, any>,
    oyakata: new Map() as unknown as Map<string, any>,
    playerHeyaId: "test-heya",
    eventLog: [],
    rivalriesState: { pairs: [], lastUpdatedWeek: 0, nextRivalryId: 1 },
    ...overrides
  } as WorldState;
}

describe("Daily Tick: Calendar Advancement", () => {
  it("should increment dayIndexGlobal on each tick", () => {
    const world = createTestWorld();
    expect(world.dayIndexGlobal).toBe(0);
    
    advanceOneDay(world);
    expect(world.dayIndexGlobal).toBe(1);
    
    advanceOneDay(world);
    expect(world.dayIndexGlobal).toBe(2);
  });

  it("should increment calendar day", () => {
    const world = createTestWorld();
    expect(world.calendar.currentDay).toBe(1);
    
    advanceOneDay(world);
    expect(world.calendar.currentDay).toBe(2);
  });

  it("should roll over month when days exceed month length", () => {
    const world = createTestWorld({
      calendar: { year: 2025, month: 1, currentDay: 31, currentWeek: 5 }
    });
    
    const report = advanceOneDay(world);
    
    expect(world.calendar.currentDay).toBe(1);
    expect(world.calendar.month).toBe(2);
    expect(report.monthBoundary).toBe(true);
  });

  it("should roll over year when month exceeds 12", () => {
    const world = createTestWorld({
      calendar: { year: 2025, month: 12, currentDay: 31, currentWeek: 52 }
    });
    
    const report = advanceOneDay(world);
    
    expect(world.calendar.currentDay).toBe(1);
    expect(world.calendar.month).toBe(1);
    expect(world.calendar.year).toBe(2026);
    expect(report.yearBoundary).toBe(true);
  });

  it("should handle February correctly (28 days)", () => {
    const world = createTestWorld({
      calendar: { year: 2025, month: 2, currentDay: 28, currentWeek: 9 }
    });
    
    const report = advanceOneDay(world);
    
    expect(world.calendar.currentDay).toBe(1);
    expect(world.calendar.month).toBe(3);
    expect(report.monthBoundary).toBe(true);
  });
});

describe("Daily Tick: Phase Transitions", () => {
  it("should transition from interim to pre_basho when 7 days remain", () => {
    const world = createTestWorld({
      cyclePhase: "interim",
      _interimDaysRemaining: 8
    });
    
    const report = advanceOneDay(world);
    
    expect(world.cyclePhase).toBe("pre_basho");
    expect(report.phaseTransition).toBeDefined();
    expect(report.phaseTransition?.from).toBe("interim");
    expect(report.phaseTransition?.to).toBe("pre_basho");
  });

  it("should transition from pre_basho to active_basho when days reach 0", () => {
    const world = createTestWorld({
      cyclePhase: "pre_basho",
      _interimDaysRemaining: 1,
      currentBashoName: "hatsu"
    });
    
    const report = advanceOneDay(world);
    
    expect(world.cyclePhase).toBe("active_basho");
    expect(world.currentBasho).toBeDefined();
    expect(report.phaseTransition?.from).toBe("pre_basho");
    expect(report.phaseTransition?.to).toBe("active_basho");
  });

  it("should transition from post_basho to interim when days reach 0", () => {
    const world = createTestWorld({
      cyclePhase: "post_basho",
      _postBashoDays: 1
    });
    
    const report = advanceOneDay(world);
    
    expect(world.cyclePhase).toBe("interim");
    expect(report.phaseTransition?.from).toBe("post_basho");
    expect(report.phaseTransition?.to).toBe("interim");
  });

  it("should decrement _interimDaysRemaining each day", () => {
    const world = createTestWorld({
      cyclePhase: "interim",
      _interimDaysRemaining: 30
    });
    
    advanceOneDay(world);
    expect(world._interimDaysRemaining).toBe(29);
    
    advanceOneDay(world);
    expect(world._interimDaysRemaining).toBe(28);
  });

  it("should decrement _postBashoDays each day", () => {
    const world = createTestWorld({
      cyclePhase: "post_basho",
      _postBashoDays: 7
    });
    
    advanceOneDay(world);
    expect(world._postBashoDays).toBe(6);
  });
});

describe("Daily Tick: Weekly Boundary", () => {
  it("should trigger weekly subsystems every 7 days", () => {
    const world = createTestWorld({ dayIndexGlobal: 6 });
    
    const report = advanceOneDay(world);
    
    // Day 7 triggers weekly tick
    expect(world.dayIndexGlobal).toBe(7);
    expect(report.subsystemsRun).toContain("training");
    expect(world.week).toBe(2);
  });

  it("should not trigger weekly subsystems on non-7th days", () => {
    const world = createTestWorld({ dayIndexGlobal: 4 });
    
    const report = advanceOneDay(world);
    
    expect(world.dayIndexGlobal).toBe(5);
    expect(report.subsystemsRun).not.toContain("training");
  });

  it("should update calendar.currentWeek on weekly boundary", () => {
    const world = createTestWorld({ dayIndexGlobal: 13, week: 1 });
    
    advanceOneDay(world);
    
    // Day 14 triggers weekly tick
    expect(world.week).toBe(2);
    expect(world.calendar.currentWeek).toBe(2);
  });
});

describe("Daily Tick: Fatigue Recovery", () => {
  it("should reduce fatigue for non-injured rikishi", () => {
    const world = createTestWorld();
    const r1 = world.rikishi.get("r1")!;
    r1.fatigue = 20;
    r1.injured = false;
    
    advanceOneDay(world);
    
    expect(r1.fatigue).toBeLessThan(20);
  });

  it("should not reduce fatigue below 0", () => {
    const world = createTestWorld();
    const r1 = world.rikishi.get("r1")!;
    r1.fatigue = 0.1;
    r1.injured = false;
    
    advanceOneDay(world);
    
    expect(r1.fatigue).toBe(0);
  });

  it("should not reduce fatigue for retired rikishi", () => {
    const world = createTestWorld();
    const r3 = world.rikishi.get("r3")!;
    const initialFatigue = r3.fatigue;
    
    advanceOneDay(world);
    
    // Retired rikishi skipped in fatigue loop
    expect(r3.fatigue).toBe(initialFatigue);
  });
});

describe("Daily Tick: Economy", () => {
  it("should deduct daily food costs from heya funds", () => {
    const world = createTestWorld();
    const heya = world.heyas.get("test-heya")!;
    const initialFunds = heya.funds;
    
    advanceOneDay(world);
    
    // 3 rikishi * 3000 = 9000 daily food cost
    expect(heya.funds).toBe(initialFunds - 9000);
  });

  it("should scale food costs with roster size", () => {
    const world = createTestWorld();
    const heya = world.heyas.get("test-heya")!;
    heya.rikishiIds = ["r1", "r2", "r3", "r4", "r5"]; // 5 rikishi
    const initialFunds = heya.funds;
    
    advanceOneDay(world);
    
    // 5 rikishi * 3000 = 15000 daily food cost
    expect(heya.funds).toBe(initialFunds - 15000);
  });
});

describe("Daily Tick: Report Generation", () => {
  it("should return correct dayIndexGlobal in report", () => {
    const world = createTestWorld({ dayIndexGlobal: 10 });
    
    const report = advanceOneDay(world);
    
    expect(report.dayIndexGlobal).toBe(11);
  });

  it("should return current phase in report", () => {
    const world = createTestWorld({ cyclePhase: "interim" });
    
    const report = advanceOneDay(world);
    
    expect(report.phase).toBe("interim");
  });

  it("should include bashoDay when in active_basho", () => {
    const world = createTestWorld({
      cyclePhase: "active_basho",
      currentBasho: {
        id: "test-basho",
        name: "hatsu",
        year: 2025,
        day: 5,
        matches: [],
        yushoRaceLeaders: [],
        completed: false
      } as unknown as any
    });
    
    const report = advanceOneDay(world);
    
    expect(report.bashoDay).toBe(5);
  });

  it("should list subsystems run", () => {
    const world = createTestWorld();
    
    const report = advanceOneDay(world);
    
    expect(report.subsystemsRun).toContain("scheduled_events");
    expect(report.subsystemsRun).toContain("daily_fatigue");
    expect(report.subsystemsRun).toContain("daily_economy");
  });
});

describe("advanceDays: Multiple Day Advancement", () => {
  it("should advance multiple days and return reports", () => {
    const world = createTestWorld();
    
    const reports = advanceDays(world, 5);
    
    expect(reports.length).toBe(5);
    expect(world.dayIndexGlobal).toBe(5);
  });

  it("should cap at 365 days maximum", () => {
    const world = createTestWorld();
    
    const reports = advanceDays(world, 500);
    
    expect(reports.length).toBe(365);
  });

  it("should handle minimum of 1 day", () => {
    const world = createTestWorld();
    
    const reports = advanceDays(world, 0);
    
    expect(reports.length).toBe(1);
  });

  it("should trigger multiple weekly boundaries", () => {
    const world = createTestWorld({ dayIndexGlobal: 0, week: 0 });
    
    advanceDays(world, 21);
    
    // Should have passed 3 weekly boundaries (days 7, 14, 21)
    expect(world.week).toBe(3);
  });
});

describe("Phase Initializers", () => {
  it("enterPostBasho should set correct phase and days", () => {
    const world = createTestWorld({ cyclePhase: "active_basho" });
    
    enterPostBasho(world);
    
    expect(world.cyclePhase).toBe("post_basho");
    expect(world._postBashoDays).toBe(7);
  });

  it("enterInterim should set correct phase and days", () => {
    const world = createTestWorld({ cyclePhase: "post_basho" });
    
    enterInterim(world);
    
    expect(world.cyclePhase).toBe("interim");
    expect(world._interimDaysRemaining).toBe(42); // 6 weeks
  });
});

describe("Daily Tick: Event Logging", () => {
  it("should log phase transition events", () => {
    const world = createTestWorld({
      cyclePhase: "interim",
      _interimDaysRemaining: 8,
      events: { version: "1.0.0", log: [], dedupe: {} }
    });
    
    advanceOneDay(world);
    
    const phaseEvent = world.events?.log.find((e: any) => e.type === "PHASE_TRANSITION");
    expect(phaseEvent).toBeDefined();
  });
});

describe("Daily Tick: Integration", () => {
  it("should handle full interim-to-basho cycle", () => {
    const world = createTestWorld({
      cyclePhase: "interim",
      _interimDaysRemaining: 50,
      currentBashoName: "hatsu"
    });
    
    // Advance through interim
    let reports = advanceDays(world, 43);
    
    // Should now be in pre_basho
    expect(world.cyclePhase).toBe("pre_basho");
    
    // Advance through pre_basho
    reports = advanceDays(world, 7);
    
    // Should now be in active_basho
    expect(world.cyclePhase).toBe("active_basho");
    expect(world.currentBasho).toBeDefined();
  });

  it("should maintain state consistency across many days", () => {
    const world = createTestWorld({
      cyclePhase: "interim",
      _interimDaysRemaining: 42
    });
    
    const initialYear = world.calendar.year;
    
    // Advance 100 days
    advanceDays(world, 100);
    
    // Verify state is still consistent
    expect(world.dayIndexGlobal).toBe(100);
    expect(world.calendar.year).toBeGreaterThanOrEqual(initialYear);
    expect(world.calendar.month).toBeGreaterThanOrEqual(1);
    expect(world.calendar.month).toBeLessThanOrEqual(12);
    expect(world.calendar.currentDay).toBeGreaterThanOrEqual(1);
    expect(world.calendar.currentDay).toBeLessThanOrEqual(31);
  });
});
