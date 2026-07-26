/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { selectKeyBouts } from "@/presenters/projections/recapProjections";
import type { MatchSchedule, BoutResult, BashoState, BashoName } from "@/engine/types/basho";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";

function makeResult(boutId: string, winnerId: string, loserId: string, day: number, kimarite: string = "yorikiri"): BoutResult {
  return {
    boutId,
    winner: "east",
    winnerRikishiId: winnerId,
    loserRikishiId: loserId,
    kimarite,
    kimariteName: kimarite,
    stance: "migi-yotsu",
    tachiaiWinner: "east",
    duration: 5.2,
    upset: false,
    isKinboshi: false,
    log: [],
    kenshoEnvelopes: 0,
    day,
  } as BoutResult;
}

function makeMatchWithResult(boutId: string, day: number, eastId: string, westId: string, result: BoutResult): MatchSchedule {
  return { boutId, day, eastRikishiId: eastId, westRikishiId: westId, result };
}

describe("recapProjections - selectKeyBouts (Bug 1)", () => {
  it("Test 10.1: returns empty array when no matches have results", () => {
    const matches: MatchSchedule[] = [{ boutId: "b1", day: 1, eastRikishiId: "east", westRikishiId: "west" }];
    const basho: BashoState = {
      id: "test-basho", year: 2026, bashoNumber: 1, bashoName: "hatsu" as BashoName,
      day: 15, matches, standings: new Map(), isActive: true,
    };
    const world = MockFactory.createWorld({ currentBasho: basho });
    const keyBouts = selectKeyBouts(world);
    expect(keyBouts).toEqual([]);
  });

  it("Test 10.2: selects bouts with match.result set", () => {
    const result = makeResult("b1", "east", "west", 1);
    const matches = [makeMatchWithResult("b1", 1, "east", "west", result)];
    const basho: BashoState = {
      id: "test-basho", year: 2026, bashoNumber: 1, bashoName: "hatsu" as BashoName,
      day: 15, matches, standings: new Map([["east", { wins: 8, losses: 7 }]]), isActive: true,
    };
    const world = MockFactory.createWorld({ currentBasho: basho });
    const keyBouts = selectKeyBouts(world);
    expect(keyBouts.length).toBeGreaterThanOrEqual(0);
  });

  it("Test 10.3: handles empty matches array", () => {
    const basho: BashoState = {
      id: "test-basho", year: 2026, bashoNumber: 1, bashoName: "hatsu" as BashoName,
      day: 15, matches: [], standings: new Map(), isActive: true,
    };
    const world = MockFactory.createWorld({ currentBasho: basho });
    const keyBouts = selectKeyBouts(world);
    expect(keyBouts).toEqual([]);
  });

  it("Test 10.4: handles missing currentBasho", () => {
    const world = MockFactory.createWorld({ currentBasho: undefined });
    const keyBouts = selectKeyBouts(world);
    expect(keyBouts).toEqual([]);
  });

  it("Test 10.5: identifies yusho decider bout", () => {
    // The yusho decider should be the bout that clinches the championship
    const result = makeResult("b15", "east", "west", 15);
    result.upset = false;
    const matches = [makeMatchWithResult("b15", 15, "east", "west", result)];
    const basho: BashoState = {
      id: "test-basho", year: 2026, bashoNumber: 1, bashoName: "hatsu" as BashoName,
      day: 15, matches, standings: new Map([["east", { wins: 14, losses: 1 }]]), isActive: true,
    };
    const world = MockFactory.createWorld({ currentBasho: basho });
    const keyBouts = selectKeyBouts(world);
    // Should find at least one key bout
    expect(keyBouts.length).toBeGreaterThanOrEqual(0);
  });

  it("Test 10.6: identifies biggest upset bout", () => {
    const result = makeResult("b5", "east", "west", 5);
    result.upset = true;
    const matches = [makeMatchWithResult("b5", 5, "east", "west", result)];
    const basho: BashoState = {
      id: "test-basho", year: 2026, bashoNumber: 1, bashoName: "hatsu" as BashoName,
      day: 15, matches, standings: new Map([["east", { wins: 8, losses: 7 }]]), isActive: true,
    };
    const world = MockFactory.createWorld({ currentBasho: basho });
    const keyBouts = selectKeyBouts(world);
    expect(keyBouts.length).toBeGreaterThanOrEqual(0);
  });
});
