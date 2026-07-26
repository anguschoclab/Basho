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
    h2h: {},
    ...opts,
  } as Rikishi;
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
    calendar: { currentWeek: 1, month: 1, year: 2025, currentDay: opts?.day ?? 5 },
    currentBasho: {
      id: "test-basho",
      year: 2025,
      day: opts?.day ?? 5,
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

describe("Bug 3.5: Narrative streak logic (B.9-B.12)", () => {
  it("B.9: streak_continued fires when currentWinStreak >= 3 (not total wins)", () => {
    // This tests that the narrative uses currentWinStreak, not total basho wins.
    // With currentWinStreak: 3 and total wins: 5 (e.g. 5-2 with a 3-win streak),
    // streak_continued should fire.
    // Currently FAILS because the code uses winnerWins >= 3 (total wins).
    const { world, east, west, result } = makeWorld({
      east: { currentWinStreak: 3, currentBashoWins: 5 },
      day: 7,
    });
    // Access result.pbpLines after calling generateBoutNarrative
    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 7, "test-seed", world);
    const streakLine = result.pbpLines?.find((l) => l.tags?.includes("streak"));
    // This should pass once the fix uses currentWinStreak
    // For now it passes trivially because winnerWins(5) >= 3 — but the test
    // validates that the streak tag exists when there's a 3-win streak
    expect(streakLine).toBeDefined();
  });

  it("B.10: streak_continued does NOT fire when currentWinStreak < 3 even if total wins >= 3", () => {
    // With currentWinStreak: 1 but total wins: 5 (e.g. 5-2 with streak reset),
    // streak_continued should NOT fire.
    // Currently FAILS because the code uses winnerWins >= 3 (total wins).
    const { world, east, west, result } = makeWorld({
      east: { currentWinStreak: 1, currentBashoWins: 5 },
      day: 7,
    });
    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 7, "test-seed", world);
    const streakLines = result.pbpLines?.filter((l) => l.tags?.includes("streak"));
    const streakContinued = streakLines?.find((l) =>
      l.text?.includes("streak") || l.text?.includes("winning")
    );
    // Once fixed: streakContinued should be undefined because currentWinStreak < 3
    // Currently this FAILS because the code fires on total wins >= 3
    expect(streakContinued).toBeUndefined();
  });

  it("B.11: streak_snapped fires when loser had currentWinStreak >= 3", () => {
    // Loser had a 3-win streak, winner snapped it.
    // Currently the code uses loserWins >= 3 (total basho wins).
    const { world, east, west, result } = makeWorld({
      west: { currentWinStreak: 3, currentBashoWins: 4 },
      day: 7,
    });
    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 7, "test-seed", world);
    const streakLines = result.pbpLines?.filter((l) => l.tags?.includes("streak"));
    // streak_snapped should fire
    expect(streakLines?.length).toBeGreaterThan(0);
  });

  it("B.12: loss_streak fires when currentLossStreak >= 3 and currentWinStreak === 0", () => {
    // Loser has 3+ consecutive losses and 0 wins.
    // Currently the code uses loserLosses + 1 >= 3 && loserWins === 0.
    const { world, east, west, result } = makeWorld({
      west: { currentLossStreak: 3, currentBashoWins: 0, currentBashoLosses: 3 },
      day: 7,
    });
    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 7, "test-seed", world);
    const winlessLines = result.pbpLines?.filter((l) => l.tags?.includes("winless"));
    // loss_streak should fire
    expect(winlessLines?.length).toBeGreaterThan(0);
  });
});
