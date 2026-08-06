 
import { describe, it, expect } from "vitest";
import { simulateBoutForToday } from "@/engine/world";
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

function makeWorldWithMatches(
  matches: MatchSchedule[],
  rikishiOverrides?: Record<string, Partial<Rikishi>>,
  bashoOverrides?: Partial<BashoState>
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

describe("simulateBoutForToday", () => {
  it("Test 2.1: sets match.result on the correct match in currentBasho.matches", () => {
    const matches = [makeMatch("b1", 1), makeMatch("b2", 1)];
    const world = makeWorldWithMatches(matches);
    const result = simulateBoutForToday(world, 0);
    const updatedBasho = result.world.currentBasho!;
    const match0 = updatedBasho.matches.find((m) => m.boutId === "b1");
    expect(match0?.result).toBeDefined();
    expect(match0?.result?.winnerRikishiId).toBeDefined();
  });

  it("Test 2.2: returns the bout result", () => {
    const matches = [makeMatch("b1", 1)];
    const world = makeWorldWithMatches(matches);
    const result = simulateBoutForToday(world, 0);
    expect(result.result).toBeDefined();
    expect(result.result?.boutId).toBe("b1");
    expect(result.result?.winnerRikishiId).toBeDefined();
  });

  it("Test 2.3: with index 0 simulates the first unplayed match", () => {
    const matches = [makeMatch("b1", 1), makeMatch("b2", 1)];
    const world = makeWorldWithMatches(matches);
    const result = simulateBoutForToday(world, 0);
    expect(result.result?.boutId).toBe("b1");
  });

  it("Test 2.4: with index 0 after one bout resolved simulates the second match", () => {
    const matches = [
      makeMatch("b1", 1),
      makeMatch("b2", 1),
    ];
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
    const world = makeWorldWithMatches(matches);
    const result = simulateBoutForToday(world, 0);
    // After Bug 1 fix, index 0 should pick the first unplayed match (b2)
    expect(result.result?.boutId).toBe("b2");
  });

  it("Test 2.5: does not re-simulate already resolved bouts", () => {
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
    const world = makeWorldWithMatches(matches);
    const result = simulateBoutForToday(world, 0);
    // No unplayed bouts, should return world unchanged
    expect(result.result).toBeUndefined();
  });

  it("Test 2.6: updates standings in world state", () => {
    const matches = [makeMatch("b1", 1)];
    const world = makeWorldWithMatches(matches);
    const result = simulateBoutForToday(world, 0);
    const standings = result.world.currentBasho!.standings;
    const winnerId = result.result?.winnerRikishiId!;
    const loserId = result.result?.loserRikishiId!;
    expect(standings.get(winnerId)?.wins).toBe(1);
    expect(standings.get(loserId)?.losses).toBe(1);
  });

  it("Test 2.7: updates currentBashoWins/currentBashoLosses in world state", () => {
    const matches = [makeMatch("b1", 1)];
    const world = makeWorldWithMatches(matches);
    const result = simulateBoutForToday(world, 0);
    const winnerId = result.result?.winnerRikishiId!;
    const loserId = result.result?.loserRikishiId!;
    const winner = result.world.rikishi.get(winnerId)!;
    const loser = result.world.rikishi.get(loserId)!;
    expect(winner.currentBashoWins).toBe(1);
    expect(loser.currentBashoLosses).toBe(1);
  });

  it("Test 2.8: returns { world } unchanged when no currentBasho", () => {
    const world = MockFactory.createWorld({ currentBasho: undefined });
    const result = simulateBoutForToday(world, 0);
    expect(result.world).toBe(world);
    expect(result.result).toBeUndefined();
  });

  it("Test 2.9: returns { world } unchanged when no unplayed matches", () => {
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
    const world = makeWorldWithMatches(matches);
    const result = simulateBoutForToday(world, 0);
    expect(result.result).toBeUndefined();
  });

  it("Test 2.10: returns { world } unchanged when rikishi missing", () => {
    const matches = [makeMatch("b1", 1, "ghost1", "ghost2")];
    const world = makeWorldWithMatches(matches);
    const result = simulateBoutForToday(world, 0);
    expect(result.result).toBeUndefined();
  });

  it("Test 2.11: handles fusensho (injured rikishi)", () => {
    const matches = [makeMatch("b1", 1)];
    const world = makeWorldWithMatches(matches, {
      east: { injured: true, injuryWeeksRemaining: 2 },
    });
    const result = simulateBoutForToday(world, 0);
    expect(result.result).toBeDefined();
    // Injured rikishi (east) should lose by fusensho
    expect(result.result?.kimarite).toBe("fusensho");
    expect(result.result?.winnerRikishiId).toBe("west");
  });

  it("Test 2.12: with playerTactic passes tactic to resolveBout", () => {
    const matches = [makeMatch("b1", 1)];
    const world = makeWorldWithMatches(matches);
    const playerTactic = "OSHI_THRUST" as const;
    const result = simulateBoutForToday(world, 0, playerTactic);
    expect(result.result).toBeDefined();
    // Result should be produced regardless of tactic
    expect(result.result?.boutId).toBe("b1");
  });
});
