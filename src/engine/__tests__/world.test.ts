import { describe, it, expect } from "vitest";
import { startBasho, endBasho, advanceBashoDay, simulateBoutForToday } from "../world";
import { generateWorld } from "../worldgen";

describe("World Engine Transitions", () => {
  it("should successfully start a basho from pre_basho state", () => {
    const world = generateWorld("world-test");
    world.cyclePhase = "pre_basho";
    world.currentBashoName = "hatsu";
    world.year = 2025;
    if (!world.calendar) world.calendar = { year: 2025, month: 1, currentWeek: 1, currentDay: 1 };

    // Attempt to start
    const updated = startBasho(world, "hatsu");
if (!updated) throw new Error("updated is undefined");

    expect(updated.cyclePhase).toBe("active_basho");
    expect(updated.currentBasho).toBeDefined();
    expect(updated.currentBasho!.day).toBe(1);
    expect(updated.currentBasho!.isActive).toBe(true);
    expect(updated.currentBasho!.bashoName).toBe("hatsu");
    expect(updated.currentBasho!.matches.length).toBeGreaterThan(0);
  });

  it("should successfully advance basho day up to day 15", () => {
    let world = generateWorld("world-test-2");
    world.cyclePhase = "pre_basho";
    world.currentBashoName = "haru";
    world.year = 2025;
    if (!world.calendar) world.calendar = { year: 2025, month: 1, currentWeek: 1, currentDay: 1 };
    world = startBasho(world, "haru");

    expect(world.currentBasho!.day).toBe(1);

    // Jump to day 14
    world.currentBasho!.day = 14;
    world = advanceBashoDay(world);

    expect(world.currentBasho!.day).toBe(15);
  });

  it("should finalize the basho records during endBasho", () => {
    let world = generateWorld("world-test-3");
    world.cyclePhase = "pre_basho";
    world.currentBashoName = "natsu";
    world.year = 2025;
    if (!world.calendar) world.calendar = { year: 2025, month: 1, currentWeek: 1, currentDay: 1 };
    world = startBasho(world, "natsu");
    world.currentBasho!.day = 15;

    // Force some wins for a rikishi to verify standings serialization
    const firstMatch = world.currentBasho!.matches[0];
    const eastId = firstMatch.eastRikishiId;
    world.currentBasho!.standings.set(eastId, { wins: 15, losses: 0 });

    world = endBasho(world);

    expect(world.cyclePhase).toBe("post_basho");
    expect(world.history.length).toBeGreaterThan(0);

    const lastHistory = world.history[world.history.length - 1];
    expect(lastHistory.bashoName).toBe("natsu");

    // The player with 15 wins should be the yusho winner (simplistic check)
    expect(lastHistory.yusho).toBe(eastId);
  });
});


describe("simulateBoutForToday", () => {
  it("should return world if basho does not exist", () => {
    const world = generateWorld("world-test-simulate-bout-1");
    world.currentBasho = undefined;

    const result = simulateBoutForToday(world, 0);
    expect(result.world).toBe(world);
    expect(result.result).toBeUndefined();
  });

  it("should return world if unplayedIndex is out of bounds", () => {
    let world = generateWorld("world-test-simulate-bout-2");
    world = startBasho(world, "natsu");

    // Get number of matches today
    const basho = world.currentBasho!;
    const todaysMatches = basho.matches.filter(m => m.day === basho.day && !m.result);

    const result = simulateBoutForToday(world, todaysMatches.length); // out of bounds
    expect(result.world).toBe(world);
    expect(result.result).toBeUndefined();
  });

  it("should return world if rikishi is missing", () => {
    let world = generateWorld("world-test-simulate-bout-3");
    world = startBasho(world, "natsu");

    const basho = world.currentBasho!;
    const todaysMatches = basho.matches.filter(m => m.day === basho.day && !m.result);

    // Delete one of the rikishi participating in the first match
    const match = todaysMatches[0];
    world.rikishi.delete(match.eastRikishiId);

    const result = simulateBoutForToday(world, 0);
    expect(result.world).toBe(world);
    expect(result.result).toBeUndefined();
  });

  it("should simulate bout correctly when everything is valid", () => {
    let world = generateWorld("world-test-simulate-bout-4");
    world = startBasho(world, "natsu");

    const basho = world.currentBasho!;
    const todaysMatches = basho.matches.filter(m => m.day === basho.day && !m.result);
    expect(todaysMatches.length).toBeGreaterThan(0);

    const result = simulateBoutForToday(world, 0);
    expect(result.world).toBe(world);
    expect(result.result).toBeDefined();
  });
});
