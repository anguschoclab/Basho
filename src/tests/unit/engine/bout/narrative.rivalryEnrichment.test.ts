/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import type { PbpLine, PbpTag } from "@/engine/bout/boutNarrative";
import { mockRikishi } from "../utils";
import type { BoutResult } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";
import type { RivalriesState, RivalryPairState } from "@/constants/engine/rivalry";

function makeBoutResult(overrides: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: "test-bout-1",
    day: 7,
    eastId: "r1",
    westId: "r2",
    winner: "east",
    kimarite: "yorikiri",
    kimariteName: "Yorikiri",
    duration: 8,
    log: [],
    upset: false,
    kenshoEnvelopes: 0,
    ...overrides,
  } as BoutResult;
}

function getLines(result: BoutResult): PbpLine[] {
  return result.pbpLines ?? [];
}

function hasTag(l: PbpLine, tag: PbpTag): boolean {
  return (l.tags ?? []).includes(tag);
}

function makeRivalryPair(overrides: Partial<RivalryPairState> = {}): RivalryPairState {
  return {
    key: "r1|r2",
    aId: "r1",
    bId: "r2",
    heat: 50,
    meetings: 3,
    lastMetWeek: 1,
    aWins: 2,
    bWins: 1,
    closeness: 50,
    spite: 20,
    tone: "public_hype",
    triggers: {},
    sameHeya: false,
    lastKimarite: "yorikiri",
    lastWinnerId: "r1",
    ...overrides,
  } as RivalryPairState;
}

function makeWorldWithRivalry(pair?: RivalryPairState, eastId = "r1", westId = "r2"): WorldState {
  const rivalriesState: RivalriesState = {
    version: "1.0.0",
    pairs: pair ? { [pair.key]: pair } : {},
    decayedPairs: {},
  };
  return {
    rikishi: new Map([[eastId, mockRikishi(eastId)], [westId, mockRikishi(westId)]]),
    rivalriesState,
  } as unknown as WorldState;
}

describe("rivalry bout enrichment (7.2)", () => {
  it("grudge_match tag applied when rivalry heat > 70", () => {
    const east = mockRikishi("r1", { rank: "ozeki", division: "makuuchi" });
    const west = mockRikishi("r2", { rank: "ozeki", division: "makuuchi" });
    const pair = makeRivalryPair({ heat: 80, meetings: 5 });
    const world = makeWorldWithRivalry(pair);
    const result = makeBoutResult();

    generateBoutNarrative(result, east, west, undefined, 7, "grudge-match-seed", world);
    const lines = getLines(result);
    const grudgeLines = lines.filter((l) => hasTag(l, "grudge_match"));

    expect(grudgeLines.length).toBeGreaterThan(0);
  });

  it("no grudge_match tag when rivalry heat <= 70", () => {
    const east = mockRikishi("r1", { rank: "ozeki", division: "makuuchi" });
    const west = mockRikishi("r2", { rank: "ozeki", division: "makuuchi" });
    const pair = makeRivalryPair({ heat: 50, meetings: 3 });
    const world = makeWorldWithRivalry(pair);
    const result = makeBoutResult();

    generateBoutNarrative(result, east, west, undefined, 7, "no-grudge-seed", world);
    const lines = getLines(result);
    const grudgeLines = lines.filter((l) => hasTag(l, "grudge_match"));

    expect(grudgeLines.length).toBe(0);
  });

  it("rivalry interview question when meetings >= 3", () => {
    const east = mockRikishi("r1", { rank: "ozeki", division: "makuuchi" });
    const west = mockRikishi("r2", { rank: "ozeki", division: "makuuchi" });
    const pair = makeRivalryPair({ heat: 50, meetings: 4 });
    const world = makeWorldWithRivalry(pair);
    const result = makeBoutResult({ winner: "east" });

    generateBoutNarrative(result, east, west, undefined, 7, "rivalry-interview-seed", world);
    const lines = getLines(result);

    // Interview is RNG-gated, but if it fires, rivalry question should be present
    if (lines.some((l) => l.phase === "interview")) {
      const rivalryInterviewLines = lines.filter(
        (l) => l.phase === "interview" && hasTag(l, "rivalry")
      );
      expect(rivalryInterviewLines.length).toBeGreaterThan(0);
    }
  });

  it("no rivalry interview question when meetings < 3", () => {
    const east = mockRikishi("r1", { rank: "ozeki", division: "makuuchi" });
    const west = mockRikishi("r2", { rank: "ozeki", division: "makuuchi" });
    const pair = makeRivalryPair({ heat: 50, meetings: 2 });
    const world = makeWorldWithRivalry(pair);
    const result = makeBoutResult({ winner: "east" });

    generateBoutNarrative(result, east, west, undefined, 7, "no-rivalry-interview-seed", world);
    const lines = getLines(result);

    if (lines.some((l) => l.phase === "interview")) {
      const rivalryInterviewLines = lines.filter(
        (l) => l.phase === "interview" && hasTag(l, "rivalry")
      );
      expect(rivalryInterviewLines.length).toBe(0);
    }
  });

  it("rivalry opening lines present when pair has history", () => {
    const east = mockRikishi("r1", { rank: "ozeki", division: "makuuchi" });
    const west = mockRikishi("r2", { rank: "ozeki", division: "makuuchi" });
    const pair = makeRivalryPair({ heat: 60, meetings: 5, aWins: 4, bWins: 1 });
    const world = makeWorldWithRivalry(pair);
    const result = makeBoutResult();

    generateBoutNarrative(result, east, west, undefined, 7, "rivalry-opening-seed", world);
    const lines = getLines(result);
    const rivalryOpeningLines = lines.filter(
      (l) => l.phase === "opening" && hasTag(l, "rivalry")
    );

    expect(rivalryOpeningLines.length).toBeGreaterThan(0);
  });
});
