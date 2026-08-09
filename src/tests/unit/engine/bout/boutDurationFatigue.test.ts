import { describe, it, expect } from "vitest";
import { applyBoutResult } from "@/engine/bout/boutResultApplier";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import type { WorldState } from "@/engine/types/world";
import type { BoutResult, MatchSchedule, BashoName } from "@/engine/types/basho";
import type { Rikishi } from "@/engine/types/rikishi";

function makeWorld(winnerFatigue: number = 0, loserFatigue: number = 0): WorldState {
  return {
    rikishi: new Map([
      [
        "east",
        {
          id: "east",
          shikona: "East Rikishi",
          careerWins: 100,
          careerLosses: 50,
          fatigue: winnerFatigue,
          division: "makuuchi",
          rank: "maegashira",
          side: "east",
          stats: { achievements: undefined },
          heyaId: "test-heya",
        } as Rikishi,
      ],
      [
        "west",
        {
          id: "west",
          shikona: "West Rikishi",
          careerWins: 80,
          careerLosses: 70,
          fatigue: loserFatigue,
          division: "makuuchi",
          rank: "maegashira",
          side: "west",
          stats: { achievements: undefined },
          heyaId: "test-heya",
        } as Rikishi,
      ],
    ]),
    heyas: new Map([
      [
        "test-heya",
        {
          id: "test-heya",
          name: "Test Heya",
          rikishiIds: ["east", "west"],
        } as never,
      ],
    ]),
    calendar: { currentWeek: 1, month: 1, currentDay: 1 },
    currentBasho: {
      id: "test-basho",
      year: 2025,
      currentDay: 1,
      bashoName: "hatsu" as BashoName,
      bashoNumber: 1,
      matches: [],
      standings: new Map([
        ["east", { wins: 0, losses: 0 }],
        ["west", { wins: 0, losses: 0 }],
      ]),
      isActive: true,
    },
  } as unknown as WorldState;
}

function makeMatch(): MatchSchedule {
  return {
    boutId: "test-bout",
    day: 1,
    eastRikishiId: "east",
    westRikishiId: "west",
  };
}

function makeResult(duration: number): BoutResult {
  return {
    boutId: "test-bout",
    winner: "east",
    winnerRikishiId: "east",
    loserRikishiId: "west",
    kimarite: "oshidashi",
    kimariteName: "Oshidashi",
    stance: "migi-yotsu",
    tachiaiWinner: "east",
    duration,
    upset: false,
    isKinboshi: false,
    log: [],
    kenshoEnvelopes: 0,
    momentumScore: 0,
    inBoutInjury: null,
    isTimeout: false,
  } as unknown as BoutResult;
}

describe("bout-duration fatigue carryover", () => {
  it("long bout (30s) adds more fatigue than short bout (3s) for winner", () => {
    const worldShort = makeWorld(0, 0);
    const impactShort = applyBoutResult(worldShort, makeMatch(), makeResult(3));
    const newWorldShort = resolveImpacts(worldShort, [impactShort]);
    const shortFatigue = newWorldShort.rikishi.get("east")!.fatigue ?? 0;

    const worldLong = makeWorld(0, 0);
    const impactLong = applyBoutResult(worldLong, makeMatch(), makeResult(30));
    const newWorldLong = resolveImpacts(worldLong, [impactLong]);
    const longFatigue = newWorldLong.rikishi.get("east")!.fatigue ?? 0;

    expect(longFatigue).toBeGreaterThan(shortFatigue);
  });

  it("long bout (30s) adds more fatigue than short bout (3s) for loser", () => {
    const worldShort = makeWorld(0, 0);
    const impactShort = applyBoutResult(worldShort, makeMatch(), makeResult(3));
    const newWorldShort = resolveImpacts(worldShort, [impactShort]);
    const shortFatigue = newWorldShort.rikishi.get("west")!.fatigue ?? 0;

    const worldLong = makeWorld(0, 0);
    const impactLong = applyBoutResult(worldLong, makeMatch(), makeResult(30));
    const newWorldLong = resolveImpacts(worldLong, [impactLong]);
    const longFatigue = newWorldLong.rikishi.get("west")!.fatigue ?? 0;

    expect(longFatigue).toBeGreaterThan(shortFatigue);
  });

  it("loser gets more fatigue than winner for same bout duration", () => {
    const world = makeWorld(0, 0);
    const impact = applyBoutResult(world, makeMatch(), makeResult(30));
    const newWorld = resolveImpacts(world, [impact]);
    const winnerFatigue = newWorld.rikishi.get("east")!.fatigue ?? 0;
    const loserFatigue = newWorld.rikishi.get("west")!.fatigue ?? 0;
    expect(loserFatigue).toBeGreaterThan(winnerFatigue);
  });

  it("very short bout (3s) adds minimal fatigue (<= 2)", () => {
    const world = makeWorld(0, 0);
    const impact = applyBoutResult(world, makeMatch(), makeResult(3));
    const newWorld = resolveImpacts(world, [impact]);
    const winnerFatigue = newWorld.rikishi.get("east")!.fatigue ?? 0;
    expect(winnerFatigue).toBeLessThanOrEqual(2);
  });

  it("very long bout (60s) adds significant fatigue (>= 5)", () => {
    const world = makeWorld(0, 0);
    const impact = applyBoutResult(world, makeMatch(), makeResult(60));
    const newWorld = resolveImpacts(world, [impact]);
    const winnerFatigue = newWorld.rikishi.get("east")!.fatigue ?? 0;
    expect(winnerFatigue).toBeGreaterThanOrEqual(5);
  });

  it("fusensho (forfeit) adds no fatigue", () => {
    const world = makeWorld(0, 0);
    const result = makeResult(0);
    result.kimarite = "fusensho";
    const impact = applyBoutResult(world, makeMatch(), result);
    const newWorld = resolveImpacts(world, [impact]);
    const winnerFatigue = newWorld.rikishi.get("east")!.fatigue ?? 0;
    const loserFatigue = newWorld.rikishi.get("west")!.fatigue ?? 0;
    expect(winnerFatigue).toBe(0);
    expect(loserFatigue).toBe(0);
  });

  it("fatigue accumulates on top of existing fatigue", () => {
    const world = makeWorld(10, 10);
    const impact = applyBoutResult(world, makeMatch(), makeResult(30));
    const newWorld = resolveImpacts(world, [impact]);
    const winnerFatigue = newWorld.rikishi.get("east")!.fatigue ?? 0;
    const loserFatigue = newWorld.rikishi.get("west")!.fatigue ?? 0;
    expect(winnerFatigue).toBeGreaterThan(10);
    expect(loserFatigue).toBeGreaterThan(10);
  });

  it("7-bout division (makushita) rikishi do NOT get bout-duration fatigue", () => {
    const world = makeWorld(0, 0);
    // Override division to makushita (7-bout division)
    const east = world.rikishi.get("east")!;
    const west = world.rikishi.get("west")!;
    east.division = "makushita" as never;
    west.division = "makushita" as never;
    east.rank = "makushita" as never;
    west.rank = "makushita" as never;
    const impact = applyBoutResult(world, makeMatch(), makeResult(30));
    const newWorld = resolveImpacts(world, [impact]);
    const winnerFatigue = newWorld.rikishi.get("east")!.fatigue ?? 0;
    const loserFatigue = newWorld.rikishi.get("west")!.fatigue ?? 0;
    expect(winnerFatigue).toBe(0);
    expect(loserFatigue).toBe(0);
  });
});
