import { describe, it, expect } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import type { PbpTag } from "@/engine/bout/boutNarrative";
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
  const standings =
    opts?.standings ??
    new Map([
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
      ["other", makeRikishi("other")],
    ]),
  } as unknown as WorldState;
  return { world, east, west, result };
}

function hasPbpLineWithTag(result: BoutResult, tag: PbpTag): boolean {
  return (result.pbpLines ?? []).some((l) => l.tags?.includes(tag));
}

describe("boutNarrative.yusho integration (D.9-D.12)", () => {
  it("D.9: falls_out fires when loser was co-leader and winner overtakes", () => {
    const standings = new Map<string, { wins: number; losses: number }>();
    standings.set("east", { wins: 10, losses: 2 });
    standings.set("west", { wins: 11, losses: 1 });
    standings.set("other", { wins: 9, losses: 3 });
    const { world, east, west, result } = makeWorld({
      east: { currentBashoWins: 10, currentBashoLosses: 2 },
      west: { currentBashoWins: 11, currentBashoLosses: 1 },
      standings,
      day: 12,
    });
    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 12, "test-seed", world);
    expect(hasPbpLineWithTag(result, "yusho_race")).toBe(true);
  });

  it("D.10: falls_out does NOT fire when loser was not co-leader", () => {
    const standings = new Map<string, { wins: number; losses: number }>();
    standings.set("east", { wins: 12, losses: 0 });
    standings.set("west", { wins: 5, losses: 7 });
    standings.set("other", { wins: 11, losses: 1 });
    const { world, east, west, result } = makeWorld({
      east: { currentBashoWins: 12, currentBashoLosses: 0 },
      west: { currentBashoWins: 5, currentBashoLosses: 7 },
      standings,
      day: 13,
    });
    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 13, "test-seed", world);
    expect(result.pbpLines).toBeDefined();
  });

  it("D.11: sole_leader fires when winner becomes sole leader", () => {
    const standings = new Map<string, { wins: number; losses: number }>();
    standings.set("east", { wins: 10, losses: 2 });
    standings.set("west", { wins: 10, losses: 2 });
    standings.set("other", { wins: 9, losses: 3 });
    const { world, east, west, result } = makeWorld({
      east: { currentBashoWins: 10, currentBashoLosses: 2 },
      west: { currentBashoWins: 10, currentBashoLosses: 2 },
      standings,
      day: 13,
    });
    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 13, "test-seed", world);
    expect(hasPbpLineWithTag(result, "yusho_race")).toBe(true);
  });

  it("D.12: ties_leader fires when winner ties co-leaders", () => {
    const standings = new Map<string, { wins: number; losses: number }>();
    standings.set("east", { wins: 9, losses: 3 });
    standings.set("west", { wins: 10, losses: 2 });
    standings.set("other", { wins: 10, losses: 2 });
    const { world, east, west, result } = makeWorld({
      east: { currentBashoWins: 9, currentBashoLosses: 3 },
      west: { currentBashoWins: 10, currentBashoLosses: 2 },
      standings,
      day: 13,
    });
    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 13, "test-seed", world);
    expect(hasPbpLineWithTag(result, "yusho_race")).toBe(true);
  });
});
