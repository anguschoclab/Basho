import { describe, it, expect } from "vitest";
import {
  scheduleDivisionDay,
  needsScheduleForDay,
  getTotalBashodays,
} from "../schedule";
import { mockRikishi } from "./utils";
import type { BashoState } from "../types/basho";
import type { WorldState } from "../types/world";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockBasho(overrides: Partial<BashoState> = {}): BashoState {
  return {
    id: "test-basho",
    year: 2025,
    bashoNumber: 1,
    bashoName: "hatsu",
    day: 1,
    matches: [],
    standings: new Map(),
    isActive: true,
    ...overrides,
  } as unknown as BashoState;
}

function makeMockWorld(overrides: Partial<WorldState> = {}): WorldState {
  return {
    id: "test-world",
    seed: "test-seed",
    year: 2025,
    week: 1,
    dayIndexGlobal: 1,
    cyclePhase: "active_basho",
    heyas: new Map(),
    rikishi: new Map(),
    historicalRikishi: new Map(),
    oyakata: new Map(),
    staff: new Map(),
    events: { bouts: [], milestones: [], tournaments: [], media: [] },
    history: [],
    ftue: { completedSteps: [] },
    records: {
      allTimeRecords: { wins: [], losses: [] },
      bashoRecords: { wins: [], losses: [] },
    },
    calendar: {
      year: 2025,
      month: 1,
      currentWeek: 1,
      currentDay: 1,
    },
    settings: {
      archiveMode: "standard",
    },
    ...overrides,
  } as unknown as WorldState;
}

function setStandings(
  basho: BashoState,
  records: Record<string, { wins: number; losses: number }>,
) {
  for (const [id, record] of Object.entries(records)) {
    basho.standings.set(id, record);
  }
}

// ---------------------------------------------------------------------------
// Schedule Requirements
// ---------------------------------------------------------------------------

