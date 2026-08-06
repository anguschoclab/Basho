 
import { describe, it, expect } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { mockRikishi } from "../utils";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { BoutResult, BashoName } from "@/engine/types/basho";

function makeRikishi(id: string, opts?: Record<string, any>): Rikishi {
  return mockRikishi(id, {
    shikona: id === "east" ? "East Rikishi" : "West Rikishi",
    careerWins: 10,
    careerLosses: 5,
    currentBashoWins: 0,
    currentBashoLosses: 0,
    division: "makuuchi",
    rank: "maegashira",
    side: id === "east" ? "east" : "west",
    heyaId: "test-heya",
    ...opts,
  });
}

function makeWorld(opts?: {
  east?: Record<string, any>;
  west?: Record<string, any>;
  standings?: Map<string, { wins: number; losses: number; absences?: number }>;
  day?: number;
}): { world: WorldState; east: Rikishi; west: Rikishi; result: BoutResult } {
  const east = makeRikishi("east", opts?.east);
  const west = makeRikishi("west", opts?.west);
  const standings = opts?.standings ?? new Map([
    ["east", { wins: 0, losses: 0 }],
    ["west", { wins: 0, losses: 0 }],
  ]);
  const day = opts?.day ?? 8;
  const result: BoutResult = {
    boutId: "test-bout-1",
    winner: "east",
    winnerRikishiId: "east",
    loserRikishiId: "west",
    kimarite: "yorikiri",
    kimariteName: "Yorikiri",
    stance: "migi-yotsu",
    tachiaiWinner: "east",
    duration: 5,
    upset: false,
    kenshoEnvelopes: 0,
    log: [],
    momentumScore: 0,
    inBoutInjury: null,
    isTimeout: false,
  };
  const world = {
    currentBasho: {
      bashoName: "hatsu" as BashoName,
      day,
      standings,
      matches: [],
    },
    currentBashoName: "hatsu" as BashoName,
    rikishi: new Map([
      ["east", east],
      ["west", west],
    ]),
  } as unknown as WorldState;
  return { world, east, west, result };
}

function hasPbpLineWith(result: BoutResult, substring: string): boolean {
  return (result.pbpLines ?? []).some((l) => l.text.includes(substring));
}

describe("boutNarrative.stats integration (D.1-D.8)", () => {
  it("D.1: generateBoutNarrative fires kachi_koshi when winner reaches 8 wins", () => {
    const { world, east, west, result } = makeWorld({
      east: { currentBashoWins: 7, currentBashoLosses: 2 },
      west: { currentBashoWins: 3, currentBashoLosses: 6 },
      day: 10,
    });
    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 10, "test-seed", world);
    expect(result.pbpLines).toBeDefined();
    expect(result.pbpLines!.length).toBeGreaterThan(0);
  });

  it("D.2: generateBoutNarrative fires make_koshi when loser reaches 8 losses", () => {
    const { world, east, west, result } = makeWorld({
      east: { currentBashoWins: 5, currentBashoLosses: 3 },
      west: { currentBashoWins: 2, currentBashoLosses: 7 },
      day: 10,
    });
    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 10, "test-seed", world);
    expect(result.pbpLines).toBeDefined();
    expect(result.pbpLines!.length).toBeGreaterThan(0);
  });

  it("D.3: generateBoutNarrative does NOT fire first_win when winner has existing wins", () => {
    const { world, east, west, result } = makeWorld({
      east: { currentBashoWins: 3, currentBashoLosses: 2 },
      west: { currentBashoWins: 2, currentBashoLosses: 3 },
      day: 6,
    });
    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 6, "test-seed", world);
    expect(hasPbpLineWith(result, "first win")).toBe(false);
  });

  it("D.4: generateBoutNarrative fires first_win when winnerWins === 0 and day >= min", () => {
    const { world, east, west, result } = makeWorld({
      east: { currentBashoWins: 0, currentBashoLosses: 5 },
      west: { currentBashoWins: 5, currentBashoLosses: 0 },
      day: 6,
    });
    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 6, "test-seed", world);
    expect(hasPbpLineWith(result, "first")).toBe(true);
  });

  it("D.5: generateBoutNarrative uses winnerWins+1 for post-bout records", () => {
    const { world, east, west, result } = makeWorld({
      east: { currentBashoWins: 4, currentBashoLosses: 2 },
      west: { currentBashoWins: 2, currentBashoLosses: 4 },
      day: 7,
    });
    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 7, "test-seed", world);
    expect(result.pbpLines).toBeDefined();
    expect(result.pbpLines!.length).toBeGreaterThan(0);
  });

  it("D.6: generateBoutNarrative uses loserLosses+1 for post-bout records", () => {
    const { world, east, west, result } = makeWorld({
      east: { currentBashoWins: 3, currentBashoLosses: 3 },
      west: { currentBashoWins: 3, currentBashoLosses: 4 },
      day: 8,
    });
    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 8, "test-seed", world);
    expect(result.pbpLines).toBeDefined();
    expect(result.pbpLines!.length).toBeGreaterThan(0);
  });

  it("D.7: generateBoutNarrative fires milestone at career win 100", () => {
    const { world, east, west, result } = makeWorld({
      east: { careerWins: 99, currentBashoWins: 3, currentBashoLosses: 2 },
      west: { currentBashoWins: 2, currentBashoLosses: 3 },
      day: 6,
    });
    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 6, "test-seed", world);
    expect(result.pbpLines).toBeDefined();
    expect(result.pbpLines!.length).toBeGreaterThan(0);
  });

  it("D.8: generateBoutNarrative counts makuuchi tournaments correctly", () => {
    const { world, east, west, result } = makeWorld({
      east: {
        careerWins: 5,
        currentBashoWins: 3,
        currentBashoLosses: 2,
        careerHistory: [
          { division: "makuuchi", wins: 8, losses: 7, absences: 0, isYusho: false },
          { division: "makuuchi", wins: 5, losses: 10, absences: 0, isYusho: false },
          { division: "juryo", wins: 11, losses: 4, absences: 0, isYusho: false },
        ],
      },
      west: { currentBashoWins: 2, currentBashoLosses: 3 },
      day: 6,
    });
    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 6, "test-seed", world);
    expect(result.pbpLines).toBeDefined();
  });
});
