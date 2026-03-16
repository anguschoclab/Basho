import { describe, it, expect } from "vitest";
import { startBasho, endBasho, advanceBashoDay, applyBoutResult } from "../world";
import * as injuries from "../injuries";
import * as rivalries from "../rivalries";
import * as economics from "../economics";
import * as scoutingStore from "../scoutingStore";
import { mock } from "bun:test";
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

describe("applyBoutResult error handling", () => {
  it("should not halt bout resolution if a subsystem throws an error", () => {
    let world = generateWorld("world-apply-test");
    world.cyclePhase = "pre_basho";
    world.currentBashoName = "hatsu";
    world.year = 2025;
    world = startBasho(world, "hatsu");

    const match = world.currentBasho!.matches[0];
    const east = world.rikishi.get(match.eastRikishiId);
    const west = world.rikishi.get(match.westRikishiId);

    // Simulate a bout result
    const result = {
      winner: "east",
      winnerRikishiId: east.id,
      loserRikishiId: west.id,
      kimarite: "yorikiri",
      boutDuration: 10,
      isKinboshi: false
    };

    // Mock subsystems to throw errors
    const injuryMock = mock.module("../injuries", () => ({
      onBoutResolved: () => { throw new Error("Injury system failed"); }
    }));

    const rivalriesMock = mock.module("../rivalries", () => ({
      onBoutResolved: () => { throw new Error("Rivalries system failed"); }
    }));

    const economicsMock = mock.module("../economics", () => ({
      onBoutResolved: () => { throw new Error("Economics system failed"); }
    }));

    const scoutingMock = mock.module("../scoutingStore", () => ({
      onBoutResolved: () => { throw new Error("Scouting system failed"); }
    }));

    // Expect applyBoutResult not to throw an error
    expect(() => {
      applyBoutResult(world, match, result);
    }).not.toThrow();

    // Also verify that core logic still executed (standings updated)
    const standings = world.currentBasho!.standings;
    const winnerRec = standings.get(east.id);
    expect(winnerRec).toBeDefined();
    expect(winnerRec.wins).toBeGreaterThanOrEqual(1);

    // Clean up mocks is not strictly necessary for bun:test module mocks in this isolated script
  });
});