describe("scheduleDivisionDay", () => {
  it("returns empty array if pool has fewer than 2 rikishi", () => {
    const world = makeMockWorld();
    const basho = makeMockBasho({ day: 1 });
    const r1 = mockRikishi("r1", { division: "makuuchi" });
    world.rikishi.set(r1.id, r1);

    const { scheduled } = scheduleDivisionDay({
      world,
      basho,
      division: "makuuchi",
      day: 1,
      seed: "test-seed",
    });

    expect(scheduled).toEqual([]);
  });

  it("generates MatchSchedule entries with correct structure for makuuchi day 1", () => {
    const world = makeMockWorld();
    const basho = makeMockBasho({ day: 1 });
    const r1 = mockRikishi("r1", { division: "makuuchi" });
    const r2 = mockRikishi("r2", { division: "makuuchi" });
    world.rikishi.set(r1.id, r1);
    world.rikishi.set(r2.id, r2);

    const { scheduled } = scheduleDivisionDay({
      world,
      basho,
      division: "makuuchi",
      day: 1,
      seed: "test-seed",
    });

    expect(scheduled.length).toBeGreaterThan(0);

    // Check structure
    const seenBoutIds = new Set<string>();
    for (const match of scheduled) {
      expect(typeof match.boutId).toBe("string");
      expect(match.boutId.length).toBeGreaterThan(0);
      expect(seenBoutIds.has(match.boutId)).toBe(false); // boutIds must be unique
      seenBoutIds.add(match.boutId);
      expect(match.day).toBe(1);
      expect(typeof match.eastRikishiId).toBe("string");
      expect(typeof match.westRikishiId).toBe("string");
      expect(match.eastRikishiId).not.toBe(match.westRikishiId);
    }
  });

  it("appends matches to basho.matches", () => {
    const world = makeMockWorld();
    const basho = makeMockBasho({ day: 1 });
    const r1 = mockRikishi("r1", { division: "makuuchi" });
    const r2 = mockRikishi("r2", { division: "makuuchi" });
    const r3 = mockRikishi("r3", { division: "makuuchi" });
    world.rikishi.set(r1.id, r1);
    world.rikishi.set(r2.id, r2);
    world.rikishi.set(r3.id, r3);

    const initialCount = basho.matches.length;

    const { impact } = scheduleDivisionDay({
      world,
      basho,
      division: "makuuchi",
      day: 1,
      seed: "test-seed",
    });

    // scheduleDivisionDay now returns StateImpact with arrayAppends for basho.matches
    // The impact should contain the scheduled matches
    const bashoMatchesAppend = impact.arrayAppends?.find((a: any) => a.field === 'basho.matches');
    expect(bashoMatchesAppend?.items?.length).toBeGreaterThan(0);
  });

  it("respects heya block — no stablemate pairings for makuuchi", () => {
    const world = makeMockWorld();
    const basho = makeMockBasho({ day: 1 });
    const r1 = mockRikishi("r1", {
      division: "makuuchi",
      heyaId: "same-heya",
    });
    const r2 = mockRikishi("r2", {
      division: "makuuchi",
      heyaId: "same-heya",
    });
    const r3 = mockRikishi("r3", { division: "makuuchi", heyaId: "other" });
    const r4 = mockRikishi("r4", { division: "makuuchi", heyaId: "other" });

    const { scheduled } = scheduleDivisionDay({
      world,
      basho,
      division: "makuuchi",
      day: 1,
      seed: "test-seed",
    });

    // Check: no same-heya pairings
    for (const match of scheduled) {
      const east = [r1, r2, r3, r4].find((r) => r.id === match.eastRikishiId);
      const west = [r1, r2, r3, r4].find((r) => r.id === match.westRikishiId);
      expect(east?.heyaId).not.toBe(west?.heyaId);
    }
  });

  it("dispatches to buildSwissTorikumi for makuuchi on day 8", () => {
    const world = makeMockWorld();
    const basho = makeMockBasho({ day: 8 });
    setStandings(basho, {
      r1: { wins: 7, losses: 0 },
      r2: { wins: 6, losses: 1 },
    });
    const r1 = mockRikishi("r1", { division: "makuuchi" });
    const r2 = mockRikishi("r2", { division: "makuuchi" });
    world.rikishi.set(r1.id, r1);
    world.rikishi.set(r2.id, r2);

    const { scheduled } = scheduleDivisionDay({
      world,
      basho,
      division: "makuuchi",
      day: 8,
      seed: "test-seed",
    });

    // Swiss system should generate pairings for day 8
    expect(scheduled.length).toBeGreaterThan(0);
  });

  it("dispatches to buildSwissTorikumi for makuuchi on day 15 with yusho exception", () => {
    const world = makeMockWorld();
    const basho = makeMockBasho({ day: 15 });
    setStandings(basho, {
      m10: { wins: 14, losses: 0 }, // Maegashira leader
      yoko: { wins: 13, losses: 1 },
    });
    const m10 = mockRikishi("m10", {
      division: "makuuchi",
      rank: "maegashira",
      rankNumber: 10,
    });
    const yoko = mockRikishi("yoko", {
      division: "makuuchi",
      rank: "yokozuna",
    });
    world.rikishi.set(m10.id, m10);
    world.rikishi.set(yoko.id, yoko);

    const { scheduled } = scheduleDivisionDay({
      world,
      basho,
      division: "makuuchi",
      day: 15,
      seed: "test-seed",
    });

    // Should generate pairings including potential yusho exception
    expect(scheduled.length).toBeGreaterThan(0);
  });

  it("uses buildCandidatePairs for juryo (not Swiss)", () => {
    const world = makeMockWorld();
    const basho = makeMockBasho({ day: 8 });
    const r1 = mockRikishi("r1", { division: "juryo" });
    const r2 = mockRikishi("r2", { division: "juryo" });
    const r3 = mockRikishi("r3", { division: "juryo" });
    const r4 = mockRikishi("r4", { division: "juryo" });
    world.rikishi.set(r1.id, r1);
    world.rikishi.set(r2.id, r2);
    world.rikishi.set(r3.id, r3);
    world.rikishi.set(r4.id, r4);

    const { scheduled } = scheduleDivisionDay({
      world,
      basho,
      division: "juryo",
      day: 8,
      seed: "test-seed",
    });

    // Should still produce valid pairings
    expect(scheduled.length).toBeGreaterThan(0);
    for (const match of scheduled) {
      expect(match.eastRikishiId).not.toBe(match.westRikishiId);
    }
  });

  it("uses buildCandidatePairs for makushita (not Swiss)", () => {
    const world = makeMockWorld();
    const basho = makeMockBasho({ day: 1 });
    const r1 = mockRikishi("r1", { division: "makushita" });
    const r2 = mockRikishi("r2", { division: "makushita" });
    const r3 = mockRikishi("r3", { division: "makushita" });
    world.rikishi.set(r1.id, r1);
    world.rikishi.set(r2.id, r2);
    world.rikishi.set(r3.id, r3);

    const { scheduled } = scheduleDivisionDay({
      world,
      basho,
      division: "makushita",
      day: 1,
      seed: "test-seed",
    });

    // Should produce valid pairings
    expect(scheduled.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Schedule Calendar Requirements
// ---------------------------------------------------------------------------

describe("needsScheduleForDay", () => {
  it("returns true for makuuchi any day 1-15", () => {
    for (let day = 1; day <= 15; day++) {
      expect(needsScheduleForDay("makuuchi", day)).toBe(true);
    }
  });

  it("returns false for makuuchi day 16+", () => {
    expect(needsScheduleForDay("makuuchi", 16)).toBe(false);
    expect(needsScheduleForDay("makuuchi", 100)).toBe(false);
  });

  it("returns true for makushita only on odd days 1,3,5,...,13", () => {
    const oddDays = [1, 3, 5, 7, 9, 11, 13];
    const evenDays = [2, 4, 6, 8, 10, 12, 14];

    for (const day of oddDays) {
      expect(needsScheduleForDay("makushita", day)).toBe(true);
    }

    for (const day of evenDays) {
      expect(needsScheduleForDay("makushita", day)).toBe(false);
    }
  });

  it("returns false for makushita day 15+", () => {
    expect(needsScheduleForDay("makushita", 15)).toBe(false);
  });

  it("returns true for juryo any day 1-15", () => {
    for (let day = 1; day <= 15; day++) {
      expect(needsScheduleForDay("juryo", day)).toBe(true);
    }
  });

  it("returns false for juryo day 16+", () => {
    expect(needsScheduleForDay("juryo", 16)).toBe(false);
  });
});

describe("getTotalBashodays", () => {
  it("returns 15 for makuuchi", () => {
    expect(getTotalBashodays("makuuchi")).toBe(15);
  });

  it("returns 15 for juryo", () => {
    expect(getTotalBashodays("juryo")).toBe(15);
  });

  it("returns 7 for makushita", () => {
    expect(getTotalBashodays("makushita")).toBe(7);
  });

  it("returns 7 for sandanme", () => {
    expect(getTotalBashodays("sandanme")).toBe(7);
  });

  it("returns 7 for jonidan", () => {
    expect(getTotalBashodays("jonidan")).toBe(7);
  });

  it("returns 7 for jonokuchi", () => {
    expect(getTotalBashodays("jonokuchi")).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// Chronological Order (for makuuchi Swiss)
// ---------------------------------------------------------------------------

describe("scheduleDivisionDay — chronological order for makuuchi", () => {
  it("places lower-ranked bouts earlier in the schedule on day 1", () => {
    const world = makeMockWorld();
    const basho = makeMockBasho({ day: 1 });
    const yoko = mockRikishi("yoko", {
      division: "makuuchi",
      rank: "yokozuna",
    });
    const m15 = mockRikishi("m15", {
      division: "makuuchi",
      rank: "maegashira",
      rankNumber: 15,
    });
    const m14 = mockRikishi("m14", {
      division: "makuuchi",
      rank: "maegashira",
      rankNumber: 14,
    });
    const m1 = mockRikishi("m1", {
      division: "makuuchi",
      rank: "maegashira",
      rankNumber: 1,
    });
    world.rikishi.set(yoko.id, yoko);
    world.rikishi.set(m15.id, m15);
    world.rikishi.set(m14.id, m14);
    world.rikishi.set(m1.id, m1);

    const { scheduled } = scheduleDivisionDay({
      world,
      basho,
      division: "makuuchi",
      day: 1,
      seed: "test-chrono",
    });

    // The last match should include the yokozuna
    expect(scheduled.length).toBeGreaterThan(0);
    const lastMatch = scheduled[scheduled.length - 1];
    expect([lastMatch.eastRikishiId, lastMatch.westRikishiId]).toContain(
      yoko.id,
    );
  });
});

// ---------------------------------------------------------------------------
// Integration with basho state
// ---------------------------------------------------------------------------

describe("scheduleDivisionDay — basho state mutation", () => {
  it("does not create rematches when matches already exist", () => {
    const world = makeMockWorld();
    const basho = makeMockBasho({ day: 2 });
    const r1 = mockRikishi("r1", { division: "makuuchi" });
    const r2 = mockRikishi("r2", { division: "makuuchi" });
    const r3 = mockRikishi("r3", { division: "makuuchi" });
    const r4 = mockRikishi("r4", { division: "makuuchi" });
    world.rikishi.set(r1.id, r1);
    world.rikishi.set(r2.id, r2);
    world.rikishi.set(r3.id, r3);
    world.rikishi.set(r4.id, r4);

    // Simulate day 1 match: r1 vs r2
    basho.matches.push({
      boutId: "bout-1",
      day: 1,
      eastRikishiId: r1.id,
      westRikishiId: r2.id,
    } as any);

    // Day 2 scheduling should not re-pair r1 vs r2
    const { scheduled } = scheduleDivisionDay({
      world,
      basho,
      division: "makuuchi",
      day: 2,
      seed: "test-no-rematch",
    });

    const dayTwoMatches = scheduled;
    const hasRematch = dayTwoMatches.some(
      (m: any) =>
        (m.eastRikishiId === r1.id && m.westRikishiId === r2.id) ||
        (m.eastRikishiId === r2.id && m.westRikishiId === r1.id),
    );

    expect(hasRematch).toBe(false);
  });
});
