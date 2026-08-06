 
import { describe, it, expect } from "vitest";
import { recordBashoHistory } from "@/engine/lifecycle/BashoHistory";
import type { MatchSchedule, BoutResult, BashoState, BashoName } from "@/engine/types/basho";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";

function makeResult(boutId: string, winnerId: string, loserId: string, kimarite: string = "yorikiri"): BoutResult {
  return {
    boutId, winner: "east", winnerRikishiId: winnerId, loserRikishiId: loserId,
    kimarite, kimariteName: kimarite, stance: "migi-yotsu", tachiaiWinner: "east",
    duration: 5.2, upset: false, isKinboshi: false, log: [], kenshoEnvelopes: 0,
  } as BoutResult;
}

function makeBasho(matches: MatchSchedule[]): BashoState {
  return {
    id: "test-basho", year: 2026, bashoNumber: 1, bashoName: "hatsu" as BashoName,
    day: 15, matches, standings: new Map([["east", { wins: 8, losses: 7 }]]), isActive: true,
  };
}

describe("BashoHistory - recordBashoHistory (Bug 1)", () => {
  it("Test 11.1: records history with match.result present", () => {
    const result = makeResult("b1", "east", "west");
    const matches: MatchSchedule[] = [
      { boutId: "b1", day: 1, eastRikishiId: "east", westRikishiId: "west", result },
    ];
    const basho = makeBasho(matches);
    const world = MockFactory.createWorld({ currentBasho: basho });
    const impact = recordBashoHistory(world, basho, "east", [], [], {}, 8);
    expect(impact).toBeDefined();
  });

  it("Test 11.2: handles missing match.result gracefully", () => {
    const matches: MatchSchedule[] = [
      { boutId: "b1", day: 1, eastRikishiId: "east", westRikishiId: "west" },
    ];
    const basho = makeBasho(matches);
    const world = MockFactory.createWorld({ currentBasho: basho });
    expect(() => recordBashoHistory(world, basho, "east", [], [], {}, 8)).not.toThrow();
  });

  it("Test 11.3: handles empty matches array", () => {
    const basho = makeBasho([]);
    const world = MockFactory.createWorld({ currentBasho: basho });
    expect(() => recordBashoHistory(world, basho, "east", [], [], {}, 8)).not.toThrow();
  });

  it("Test 11.4: handles missing currentBasho gracefully", () => {
    const world = MockFactory.createWorld({ currentBasho: undefined });
    const basho = makeBasho([]);
    expect(() => recordBashoHistory(world, basho, "east", [], [], {}, 8)).not.toThrow();
  });
});
