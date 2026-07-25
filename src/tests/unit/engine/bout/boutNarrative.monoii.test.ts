import { describe, it, expect, beforeEach } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { BardEngine } from "@/engine/bard/BardEngine";
import { mockRikishi, makeMockWorld } from "../utils";
import type { BoutResult, BashoName } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

function makeBoutResult(overrides: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: "test-bout-monoii",
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
      { phase: "finish", data: {} },
    ],
    kenshoEnvelopes: 0,
    ...overrides,
  };
}

function makeWorld(east: Rikishi, west: Rikishi): WorldState {
  return makeMockWorld({
    rikishi: new Map([
      [east.id, east],
      [west.id, west],
    ]),
  }) as WorldState;
}

function getMonoiiLines(result: BoutResult) {
  return (result.pbpLines ?? []).filter((l) => l.phase === "mono_ii");
}

const BASHO = "hatsu" as BashoName;

describe("generateBoutNarrative — mono-ii stub (T14)", () => {
  beforeEach(() => {
    BardEngine.resetCache();
  });

  it("T14.1: result.monoii = true → mono_ii phase line with drama tag", () => {
    const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 5, currentBashoLosses: 3 });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 4, currentBashoLosses: 4 });
    const world = makeWorld(east, west);
    const result = makeBoutResult({ monoii: true } as any);
    generateBoutNarrative(result, east, west, BASHO, 8, "seed-monoii-1", world);
    const monoiiLines = getMonoiiLines(result);
    expect(monoiiLines.length).toBeGreaterThan(0);
    expect(monoiiLines[0].tags).toContain("drama");
  });

  it("T14.2: result.monoii undefined → no mono_ii line", () => {
    const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 5, currentBashoLosses: 3 });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 4, currentBashoLosses: 4 });
    const world = makeWorld(east, west);
    const result = makeBoutResult();
    generateBoutNarrative(result, east, west, BASHO, 8, "seed-monoii-undef", world);
    const monoiiLines = getMonoiiLines(result);
    expect(monoiiLines.length).toBe(0);
  });

  it("T14.3: no error when result.monoii is undefined", () => {
    const east = mockRikishi("r-east", { shikona: "Alpha" });
    const west = mockRikishi("r-west", { shikona: "Beta" });
    const world = makeWorld(east, west);
    const result = makeBoutResult();
    expect(() => {
      generateBoutNarrative(result, east, west, BASHO, 8, "seed-monoii-noerr", world);
    }).not.toThrow();
  });

  it("T14.4: no [MISSING:] tokens in mono_ii lines", () => {
    const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 5, currentBashoLosses: 3 });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 4, currentBashoLosses: 4 });
    const world = makeWorld(east, west);
    const result = makeBoutResult({ monoii: true } as any);
    generateBoutNarrative(result, east, west, BASHO, 8, "seed-monoii-missing", world);
    for (const line of getMonoiiLines(result)) {
      expect(line.text).not.toContain("[MISSING:");
    }
  });
});
