import { describe, it, expect } from "vitest";
import { startBasho, endBasho, advanceBashoDay } from "../world";
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
