 
import { describe, it, expect, vi, beforeEach } from "vitest";
import { bashoSlice } from "@/contexts/bashoSlice";
import type { GameState, GameAction } from "@/contexts/gameTypes";
import type { MatchSchedule, BashoState, BashoName } from "@/engine/types/basho";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";

vi.mock("@/contexts/gameHelpers", () => ({
  autosaveWithSignal: vi.fn(),
}));

function makeMatch(boutId: string, day: number, eastId: string = "east", westId: string = "west"): MatchSchedule {
  return { boutId, day, eastRikishiId: eastId, westRikishiId: westId };
}

function makeState(matches: MatchSchedule[], day: number = 1): GameState {
  const basho: BashoState = {
    id: "test-basho",
    year: 2026,
    bashoNumber: 1,
    bashoName: "hatsu" as BashoName,
    day,
    matches,
    standings: new Map([
      ["east", { wins: 0, losses: 0 }],
      ["west", { wins: 0, losses: 0 }],
    ]),
    isActive: true,
    kinboshiThisBasho: {},
  };
  const eastRikishi = MockFactory.createRikishi("east", {
    division: "makuuchi", rank: "maegashira", rankNumber: 1, side: "east",
    heyaId: "test-heya", careerWins: 0, careerLosses: 0,
    currentBashoWins: 0, currentBashoLosses: 0,
    stats: { power: 60, speed: 60, technique: 60, weight: 140, stamina: 60, mental: 60, adaptability: 60, balance: 60, aggression: 60, experience: 10, achievements: { kinboshiEarned: 0, ginboshiEarned: 0, kinboshiConceded: 0, ginboshiConceded: 0, specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 }, mochikyukinPoints: 0 } },
  });
  const westRikishi = MockFactory.createRikishi("west", {
    division: "makuuchi", rank: "maegashira", rankNumber: 2, side: "west",
    heyaId: "test-heya", careerWins: 0, careerLosses: 0,
    currentBashoWins: 0, currentBashoLosses: 0,
    stats: { power: 60, speed: 60, technique: 60, weight: 140, stamina: 60, mental: 60, adaptability: 60, balance: 60, aggression: 60, experience: 10, achievements: { kinboshiEarned: 0, ginboshiEarned: 0, kinboshiConceded: 0, ginboshiConceded: 0, specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 }, mochikyukinPoints: 0 } },
  });
  const heya = MockFactory.createHeya("test-heya", { rikishiIds: ["east", "west"] });
  const world = MockFactory.createWorld({
    currentBasho: basho,
    cyclePhase: "active_basho",
    rikishi: new Map([["east", eastRikishi], ["west", westRikishi]]),
    heyas: new Map([["test-heya", heya]]),
    sponsorPool: { sponsors: new Map(), koenkais: new Map() } as any,
    rivalriesState: { pairs: {}, version: "1.0.0" },
  });
  return {
    world,
    phase: "day_preview",
    currentBoutIndex: 0,
    lastBoutResult: null,
    boutTactics: {},
  } as unknown as GameState;
}

describe("bashoSlice - indexing and bout result handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("Test 5.1: SIMULATE_ALL_BOUTS sets match.result on all bouts for today", () => {
    const matches = [makeMatch("b1", 1), makeMatch("b2", 1), makeMatch("b3", 1)];
    const state = makeState(matches);

    // Use real simulateBoutForToday (no mock)
    vi.doUnmock("@/engine/world");
    const action: GameAction = { type: "SIMULATE_ALL_BOUTS" };
    const newState = bashoSlice(state, action);
    const basho = newState.world!.currentBasho!;
    const resolved = basho.matches.filter((m) => m.result);
    expect(resolved.length).toBe(3);
  });

  it("Test 5.2: SIMULATE_ALL_BOUTS does not skip bouts due to index mismatch", () => {
    const matches = [makeMatch("b1", 1), makeMatch("b2", 1), makeMatch("b3", 1), makeMatch("b4", 1)];
    const state = makeState(matches);

    const action: GameAction = { type: "SIMULATE_ALL_BOUTS" };
    const newState = bashoSlice(state, action);
    const basho = newState.world!.currentBasho!;
    const resolved = basho.matches.filter((m) => m.result);
    expect(resolved.length).toBe(4);
  });

  it("Test 5.3: SIMULATE_BOUT sets match.result on the correct bout", () => {
    const matches = [makeMatch("b1", 1), makeMatch("b2", 1)];
    const state = makeState(matches);

    const action: GameAction = { type: "SIMULATE_BOUT", boutIndex: 0 } as any;
    const newState = bashoSlice(state, action);
    const basho = newState.world!.currentBasho!;
    const b1 = basho.matches.find((m) => m.boutId === "b1");
    expect(b1?.result).toBeDefined();
  });

  it("Test 5.4: SIMULATE_BOUT with boutId targets the correct bout", () => {
    const matches = [makeMatch("b1", 1), makeMatch("b2", 1)];
    const state = makeState(matches);

    const action: GameAction = { type: "SIMULATE_BOUT", boutIndex: 0, boutId: "b2" } as any;
    const newState = bashoSlice(state, action);
    const basho = newState.world!.currentBasho!;
    const b2 = basho.matches.find((m) => m.boutId === "b2");
    expect(b2?.result).toBeDefined();
  });

  it("Test 5.5: SIM_FULL_BASHO resolves all bouts across all days", () => {
    const matches: MatchSchedule[] = [];
    for (let day = 1; day <= 15; day++) {
      matches.push(makeMatch(`d${day}-b1`, day));
    }
    const state = makeState(matches, 1);

    const action: GameAction = { type: "SIM_FULL_BASHO" };
    const newState = bashoSlice(state, action);
    const basho = newState.world!.currentBasho!;
    const resolved = basho.matches.filter((m) => m.result);
    expect(resolved.length).toBe(15);
  });

  it("Test 5.6: SIMULATE_ALL_BOUTS sets phase to day_results", () => {
    const matches = [makeMatch("b1", 1)];
    const state = makeState(matches);

    const action: GameAction = { type: "SIMULATE_ALL_BOUTS" };
    const newState = bashoSlice(state, action);
    expect(newState.phase).toBe("day_results");
  });

  it("Test 5.7: SIMULATE_ALL_BOUTS sets lastBoutResult to the last bout result", () => {
    const matches = [makeMatch("b1", 1), makeMatch("b2", 1)];
    const state = makeState(matches);

    const action: GameAction = { type: "SIMULATE_ALL_BOUTS" };
    const newState = bashoSlice(state, action);
    expect(newState.lastBoutResult).not.toBeNull();
  });

  it("Test 5.8: SIMULATE_BOUT increments currentBoutIndex", () => {
    const matches = [makeMatch("b1", 1)];
    const state = makeState(matches);

    const action: GameAction = { type: "SIMULATE_BOUT", boutIndex: 0 } as any;
    const newState = bashoSlice(state, action);
    expect(newState.currentBoutIndex).toBe(1);
  });
});
