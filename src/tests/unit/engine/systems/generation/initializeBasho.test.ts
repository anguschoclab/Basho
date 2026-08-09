import { describe, it, expect } from "vitest";
import { initializeBasho } from "@/engine/systems/generation/WorldFactory";
import type { WorldState } from "@/engine/types/world";
import type { BashoName } from "@/engine/types/basho";

function makeWorld(overrides: Partial<WorldState> = {}): WorldState {
  return {
    id: "world_test",
    seed: "test-seed-123",
    year: 2026,
    week: 1,
    dayIndexGlobal: 0,
    cyclePhase: "pre_basho",
    rikishi: new Map(),
    activeRikishiIds: new Set(),
    heyas: new Map(),
    oyakata: new Map(),
    staff: new Map(),
    history: [],
    ftue: { isActive: false, bashoCompleted: 0, suppressedEvents: [] },
    records: {
      allTime: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] },
      active: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] },
    },
    calendar: { currentWeek: 1 },
    ...overrides,
  } as WorldState;
}

describe("initializeBasho", () => {
  it("Test 3.1: returns basho with kinboshiThisBasho as empty object {}", () => {
    const world = makeWorld();
    const basho = initializeBasho(world, "hatsu" as BashoName);
    expect(basho.kinboshiThisBasho).toBeDefined();
    expect(basho.kinboshiThisBasho).toEqual({});
  });

  it("Test 3.2: returns basho with day = 1", () => {
    const world = makeWorld();
    const basho = initializeBasho(world, "hatsu" as BashoName);
    expect(basho.day).toBe(1);
  });

  it("Test 3.3: returns basho with empty matches array", () => {
    const world = makeWorld();
    const basho = initializeBasho(world, "hatsu" as BashoName);
    expect(basho.matches).toEqual([]);
  });

  it("Test 3.4: returns basho with empty standings Map", () => {
    const world = makeWorld();
    const basho = initializeBasho(world, "hatsu" as BashoName);
    expect(basho.standings).toBeInstanceOf(Map);
    expect(basho.standings.size).toBe(0);
  });

  it("Test 3.5: returns basho with isActive = true", () => {
    const world = makeWorld();
    const basho = initializeBasho(world, "hatsu" as BashoName);
    expect(basho.isActive).toBe(true);
  });

  it("Test 3.6: sets correct bashoNumber from bashoName", () => {
    const world = makeWorld();
    const hatsu = initializeBasho(world, "hatsu" as BashoName);
    expect(hatsu.bashoNumber).toBe(1);

    const haru = initializeBasho(world, "haru" as BashoName);
    expect(haru.bashoNumber).toBe(2);
  });

  it("Test 3.7: generates deterministic id from seed", () => {
    const world = makeWorld({ seed: "deterministic-seed" });
    const basho1 = initializeBasho(world, "hatsu" as BashoName);
    const basho2 = initializeBasho(world, "hatsu" as BashoName);
    expect(basho1.id).toBeDefined();
    expect(basho1.id).toBe(basho2.id);
  });
});
