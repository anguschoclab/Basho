/**
 * Golden-master characterization for generateBoutNarrative (2,623-LOC pipeline).
 *
 * Written BEFORE the bout/narrative/ pipeline split. Snapshots the exact
 * result.pbpLines array (text, phase, tags, ids) across a fixture matrix.
 * Byte-for-byte equivalence is required after every extraction step.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { BardEngine } from "@/engine/bard/BardEngine";
import { mockRikishi, makeMockWorld } from "../utils";
import type { BoutResult, BashoName } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";

function makeResult(overrides: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: "gm-bout",
    winner: "east",
    winnerRikishiId: "r-east",
    loserRikishiId: "r-west",
    kimarite: "yorikiri",
    kimariteName: "Yorikiri",
    stance: "migi-yotsu",
    tachiaiWinner: "east",
    duration: 8.5,
    upset: false,
    isKinboshi: false,
    log: [
      { phase: "tachiai", data: { tick: 0, tachiaiWinner: "east", margin: 10 } },
      {
        phase: "engagement",
        data: { tick: 1, family: "push", attackerSide: "east", forceDiff: 12 },
      },
      { phase: "finish", data: { tick: 8, kimarite: "yorikiri" } },
    ],
    kenshoEnvelopes: 0,
    momentumScore: 0,
    inBoutInjury: null,
    isTimeout: false,
    ...overrides,
  } as BoutResult;
}

function makeWorld(
  east: ReturnType<typeof mockRikishi>,
  west: ReturnType<typeof mockRikishi>
): WorldState {
  return makeMockWorld({
    rikishi: new Map([
      [east.id, east],
      [west.id, west],
    ]),
  }) as WorldState;
}

function narrate(
  result: BoutResult,
  east = mockRikishi("r-east"),
  west = mockRikishi("r-west"),
  day = 1,
  seed = "gm-seed",
  bashoName = "hatsu" as BashoName
) {
  generateBoutNarrative(result, east, west, bashoName, day, seed, makeWorld(east, west));
  return result.pbpLines;
}

describe("generateBoutNarrative — golden master", () => {
  beforeEach(() => BardEngine.resetCache());

  it("minimal bout, day 1", () => {
    expect(narrate(makeResult())).toMatchSnapshot();
  });

  it("mid-basho day 8 with records", () => {
    const east = mockRikishi("r-east", { currentBashoWins: 5, currentBashoLosses: 2 });
    const west = mockRikishi("r-west", { currentBashoWins: 4, currentBashoLosses: 3 });
    expect(narrate(makeResult(), east, west, 8)).toMatchSnapshot();
  });

  it("final day senshuraku", () => {
    const east = mockRikishi("r-east", { currentBashoWins: 9, currentBashoLosses: 5 });
    const west = mockRikishi("r-west", { currentBashoWins: 7, currentBashoLosses: 7 });
    expect(narrate(makeResult(), east, west, 15)).toMatchSnapshot();
  });

  it("7-7 pressure both sides", () => {
    const east = mockRikishi("r-east", { currentBashoWins: 7, currentBashoLosses: 7 });
    const west = mockRikishi("r-west", { currentBashoWins: 7, currentBashoLosses: 7 });
    expect(narrate(makeResult(), east, west, 14)).toMatchSnapshot();
  });

  it("winning streak callout", () => {
    const east = mockRikishi("r-east", { currentBashoWins: 13, currentBashoLosses: 0 });
    const west = mockRikishi("r-west", { currentBashoWins: 4, currentBashoLosses: 9 });
    expect(narrate(makeResult(), east, west, 13)).toMatchSnapshot();
  });

  it("upset + kinboshi + kensho", () => {
    const east = mockRikishi("r-east", { rank: "maegashira", rankNumber: 12 });
    const west = mockRikishi("r-west", { rank: "yokozuna" });
    expect(
      narrate(makeResult({ upset: true, isKinboshi: true, kenshoEnvelopes: 20 }), east, west, 9)
    ).toMatchSnapshot();
  });

  it("in-bout injury narrative", () => {
    expect(
      narrate(
        makeResult({
          inBoutInjury: {
            rikishiId: "r-west",
            area: "knee",
            severity: "moderate",
            triggerEvent: "twist",
          } as never,
        }),
        mockRikishi("r-east"),
        mockRikishi("r-west"),
        5
      )
    ).toMatchSnapshot();
  });

  it("timeout bout", () => {
    expect(
      narrate(makeResult({ isTimeout: true, duration: 240 }), undefined, undefined, 10)
    ).toMatchSnapshot();
  });

  it("multi-frame log coverage", () => {
    expect(
      narrate(
        makeResult({
          log: [
            { phase: "tachiai", data: { tick: 0, tachiaiWinner: "west", margin: 4 } },
            {
              phase: "engagement",
              data: { tick: 1, family: "belt", attackerSide: "west", torqueAdvantage: 8 },
            },
            { phase: "clinch", data: { tick: 3 } },
            { phase: "momentum", data: { tick: 5, shift: "east" } },
            { phase: "edge_crisis", data: { tick: 7, side: "west" } },
            { phase: "finish", data: { tick: 9, kimarite: "oshidashi" } },
          ],
          winner: "west",
          winnerRikishiId: "r-west",
          loserRikishiId: "r-east",
          tachiaiWinner: "west",
          kimarite: "oshidashi",
          kimariteName: "Oshidashi",
        }),
        mockRikishi("r-east"),
        mockRikishi("r-west"),
        6
      )
    ).toMatchSnapshot();
  });

  it("different seeds produce different-but-stable output", () => {
    const a = narrate(makeResult(), undefined, undefined, 3, "seed-A");
    const b = narrate(makeResult(), undefined, undefined, 3, "seed-B");
    expect(a).toMatchSnapshot();
    expect(b).toMatchSnapshot();
  });
});
