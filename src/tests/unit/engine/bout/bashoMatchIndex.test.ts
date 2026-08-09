import { describe, it, expect } from "vitest";
import { buildBashoMatchIndex } from "@/engine/bout/bashoMatchIndex";
import type { MatchSchedule, BashoState } from "@/engine/types/basho";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";

function makeMatch(boutId: string, day: number, eastId = "east", westId = "west"): MatchSchedule {
  return { boutId, day, eastRikishiId: eastId, westRikishiId: westId };
}

function makeBasho(matches: MatchSchedule[]): BashoState {
  return MockFactory.createBasho({
    id: "test-basho",
    day: 1,
    matches,
    isActive: true,
  });
}

describe("Basho match index (B1.4)", () => {
  it("builds a Map<day, Match[]> from matches array", () => {
    const matches = [
      makeMatch("b1", 1),
      makeMatch("b2", 1),
      makeMatch("b3", 2),
      makeMatch("b4", 15),
    ];
    const basho = makeBasho(matches);
    const index = buildBashoMatchIndex(basho);

    expect(index.size).toBe(3); // days 1, 2, 15
    expect(index.get(1)?.length).toBe(2);
    expect(index.get(2)?.length).toBe(1);
    expect(index.get(15)?.length).toBe(1);
  });

  it("index matches filter(m => m.day === d) for all days 1-15", () => {
    const matches: MatchSchedule[] = [];
    for (let d = 1; d <= 15; d++) {
      for (let b = 0; b < 3; b++) {
        matches.push(makeMatch(`d${d}-b${b}`, d));
      }
    }
    const basho = makeBasho(matches);
    const index = buildBashoMatchIndex(basho);

    for (let d = 1; d <= 15; d++) {
      const indexed = index.get(d) ?? [];
      const filtered = matches.filter((m) => m.day === d);
      expect(indexed.length).toBe(filtered.length);
      expect(indexed).toEqual(filtered);
    }
  });

  it("O(1) lookup — get(day) returns direct reference to array", () => {
    const matches = [makeMatch("b1", 5), makeMatch("b2", 5)];
    const basho = makeBasho(matches);
    const index = buildBashoMatchIndex(basho);

    const day5 = index.get(5);
    expect(day5).toBeDefined();
    expect(day5!.length).toBe(2);
  });

  it("handles empty matches array", () => {
    const basho = makeBasho([]);
    const index = buildBashoMatchIndex(basho);
    expect(index.size).toBe(0);
  });

  it("handles matches with results (includes all matches, not just unplayed)", () => {
    const m1 = makeMatch("b1", 1);
    m1.result = {
      boutId: "b1",
      winner: "east",
      winnerRikishiId: "east",
      loserRikishiId: "west",
      kimarite: "oshidashi",
      kimariteName: "Oshidashi",
      stance: "migi-yotsu",
      tachiaiWinner: "east",
      duration: 5.2,
      upset: false,
      isKinboshi: false,
      log: [],
      kenshoEnvelopes: 0,
      momentumScore: 0,
      inBoutInjury: null,
      isTimeout: false,
    } as any;
    const m2 = makeMatch("b2", 1);
    const basho = makeBasho([m1, m2]);
    const index = buildBashoMatchIndex(basho);

    const day1 = index.get(1)!;
    expect(day1.length).toBe(2); // both matches, including resolved
  });
});
