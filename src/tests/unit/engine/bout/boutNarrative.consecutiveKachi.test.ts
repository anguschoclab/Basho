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
    boutId: "test-bout-consec-kachi",
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

function getPreBoutLines(result: BoutResult) {
  return (result.pbpLines ?? []).filter((l) => l.phase === "pre_bout");
}

const BASHO = "hatsu" as BashoName;

describe("generateBoutNarrative — consecutive kachi-koshi (T15)", () => {
  beforeEach(() => {
    BardEngine.resetCache();
  });

  it("T15.1: consecutiveKachiKoshi >= 3 → consecutive_kachi line in pre_bout", () => {
    const east = mockRikishi("r-east", {
      shikona: "Alpha",
      consecutiveKachiKoshi: 3,
      currentBashoWins: 8,
      currentBashoLosses: 3,
    });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 8 });
    const world = makeWorld(east, west);
    const result = makeBoutResult();
    generateBoutNarrative(result, east, west, BASHO, 12, "seed-ck-3", world);
    const ckLines = getPreBoutLines(result).filter((l) => l.tags?.includes("consecutive_kachi"));
    expect(ckLines.length).toBeGreaterThan(0);
    expect(ckLines[0].text).toContain("Alpha");
  });

  it("T15.2: consecutiveKachiKoshi = 0 → no consecutive_kachi line", () => {
    const east = mockRikishi("r-east", {
      shikona: "Alpha",
      consecutiveKachiKoshi: 0,
      currentBashoWins: 8,
      currentBashoLosses: 3,
    });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 8 });
    const world = makeWorld(east, west);
    const result = makeBoutResult();
    generateBoutNarrative(result, east, west, BASHO, 12, "seed-ck-0", world);
    const ckLines = getPreBoutLines(result).filter((l) => l.tags?.includes("consecutive_kachi"));
    expect(ckLines.length).toBe(0);
  });

  it("T15.3: consecutiveKachiKoshi = 5 → consecutive line with streak number", () => {
    const east = mockRikishi("r-east", {
      shikona: "Alpha",
      consecutiveKachiKoshi: 5,
      currentBashoWins: 8,
      currentBashoLosses: 3,
    });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 8 });
    const world = makeWorld(east, west);
    const result = makeBoutResult();
    generateBoutNarrative(result, east, west, BASHO, 12, "seed-ck-5", world);
    const ckLines = getPreBoutLines(result).filter((l) => l.tags?.includes("consecutive_kachi"));
    expect(ckLines.length).toBeGreaterThan(0);
    expect(ckLines[0].text).toContain("5");
  });

  it("T15.4: consecutiveKachiKoshi undefined → no error", () => {
    const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 8, currentBashoLosses: 3 });
    delete (east as any).consecutiveKachiKoshi;
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 8 });
    const world = makeWorld(east, west);
    const result = makeBoutResult();
    expect(() => {
      generateBoutNarrative(result, east, west, BASHO, 12, "seed-ck-undef", world);
    }).not.toThrow();
    const ckLines = getPreBoutLines(result).filter((l) => l.tags?.includes("consecutive_kachi"));
    expect(ckLines.length).toBe(0);
  });

  it("T15.5: no [MISSING:] tokens", () => {
    const east = mockRikishi("r-east", {
      shikona: "Alpha",
      consecutiveKachiKoshi: 4,
      currentBashoWins: 8,
      currentBashoLosses: 3,
    });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 8 });
    const world = makeWorld(east, west);
    const result = makeBoutResult();
    generateBoutNarrative(result, east, west, BASHO, 12, "seed-ck-missing", world);
    for (const line of result.pbpLines ?? []) {
      expect(line.text).not.toContain("[MISSING:");
    }
  });
});
