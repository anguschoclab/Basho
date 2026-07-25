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
    boutId: "test-bout-tournament",
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

function makeWorld(east: Rikishi, west: Rikishi, overrides: Partial<WorldState> = {}): WorldState {
  return makeMockWorld({
    rikishi: new Map([
      [east.id, east],
      [west.id, west],
    ]),
    ...overrides,
  }) as WorldState;
}

function getPreBoutLines(result: BoutResult) {
  return (result.pbpLines ?? []).filter((l) => l.phase === "pre_bout");
}

const BASHO = "hatsu" as BashoName;

describe("generateBoutNarrative — tournament day context (T18)", () => {
  beforeEach(() => {
    BardEngine.resetCache();
  });

  it("T18.4: senshuraku (day 15) → senshuraku line with tag", () => {
    const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 10, currentBashoLosses: 4 });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 9, currentBashoLosses: 5 });
    const world = makeWorld(east, west);
    const result = makeBoutResult();
    generateBoutNarrative(result, east, west, BASHO, 15, "seed-senshuraku", world);
    const senshurakuLines = getPreBoutLines(result).filter((l) => l.tags?.includes("senshuraku"));
    expect(senshurakuLines.length).toBeGreaterThan(0);
  });

  it("T18.9: isYushoRace → yusho_race line", () => {
    const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 12, currentBashoLosses: 2 });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 12, currentBashoLosses: 2 });
    const world = makeWorld(east, west);
    const result = makeBoutResult({ isYushoRace: true });
    generateBoutNarrative(result, east, west, BASHO, 13, "seed-yusho-race", world);
    const yushoLines = getPreBoutLines(result).filter((l) => l.tags?.includes("yusho_race"));
    expect(yushoLines.length).toBeGreaterThan(0);
  });

  it("T18.10: day 2-4 → no senshuraku or yusho_race tag (early days)", () => {
    const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 1, currentBashoLosses: 1 });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 1, currentBashoLosses: 1 });
    const world = makeWorld(east, west);
    const result = makeBoutResult();
    generateBoutNarrative(result, east, west, BASHO, 3, "seed-early-day", world);
    const senshurakuLines = getPreBoutLines(result).filter((l) => l.tags?.includes("senshuraku"));
    expect(senshurakuLines.length).toBe(0);
  });

  it("T18.6: day 5+ with standings leader → leaderboard line", () => {
    const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 5, currentBashoLosses: 0 });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 2 });
    const standings = new Map([
      ["r-east", { wins: 5, losses: 0 }],
      ["r-west", { wins: 3, losses: 2 }],
    ]);
    const basho = makeMockBasho({ day: 5, standings: standings as any });
    const world = makeWorld(east, west, { currentBasho: basho });
    const result = makeBoutResult();
    generateBoutNarrative(result, east, west, BASHO, 5, "seed-leaderboard", world);
    const lbLines = getPreBoutLines(result).filter((l) => l.tags?.includes("tournament_context"));
    expect(lbLines.length).toBeGreaterThan(0);
  });

  it("T18.7: day 5+ with empty standings → no leaderboard line, no error", () => {
    const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 5, currentBashoLosses: 0 });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3, currentBashoLosses: 2 });
    const basho = makeMockBasho({ day: 5, standings: new Map() });
    const world = makeWorld(east, west, { currentBasho: basho });
    const result = makeBoutResult();
    expect(() => {
      generateBoutNarrative(result, east, west, BASHO, 5, "seed-empty-standings", world);
    }).not.toThrow();
  });

  it("T18.14: deterministic — same seed → same tournament context lines", () => {
    const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 10, currentBashoLosses: 4 });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 9, currentBashoLosses: 5 });
    const world = makeWorld(east, west);
    const r1 = makeBoutResult();
    const r2 = makeBoutResult();
    generateBoutNarrative(r1, east, west, BASHO, 15, "seed-tournament-det", world);
    generateBoutNarrative(r2, east, west, BASHO, 15, "seed-tournament-det", world);
    expect(getPreBoutLines(r1).map((l) => l.text)).toEqual(getPreBoutLines(r2).map((l) => l.text));
  });

  it("T18.15: no [MISSING:] tokens in tournament context lines", () => {
    const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 10, currentBashoLosses: 4 });
    const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 9, currentBashoLosses: 5 });
    const world = makeWorld(east, west);
    const result = makeBoutResult();
    generateBoutNarrative(result, east, west, BASHO, 15, "seed-tournament-missing", world);
    for (const line of getPreBoutLines(result)) {
      expect(line.text).not.toContain("[MISSING:");
    }
  });
});
