import { describe, it, expect, beforeEach } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { BardEngine } from "@/engine/bard/BardEngine";
import { mockRikishi, makeMockWorld } from "../utils";
import type { BoutResult, BashoName } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";

function makeMinimalBoutResult(overrides: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: "test-bout",
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
      { phase: "tachiai", data: { tick: 0 } },
      { phase: "finish", data: {} },
    ],
    kenshoEnvelopes: 0,
    ...overrides,
  };
}

describe("boutNarrative generates entity link markup", () => {
  beforeEach(() => {
    BardEngine.resetCache();
  });

  it("pbpLines contain [[rikishi:...]] markup for east/west names", () => {
    const east = mockRikishi("r-east", { shikona: "Asanoyama", injured: false });
    const west = mockRikishi("r-west", { shikona: "Terunofuji", injured: false });
    const world = makeMockWorld({
      rikishi: new Map([
        ["r-east", east],
        ["r-west", west],
      ]),
    }) as WorldState;
    const result = makeMinimalBoutResult();

    generateBoutNarrative(
      result,
      east,
      west,
      "hatsu" as BashoName,
      1,
      "test-seed",
      world
    );

    expect(result.pbpLines).toBeDefined();
    expect(result.pbpLines!.length).toBeGreaterThan(0);

    const hasEntityLink = result.pbpLines!.some((line) =>
      /\[\[rikishi:r-(east|west):/.test(line.text)
    );
    expect(hasEntityLink).toBe(true);
  });

  it("finish line contains [[rikishi:...]] markup for winner and loser", () => {
    const east = mockRikishi("r-east", { shikona: "Asanoyama", injured: false });
    const west = mockRikishi("r-west", { shikona: "Terunofuji", injured: false });
    const world = makeMockWorld({
      rikishi: new Map([
        ["r-east", east],
        ["r-west", west],
      ]),
    }) as WorldState;
    const result = makeMinimalBoutResult({ winner: "east" });

    generateBoutNarrative(
      result,
      east,
      west,
      "hatsu" as BashoName,
      1,
      "test-seed-finish",
      world
    );

    const finishLine = result.pbpLines?.find((l) => l.id.endsWith("-finish"));
    expect(finishLine).toBeDefined();
    expect(finishLine!.text).toMatch(/\[\[rikishi:/);
  });
});
