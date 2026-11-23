/**
 * Spec (RED) — WS-10 deferred retunes.
 *
 * Even-day west priority (real torikumi convention): within a rank number,
 * the east-listed rikishi takes pairing priority on odd days and the west
 * man on even days — the committee alternates who gets the nominally
 * tougher draw. Applied only to pairing-priority queues (record buckets,
 * pull-up selection), never to seniority ordering.
 *
 * Bubble pairing, days 13–15 (verification): same-record 7-7 men pair
 * inside their wins bucket — the kachi-koshi/make-koshi decider the real
 * committee builds late in the fortnight.
 */
import { describe, it, expect } from "vitest";
import { buildSwissTorikumi } from "@/engine/matchmaking/index";
import { MockFactory } from "@tests/helpers/utils/MockFactory";

function m(id: string, num: number, side: "east" | "west") {
  return MockFactory.createRikishi(id, {
    rank: "maegashira",
    rankNumber: num,
    division: "makuuchi",
    heyaId: `h-${id}`,
    side,
  });
}

describe("even-day west priority", () => {
  // Odd bucket [M5e] pulls from the lower bucket's top-priority man:
  // [M8e, M8w] — odd days pull M8e, even days pull M8w.
  function pullUpScenario(day: number) {
    const m5e = m("m5e", 5, "east");
    const m8e = m("m8e", 8, "east");
    const m8w = m("m8w", 8, "west");
    const basho = MockFactory.createBasho({
      day,
      standings: new Map([
        ["m5e", { wins: 5, losses: day - 1 - 5 }],
        ["m8e", { wins: 4, losses: day - 1 - 4 }],
        ["m8w", { wins: 4, losses: day - 1 - 4 }],
      ]),
    });
    return buildSwissTorikumi(basho, [m5e, m8e, m8w], {
      seed: `parity-d${day}`,
      division: "makuuchi",
    });
  }

  it("odd day pulls the east man up from the lower record bucket", () => {
    const pairings = pullUpScenario(9);
    const pullUpBout = pairings.find(
      (p) => p.eastId === "m5e" || p.westId === "m5e"
    );
    expect(pullUpBout).toBeDefined();
    const opp = pullUpBout!.eastId === "m5e" ? pullUpBout!.westId : pullUpBout!.eastId;
    expect(opp).toBe("m8e");
  });

  it("even day pulls the west man up from the lower record bucket", () => {
    const pairings = pullUpScenario(10);
    const pullUpBout = pairings.find(
      (p) => p.eastId === "m5e" || p.westId === "m5e"
    );
    expect(pullUpBout).toBeDefined();
    const opp = pullUpBout!.eastId === "m5e" ? pullUpBout!.westId : pullUpBout!.eastId;
    expect(opp).toBe("m8w");
  });
});

describe("bubble pairing — days 13–15 (verification)", () => {
  it("7-7 men pair inside their own wins bucket on day 14", () => {
    const bubbleA = m("ba", 10, "east");
    const bubbleB = m("bb", 11, "west");
    const winner1 = m("w1", 1, "east");
    const winner2 = m("w2", 2, "west");
    const basho = MockFactory.createBasho({
      day: 14,
      standings: new Map([
        ["ba", { wins: 7, losses: 6 }],
        ["bb", { wins: 7, losses: 6 }],
        ["w1", { wins: 12, losses: 1 }],
        ["w2", { wins: 12, losses: 1 }],
      ]),
    });
    const pairings = buildSwissTorikumi(basho, [bubbleA, bubbleB, winner1, winner2], {
      seed: "bubble-d14",
      division: "makuuchi",
    });
    const bubbleBout = pairings.find(
      (p) =>
        (p.eastId === "ba" && p.westId === "bb") ||
        (p.eastId === "bb" && p.westId === "ba")
    );
    expect(bubbleBout).toBeDefined();
    const winnerBout = pairings.find(
      (p) =>
        (p.eastId === "w1" && p.westId === "w2") ||
        (p.eastId === "w2" && p.westId === "w1")
    );
    expect(winnerBout).toBeDefined();
  });
});
