import { describe, it, expect } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { BashoName, BoutResult } from "@/engine/types/basho";

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

function makeRikishi(id: string, opts?: Record<string, any>): Rikishi {
  return {
    id,
    shikona: id === "east" ? "East Rikishi" : "West Rikishi",
    careerWins: 10,
    careerLosses: 5,
    currentBashoWins: 0,
    currentBashoLosses: 0,
    makuuchiWins: 0,
    divisionRecords: {
      makuuchi: { wins: 0, losses: 0 },
      juryo: { wins: 0, losses: 0 },
      makushita: { wins: 0, losses: 0 },
      sandanme: { wins: 0, losses: 0 },
      jonidan: { wins: 0, losses: 0 },
      jonokuchi: { wins: 0, losses: 0 },
    },
    division: "makuuchi",
    rank: "maegashira",
    side: id === "east" ? "east" : "west",
    stats: { achievements: undefined },
    heyaId: "test-heya",
    ...opts,
  } as unknown as Rikishi;
}

function makeWorld(opts?: {
  east?: Record<string, any>;
  west?: Record<string, any>;
  standings?: Map<string, { wins: number; losses: number; absences?: number }>;
  day?: number;
}): { world: WorldState; east: Rikishi; west: Rikishi; result: BoutResult } {
  const east = makeRikishi("east", opts?.east);
  const west = makeRikishi("west", opts?.west);

  const world: Partial<WorldState> = {
    rikishi: new Map([
      ["east", east],
      ["west", west],
    ]),
    heyas: new Map([
      ["test-heya", { id: "test-heya", name: "Test Heya", rikishiIds: ["east", "west"] } as any],
    ]),
    calendar: { currentWeek: 1, month: 1, year: 2025, currentDay: opts?.day ?? 7 },
    currentBasho: {
      id: "test-basho",
      year: 2025,
      day: opts?.day ?? 7,
      bashoName: "hatsu" as BashoName,
      bashoNumber: 1,
      matches: [],
      standings:
        opts?.standings ??
        new Map([
          ["east", { wins: 0, losses: 0, absences: 0 }],
          ["west", { wins: 0, losses: 0, absences: 0 }],
        ]),
      isActive: true,
    },
    history: [],
  };

  const result: BoutResult = {
    boutId: "test-bout",
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
  };

  return { world: world as WorldState, east, west, result };
}

function hasFallsOutLine(result: BoutResult): boolean {
  return (result.pbpLines ?? []).some(
    (l) => l.tags?.includes("yusho_race") && l.text?.includes("falls")
  );
}

describe("Bug 3.3: falls_out condition", () => {
  it("F.1: falls_out fires when loser was co-leader (preBoutMaxWins) and winner surpasses", () => {
    // Setup: east and west both at 7 wins (co-leaders). East wins, west loses.
    // preBoutMaxWins = 7. After bout: east has 8, west has 7.
    // loserPrevWins (west) = 7 === preBoutMaxWins (7), winnerWins+1 (8) > preBoutMaxWins (7)
    // → falls_out should fire
    const { world, east, west, result } = makeWorld({
      east: { currentBashoWins: 7 },
      west: { currentBashoWins: 7 },
      standings: new Map([
        ["east", { wins: 7, losses: 0, absences: 0 }],
        ["west", { wins: 7, losses: 0, absences: 0 }],
      ]),
      day: 8,
    });
    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 8, "test-seed-f1", world);
    // This should FAIL before fix (condition unreachable), PASS after fix
    expect(hasFallsOutLine(result)).toBe(true);
  });

  it("F.2: falls_out does NOT fire when loser was not co-leader", () => {
    // Setup: east at 8 wins, west at 5 wins. East wins.
    // loserPrevWins (west) = 5 !== preBoutMaxWins (8)
    // → falls_out should NOT fire
    const { world, east, west, result } = makeWorld({
      east: { currentBashoWins: 8 },
      west: { currentBashoWins: 5 },
      standings: new Map([
        ["east", { wins: 8, losses: 0, absences: 0 }],
        ["west", { wins: 5, losses: 3, absences: 0 }],
      ]),
      day: 9,
    });
    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 9, "test-seed-f2", world);
    expect(hasFallsOutLine(result)).toBe(false);
  });

  it("F.3: falls_out does NOT fire when winner ties but doesn't surpass preBoutMaxWins", () => {
    // Setup: a third rikishi at 8 wins, east at 7, west at 7.
    // East wins → east has 8, ties the leader but doesn't surpass.
    // loserPrevWins (west) = 7 !== preBoutMaxWins (8)
    // → falls_out should NOT fire
    const { world, east, west, result } = makeWorld({
      east: { currentBashoWins: 7 },
      west: { currentBashoWins: 7 },
      standings: new Map([
        ["east", { wins: 7, losses: 1, absences: 0 }],
        ["west", { wins: 7, losses: 1, absences: 0 }],
        ["other", { wins: 8, losses: 0, absences: 0 }],
      ]),
      day: 9,
    });
    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 9, "test-seed-f3", world);
    expect(hasFallsOutLine(result)).toBe(false);
  });

  it("F.4: falls_out fires correctly when third rikishi is sole leader (loser drops from co-leader)", () => {
    // Setup: "other" at 9 wins (sole leader), east at 8, west at 8 (co-leaders at 8).
    // East wins → east has 9, west stays at 8.
    // preBoutMaxWins = 9 (other is sole leader).
    // loserPrevWins (west) = 8 !== preBoutMaxWins (9) → falls_out should NOT fire
    // Actually, west was co-leader at 8, not at 9. So this should NOT fire.
    // Let's adjust: other at 8, east at 8, west at 8 (all co-leaders).
    // East wins → east has 9, west stays at 8.
    // preBoutMaxWins = 8. loserPrevWins (west) = 8 === preBoutMaxWins (8).
    // winnerWins+1 (9) > preBoutMaxWins (8) → falls_out should fire
    const { world, east, west, result } = makeWorld({
      east: { currentBashoWins: 8 },
      west: { currentBashoWins: 8 },
      standings: new Map([
        ["east", { wins: 8, losses: 0, absences: 0 }],
        ["west", { wins: 8, losses: 0, absences: 0 }],
        ["other", { wins: 8, losses: 0, absences: 0 }],
      ]),
      day: 9,
    });
    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 9, "test-seed-f4", world);
    // This should FAIL before fix (condition unreachable), PASS after fix
    expect(hasFallsOutLine(result)).toBe(true);
  });
});
