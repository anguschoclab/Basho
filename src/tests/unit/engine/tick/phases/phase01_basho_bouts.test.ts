 
import { describe, it, expect } from "vitest";
import { phase01_basho_bouts } from "@/engine/tick/phases/phase01_basho_bouts";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { MatchSchedule, BashoState, BashoName } from "@/engine/types/basho";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";

function makeRikishi(id: string, overrides: Partial<Rikishi> = {}): Rikishi {
  return MockFactory.createRikishi(id, {
    division: "makuuchi",
    rank: "maegashira",
    rankNumber: 1,
    side: "east",
    careerWins: 10,
    careerLosses: 5,
    currentBashoWins: 0,
    currentBashoLosses: 0,
    heyaId: "test-heya",
    stats: {
      power: 60,
      speed: 60,
      technique: 60,
      weight: 140,
      stamina: 60,
      mental: 60,
      adaptability: 60,
      balance: 60,
      aggression: 60,
      experience: 10,
    },
    ...overrides,
  });
}

function makeWorldForPhase(
  matches: MatchSchedule[],
  bashoOverrides?: Partial<BashoState>,
  rikishiOverrides?: Record<string, Partial<Rikishi>>
): WorldState {
  const east = makeRikishi("east", rikishiOverrides?.east);
  const west = makeRikishi("west", { side: "west", ...rikishiOverrides?.west });
  const basho: BashoState = {
    id: "test-basho",
    year: 2026,
    bashoNumber: 1,
    bashoName: "hatsu" as BashoName,
    day: 1,
    matches,
    standings: new Map([
      ["east", { wins: 0, losses: 0 }],
      ["west", { wins: 0, losses: 0 }],
    ]),
    isActive: true,
    ...bashoOverrides,
  };
  return MockFactory.createWorld({
    rikishi: new Map([
      ["east", east],
      ["west", west],
    ]),
    heyas: new Map([
      ["test-heya", MockFactory.createHeya("test-heya", { rikishiIds: ["east", "west"] })],
    ]),
    currentBasho: basho,
    cyclePhase: "active_basho",
    sponsorPool: { sponsors: new Map(), koenkais: new Map() } as unknown as import("@/engine/types/sponsors").SponsorPool,
    rivalriesState: { pairs: {}, version: 1 },
  });
}

function makeMatch(boutId: string, day: number, eastId: string = "east", westId: string = "west"): MatchSchedule {
  return { boutId, day, eastRikishiId: eastId, westRikishiId: westId };
}

describe("phase01_basho_bouts", () => {
  it("Test 6.1: simulates all unplayed bouts for the current day", () => {
    const matches = [makeMatch("b1", 1), makeMatch("b2", 1)];
    const world = makeWorldForPhase(matches);
    const result = phase01_basho_bouts(world);
    const basho = result.currentBasho!;
    const resolved = basho.matches.filter((m) => m.result);
    expect(resolved.length).toBe(2);
  });

  it("Test 6.2: does not re-simulate already resolved bouts", () => {
    const matches = [makeMatch("b1", 1), makeMatch("b2", 1)];
    // Mark b1 as already resolved
    matches[0].result = {
      boutId: "b1",
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
    const world = makeWorldForPhase(matches);
    const result = phase01_basho_bouts(world);
    const basho = result.currentBasho!;
    const resolved = basho.matches.filter((m) => m.result);
    expect(resolved.length).toBe(2);
    // b1 should still have its original result
    const b1 = basho.matches.find((m) => m.boutId === "b1");
    expect(b1?.result?.kimarite).toBe("oshidashi");
  });

  it("Test 6.3: advances the basho day after all bouts are resolved", () => {
    const matches = [makeMatch("b1", 1)];
    const world = makeWorldForPhase(matches);
    const result = phase01_basho_bouts(world);
    expect(result.currentBasho!.day).toBe(2);
  });

  it("Test 6.4: does nothing when cyclePhase is not active_basho", () => {
    const matches = [makeMatch("b1", 1)];
    const world = makeWorldForPhase(matches);
    world.cyclePhase = "pre_basho";
    const result = phase01_basho_bouts(world);
    expect(result).toBe(world);
  });

  it("Test 6.5: does nothing when no currentBasho", () => {
    const world = MockFactory.createWorld({ currentBasho: undefined, cyclePhase: "active_basho" });
    const result = phase01_basho_bouts(world);
    expect(result).toBe(world);
  });

  it("Test 6.6: does nothing when no unplayed bouts for today", () => {
    const matches = [makeMatch("b1", 1)];
    matches[0].result = {
      boutId: "b1",
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
    const world = makeWorldForPhase(matches);
    const result = phase01_basho_bouts(world);
    // Day should still advance since all bouts are resolved
    expect(result.currentBasho!.day).toBe(2);
  });

  it("Test 6.7: sets match.result on all simulated matches", () => {
    const matches = [makeMatch("b1", 1), makeMatch("b2", 1), makeMatch("b3", 1)];
    const world = makeWorldForPhase(matches);
    const result = phase01_basho_bouts(world);
    const basho = result.currentBasho!;
    for (const match of basho.matches) {
      expect(match.result).toBeDefined();
      expect(match.result?.winnerRikishiId).toBeDefined();
    }
  });

  it("Test 6.8: updates currentBashoWins/currentBashoLosses for all bouts", () => {
    const matches = [makeMatch("b1", 1), makeMatch("b2", 1)];
    const world = makeWorldForPhase(matches);
    const result = phase01_basho_bouts(world);
    const east = result.rikishi.get("east")!;
    const west = result.rikishi.get("west")!;
    // Each rikishi should have 1 win and 1 loss (they fight each other twice)
    // or 2 wins / 2 losses depending on outcomes
    const totalWins = (east.currentBashoWins ?? 0) + (west.currentBashoWins ?? 0);
    const totalLosses = (east.currentBashoLosses ?? 0) + (west.currentBashoLosses ?? 0);
    expect(totalWins).toBe(2);
    expect(totalLosses).toBe(2);
  });
});
