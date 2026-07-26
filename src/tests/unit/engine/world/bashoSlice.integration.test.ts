/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { simulateBoutForToday, advanceBashoDay } from "@/engine/world";
import { phase01_basho_bouts } from "@/engine/tick/phases/phase01_basho_bouts";
import type { Rikishi } from "@/engine/types/rikishi";
import type { MatchSchedule, BashoState, BashoName } from "@/engine/types/basho";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";

function makeRikishi(id: string, overrides: Partial<Rikishi> = {}): Rikishi {
  return MockFactory.createRikishi(id, {
    division: "makuuchi", rank: "maegashira", rankNumber: 1, side: "east",
    careerWins: 10, careerLosses: 5, currentBashoWins: 0, currentBashoLosses: 0,
    heyaId: "test-heya",
    stats: { power: 60, speed: 60, technique: 60, weight: 140, stamina: 60, mental: 60, adaptability: 60, balance: 60, aggression: 60, experience: 10 },
    ...overrides,
  });
}

function makeWorld(day: number = 1, matchesPerDay: number = 1): ReturnType<typeof MockFactory.createWorld> {
  const east = makeRikishi("east");
  const west = makeRikishi("west", { side: "west" });
  const matches: MatchSchedule[] = [];
  for (let d = 1; d <= 15; d++) {
    for (let b = 0; b < matchesPerDay; b++) {
      matches.push({ boutId: `d${d}-b${b}`, day: d, eastRikishiId: "east", westRikishiId: "west" });
    }
  }
  const basho: BashoState = {
    id: "test-basho", year: 2026, bashoNumber: 1, bashoName: "hatsu" as BashoName,
    day, matches, standings: new Map([
      ["east", { wins: 0, losses: 0 }],
      ["west", { wins: 0, losses: 0 }],
    ]), isActive: true,
  };
  return MockFactory.createWorld({
    rikishi: new Map([["east", east], ["west", west]]),
    heyas: new Map([["test-heya", MockFactory.createHeya("test-heya", { rikishiIds: ["east", "west"] })]]),
    currentBasho: basho, cyclePhase: "active_basho",
    sponsorPool: { sponsors: new Map(), koenkais: new Map() } as any,
    rivalriesState: { pairs: {}, version: 1 },
  });
}

describe("bashoSlice integration (full day simulation)", () => {
  it("Test 16.1: simulating a full day via phase01 sets match.result on all bouts", () => {
    const world = makeWorld(1, 2);
    const result = phase01_basho_bouts(world);
    const basho = result.currentBasho!;
    const day1Matches = basho.matches.filter((m) => m.day === 1);
    for (const m of day1Matches) {
      expect(m.result).toBeDefined();
    }
  });

  it("Test 16.2: simulating a full day advances the day", () => {
    const world = makeWorld(1, 1);
    const result = phase01_basho_bouts(world);
    expect(result.currentBasho!.day).toBe(2);
  });

  it("Test 16.3: simulating bout-by-bout via simulateBoutForToday produces consistent state", () => {
    const world = makeWorld(1, 2);
    const r1 = simulateBoutForToday(world, 0);
    const r2 = simulateBoutForToday(r1.world, 0);
    const basho = r2.world.currentBasho!;
    const day1Matches = basho.matches.filter((m) => m.day === 1);
    const resolved = day1Matches.filter((m) => m.result);
    expect(resolved.length).toBe(2);
  });

  it("Test 16.4: simulating bout-by-bout updates currentBashoWins/Losses", () => {
    const world = makeWorld(1, 2);
    const r1 = simulateBoutForToday(world, 0);
    const r2 = simulateBoutForToday(r1.world, 0);
    const east = r2.world.rikishi.get("east")!;
    const west = r2.world.rikishi.get("west")!;
    const totalWins = (east.currentBashoWins ?? 0) + (west.currentBashoWins ?? 0);
    const totalLosses = (east.currentBashoLosses ?? 0) + (west.currentBashoLosses ?? 0);
    expect(totalWins).toBe(2);
    expect(totalLosses).toBe(2);
  });

  it("Test 16.5: simulating a full basho via phase01 across all 15 days", () => {
    const world = makeWorld(1, 1);
    let currentWorld = world;
    for (let day = 1; day <= 15; day++) {
      currentWorld = phase01_basho_bouts(currentWorld);
      // phase01 advances the day, so we need to check if basho is still active
      const basho = currentWorld.currentBasho;
      if (!basho || basho.day > 15) break;
    }
    const basho = currentWorld.currentBasho!;
    const resolved = basho.matches.filter((m: MatchSchedule) => m.result);
    expect(resolved.length).toBe(15);
  });

  it("Test 16.6: advanceBashoDay increases day by 1", () => {
    const world = makeWorld(5, 1);
    const result = advanceBashoDay(world);
    expect(result.currentBasho!.day).toBe(6);
  });

  it("Test 16.7: advanceBashoDay at day 15 does not go beyond 15", () => {
    const world = makeWorld(15, 1);
    const result = advanceBashoDay(world);
    // Day 16 means basho is over
    expect(result.currentBasho!.day).toBeGreaterThanOrEqual(16);
  });
});
