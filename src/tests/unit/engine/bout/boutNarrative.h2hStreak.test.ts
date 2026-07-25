import { describe, it, expect, beforeEach } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { BardEngine } from "@/engine/bard/BardEngine";
import { mockRikishi, makeMockWorld } from "../utils";
import type { BoutResult, BashoName } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { H2HRecord } from "@/engine/types/records";

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

function makeBoutResult(overrides: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: "test-bout-h2h",
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

function makeH2H(overrides: Partial<H2HRecord> = {}): H2HRecord {
  return {
    wins: 3,
    losses: 2,
    streak: 3,
    lastMatch: null,
    ...overrides,
  } as H2HRecord;
}

const BASHO = "hatsu" as BashoName;

describe("generateBoutNarrative — true H2H streak (T20)", () => {
  beforeEach(() => {
    BardEngine.resetCache();
  });

  it("T20.1: streak >= 3 → H2H streak line with rivalry tag", () => {
    const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 5, currentBashoLosses: 3 });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 5 });
    east.h2h[west.id] = makeH2H({ streak: 5 });
    const world = makeWorld(east, west);
    const result = makeBoutResult();
    generateBoutNarrative(result, east, west, BASHO, 8, "seed-h2h-5", world);
    const streakLines = getPreBoutLines(result).filter((l) => l.tags?.includes("rivalry"));
    expect(streakLines.length).toBeGreaterThan(0);
  });

  it("T20.3: streak = 2 → no streak line (below threshold)", () => {
    const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 5, currentBashoLosses: 3 });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 5 });
    east.h2h[west.id] = makeH2H({ streak: 2 });
    const world = makeWorld(east, west);
    const result = makeBoutResult();
    generateBoutNarrative(result, east, west, BASHO, 8, "seed-h2h-2", world);
    const streakLines = getPreBoutLines(result).filter((l) => l.tags?.includes("rivalry"));
    expect(streakLines.length).toBe(0);
  });

  it("T20.4: streak = 0 → no streak line", () => {
    const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 5, currentBashoLosses: 3 });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 5 });
    east.h2h[west.id] = makeH2H({ streak: 0 });
    const world = makeWorld(east, west);
    const result = makeBoutResult();
    generateBoutNarrative(result, east, west, BASHO, 8, "seed-h2h-0", world);
    const streakLines = getPreBoutLines(result).filter((l) => l.tags?.includes("rivalry"));
    expect(streakLines.length).toBe(0);
  });

  it("T20.5: h2h entry missing → no streak line, no error", () => {
    const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 5, currentBashoLosses: 3 });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 5 });
    // No h2h entry set
    const world = makeWorld(east, west);
    const result = makeBoutResult();
    expect(() => {
      generateBoutNarrative(result, east, west, BASHO, 8, "seed-h2h-none", world);
    }).not.toThrow();
    const streakLines = getPreBoutLines(result).filter((l) => l.tags?.includes("rivalry"));
    expect(streakLines.length).toBe(0);
  });

  it("T20.2: negative streak (losing streak) → streak line from opponent perspective", () => {
    const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 5, currentBashoLosses: 3 });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 5 });
    east.h2h[west.id] = makeH2H({ streak: -4 });
    const world = makeWorld(east, west);
    const result = makeBoutResult();
    generateBoutNarrative(result, east, west, BASHO, 8, "seed-h2h-neg", world);
    const streakLines = getPreBoutLines(result).filter((l) => l.tags?.includes("rivalry"));
    expect(streakLines.length).toBeGreaterThan(0);
  });

  it("T20.10: no [MISSING:] tokens in H2H streak lines", () => {
    const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 5, currentBashoLosses: 3 });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 5 });
    east.h2h[west.id] = makeH2H({ streak: 6 });
    const world = makeWorld(east, west);
    const result = makeBoutResult();
    generateBoutNarrative(result, east, west, BASHO, 8, "seed-h2h-missing", world);
    for (const line of getPreBoutLines(result)) {
      expect(line.text).not.toContain("[MISSING:");
    }
  });
});
