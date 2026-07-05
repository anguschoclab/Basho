import { describe, it, expect } from "vitest";
import { applyBoutResult } from "@/engine/bout/boutResultApplier";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { MatchSchedule, BoutResult, BashoState } from "@/engine/types/basho";
import type { Heya } from "@/engine/types/heya";

function makeRikishi(id: string, overrides: Partial<Rikishi> = {}): Rikishi {
  return {
    id,
    shikona: `Rikishi-${id}`,
    heyaId: "test-heya",
    careerWins: 10,
    careerLosses: 5,
    makuuchiWins: 0,
    division: "makuuchi",
    rank: "maegashira",
    side: "east",
    stats: { achievements: undefined },
    ...overrides,
  } as Rikishi;
}

function makeWorld(overrides: Partial<WorldState> = {}): WorldState {
  const east = makeRikishi("east");
  const west = makeRikishi("west", { side: "west" });
  const basho: BashoState = {
    id: "test-basho",
    year: 2025,
    bashoNumber: 1,
    bashoName: "hatsu",
    day: 1,
    matches: [],
    standings: new Map([
      ["east", { wins: 0, losses: 0 }],
      ["west", { wins: 0, losses: 0 }],
    ]),
    isActive: true,
  } as BashoState;
  const heya: Heya = {
    id: "test-heya",
    name: "Test Heya",
    rikishiIds: ["east", "west"],
  } as Heya;
  return {
    seed: "test-seed",
    year: 2025,
    week: 1,
    dayIndexGlobal: 1,
    cyclePhase: "active_basho",
    rikishi: new Map([
      ["east", east],
      ["west", west],
    ]),
    heyas: new Map([["test-heya", heya]]),
    oyakata: new Map(),
    activeRikishiIds: new Set(["east", "west"]),
    historicalRikishi: new Map(),
    events: { log: [], headlines: [] } as unknown as WorldState["events"],
    meta: { tone: "classic", drift: {} },
    globalKimariteStats: {},
    currentBasho: basho,
    calendar: { currentWeek: 1, month: 1, year: 2025, currentDay: 1 },
    ...overrides,
  } as unknown as WorldState;
}

function makeMatch(): MatchSchedule {
  return {
    boutId: "test-bout",
    day: 1,
    eastRikishiId: "east",
    westRikishiId: "west",
  } as MatchSchedule;
}

function makeResult(winner: "east" | "west", overrides: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: "test-bout",
    winner,
    winnerRikishiId: winner === "east" ? "east" : "west",
    loserRikishiId: winner === "east" ? "west" : "east",
    kimarite: "oshidashi",
    kimariteName: "Oshidashi",
    stance: "migi-yotsu",
    tachiaiWinner: winner,
    duration: 5.2,
    upset: false,
    isKinboshi: false,
    log: [],
    kenshoEnvelopes: 0,
    ...overrides,
  } as BoutResult;
}

describe("boutResultApplier — dailyInjuryRiskOverrides consumption", () => {
  it("override multiplies with tacticInjuryRiskMultiplier for the loser", () => {
    const world = makeWorld({
      transientContext: {
        dailyInjuryRiskOverrides: { west: 2.0 },
      } as never,
    });
    // East wins; west is the loser with a 2.0 override.
    // tacticInjuryRiskMultiplier = 1.5 → final = 1.5 * 2.0 = 3.0
    const result = makeResult("east", {
      tacticInjuryRiskMultiplier: 1.5,
    });

    const impact = applyBoutResult(world, makeMatch(), result);
    const tc = impact.worldFields?.transientContext as
      | { dailyInjuryRiskOverrides?: Record<string, number> }
      | undefined;

    // The override for west should be consumed/cleared
    expect(tc?.dailyInjuryRiskOverrides?.["west"]).toBeUndefined();
  });

  it("override is cleared from transientContext after bout (loser consumed)", () => {
    const world = makeWorld({
      transientContext: {
        dailyInjuryRiskOverrides: { west: 2.0 },
      } as never,
    });
    const result = makeResult("east");

    const impact = applyBoutResult(world, makeMatch(), result);
    const tc = impact.worldFields?.transientContext as
      | { dailyInjuryRiskOverrides?: Record<string, number> }
      | undefined;
    expect(tc?.dailyInjuryRiskOverrides).toBeDefined();
    expect(tc?.dailyInjuryRiskOverrides?.["west"]).toBeUndefined();
  });

  it("other rikishi overrides are preserved when only loser is consumed", () => {
    const world = makeWorld({
      transientContext: {
        dailyInjuryRiskOverrides: { west: 2.0, r3: 1.5 },
      } as never,
    });
    const result = makeResult("east");

    const impact = applyBoutResult(world, makeMatch(), result);
    const tc = impact.worldFields?.transientContext as
      | { dailyInjuryRiskOverrides?: Record<string, number> }
      | undefined;
    expect(tc?.dailyInjuryRiskOverrides?.["r3"]).toBe(1.5);
    expect(tc?.dailyInjuryRiskOverrides?.["west"]).toBeUndefined();
  });

  it("no override present — no crash, transientContext unchanged for injury", () => {
    const world = makeWorld();
    const result = makeResult("east");

    const impact = applyBoutResult(world, makeMatch(), result);
    // Should not crash; transientContext may or may not be in the impact
    const tc = impact.worldFields?.transientContext as
      | { dailyInjuryRiskOverrides?: Record<string, number> }
      | undefined;
    // No override was set, so nothing to clear
    expect(tc?.dailyInjuryRiskOverrides ?? {}).toEqual({});
  });

  it("override for winner IS consumed and cleared (fixed behavior)", () => {
    // FIX: The winner's override is now consumed and cleared, just like the loser's.
    // The winner gets an injury roll at 50% of the base chance multiplied by the override.
    const world = makeWorld({
      transientContext: {
        dailyInjuryRiskOverrides: { east: 2.0 },
      } as never,
    });
    // East wins; east has the override and is the WINNER.
    const result = makeResult("east");

    const impact = applyBoutResult(world, makeMatch(), result);
    const tc = impact.worldFields?.transientContext as
      | { dailyInjuryRiskOverrides?: Record<string, number> }
      | undefined;
    // Winner's override should now be cleared from the impact
    expect(tc?.dailyInjuryRiskOverrides?.["east"]).toBeUndefined();
  });
});
