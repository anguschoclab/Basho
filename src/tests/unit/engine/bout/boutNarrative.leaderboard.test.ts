import { describe, it, expect, beforeEach } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { BardEngine } from "@/engine/bard/BardEngine";
import { mockRikishi, makeMockWorld, makeMockBasho } from "../utils";
import type { BoutResult, BashoName } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

function makeBoutResult(overrides: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: "test-bout-leaderboard",
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

function makeWorldWithStandings(
  east: Rikishi,
  west: Rikishi,
  standingsMap: Map<string, { wins: number; losses: number }>,
  day: number = 5,
): WorldState {
  const basho = makeMockBasho({ day, standings: standingsMap as any });
  return makeMockWorld({
    rikishi: new Map([
      [east.id, east],
      [west.id, west],
    ]),
    currentBasho: basho,
  }) as WorldState;
}

function getPreBoutLines(result: BoutResult) {
  return (result.pbpLines ?? []).filter((l) => l.phase === "pre_bout");
}

const BASHO = "hatsu" as BashoName;

describe("generateBoutNarrative — leaderboard computation (T23)", () => {
  beforeEach(() => {
    BardEngine.resetCache();
  });

  it("T23.1: clear leader → leaderboard line with leader name and win count", () => {
    const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 5, currentBashoLosses: 0 });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 2 });
    const standings = new Map([
      ["r-east", { wins: 5, losses: 0 }],
      ["r-west", { wins: 3, losses: 2 }],
    ]);
    const world = makeWorldWithStandings(east, west, standings, 5);
    const result = makeBoutResult();
    generateBoutNarrative(result, east, west, BASHO, 5, "seed-lb-clear", world);
    const lbLines = getPreBoutLines(result).filter((l) => l.tags?.includes("tournament_context"));
    expect(lbLines.length).toBeGreaterThan(0);
  });

  it("T23.6: all rikishi 0-0 (day 1) → no leaderboard line", () => {
    const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 0, currentBashoLosses: 0 });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 0, currentBashoLosses: 0 });
    const standings = new Map([
      ["r-east", { wins: 0, losses: 0 }],
      ["r-west", { wins: 0, losses: 0 }],
    ]);
    const world = makeWorldWithStandings(east, west, standings, 1);
    const result = makeBoutResult();
    generateBoutNarrative(result, east, west, BASHO, 1, "seed-lb-day1", world);
    const lbLines = getPreBoutLines(result).filter((l) => l.tags?.includes("tournament_context"));
    expect(lbLines.length).toBe(0);
  });

  it("T23.7: leader at 3 wins (day 5) → no leaderboard line (below 4-win threshold)", () => {
    const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 3, currentBashoLosses: 2 });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 2, currentBashoLosses: 3 });
    const standings = new Map([
      ["r-east", { wins: 3, losses: 2 }],
      ["r-west", { wins: 2, losses: 3 }],
    ]);
    const world = makeWorldWithStandings(east, west, standings, 5);
    const result = makeBoutResult();
    generateBoutNarrative(result, east, west, BASHO, 5, "seed-lb-low", world);
    const lbLines = getPreBoutLines(result).filter((l) => l.tags?.includes("tournament_context"));
    expect(lbLines.length).toBe(0);
  });

  it("T23.8: leader at 5+ wins (day 5+) → leaderboard line emitted", () => {
    const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 5, currentBashoLosses: 0 });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 2 });
    const standings = new Map([
      ["r-east", { wins: 5, losses: 0 }],
      ["r-west", { wins: 3, losses: 2 }],
    ]);
    const world = makeWorldWithStandings(east, west, standings, 5);
    const result = makeBoutResult();
    generateBoutNarrative(result, east, west, BASHO, 5, "seed-lb-5wins", world);
    const lbLines = getPreBoutLines(result).filter((l) => l.tags?.includes("tournament_context"));
    expect(lbLines.length).toBeGreaterThan(0);
  });

  it("T23.11: no [MISSING:] tokens in leaderboard lines", () => {
    const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 6, currentBashoLosses: 0 });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 4, currentBashoLosses: 2 });
    const standings = new Map([
      ["r-east", { wins: 6, losses: 0 }],
      ["r-west", { wins: 4, losses: 2 }],
    ]);
    const world = makeWorldWithStandings(east, west, standings, 6);
    const result = makeBoutResult();
    generateBoutNarrative(result, east, west, BASHO, 6, "seed-lb-missing", world);
    for (const line of getPreBoutLines(result)) {
      expect(line.text).not.toContain("[MISSING:");
    }
  });
});
