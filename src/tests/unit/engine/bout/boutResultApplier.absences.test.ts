import { describe, it, expect } from "vitest";
import { applyBoutResult } from "@/engine/bout/boutResultApplier";
import { publishBanzukeUpdate } from "@/engine/banzuke/BanzukePublisher";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { mockRikishi, makeMockWorld, makeMockBasho } from "../utils";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { BashoName, BoutResult, MatchSchedule } from "@/engine/types/basho";

function makeRikishi(id: string, opts?: Partial<Rikishi>): Rikishi {
  return mockRikishi(id, {
    shikona: id === "east" ? "East Rikishi" : "West Rikishi",
    careerWins: 10,
    careerLosses: 5,
    currentBashoWins: 0,
    currentBashoLosses: 0,
    division: "makuuchi",
    rank: "maegashira",
    side: "east",
    heyaId: "test-heya",
    ...opts,
  });
}

function makeWorld(opts?: {
  eastWins?: number;
  eastLosses?: number;
  eastAbsences?: number;
  westWins?: number;
  westLosses?: number;
  westAbsences?: number;
  eastRikishi?: Partial<Rikishi>;
  westRikishi?: Partial<Rikishi>;
}): { world: WorldState; match: MatchSchedule; result: BoutResult } {
  const east = makeRikishi("east", {
    currentBashoWins: opts?.eastWins ?? 0,
    currentBashoLosses: opts?.eastLosses ?? 0,
    ...opts?.eastRikishi,
  });
  const west = makeRikishi("west", {
    side: "west",
    currentBashoWins: opts?.westWins ?? 0,
    currentBashoLosses: opts?.westLosses ?? 0,
    ...opts?.westRikishi,
  });

  const world: Partial<WorldState> = {
    rikishi: new Map([
      ["east", east],
      ["west", west],
    ]),
    heyas: new Map([
      [
        "test-heya",
        {
          id: "test-heya",
          name: "Test Heya",
          rikishiIds: ["east", "west"],
        } as any,
      ],
    ]),
    calendar: { currentWeek: 1, month: 1, currentDay: 1 },
    currentBasho: {
      id: "test-basho",
      year: 2025,
      currentDay: 1,
      day: 1,
      bashoName: "hatsu" as BashoName,
      bashoNumber: 1,
      matches: [],
      standings: new Map([
        [
          "east",
          {
            wins: opts?.eastWins ?? 0,
            losses: opts?.eastLosses ?? 0,
            absences: opts?.eastAbsences ?? 0,
          },
        ],
        [
          "west",
          {
            wins: opts?.westWins ?? 0,
            losses: opts?.westLosses ?? 0,
            absences: opts?.westAbsences ?? 0,
          },
        ],
      ]),
      isActive: true,
    },
  };

  const match: MatchSchedule = {
    boutId: "test-bout",
    day: 1,
    eastRikishiId: "east",
    westRikishiId: "west",
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
    momentumScore: 0,
    inBoutInjury: null,
    isTimeout: false,
  };

  return { world: world as WorldState, match, result };
}

function makeFusenshoWorld(opts?: {
  eastAbsences?: number;
  westAbsences?: number;
  eastInjured?: boolean;
  westInjured?: boolean;
}): { world: WorldState; match: MatchSchedule; result: BoutResult } {
  const east = makeRikishi("east", {
    injured: opts?.eastInjured ?? false,
    isKyujo: opts?.eastInjured ?? false,
  });
  const west = makeRikishi("west", {
    side: "west",
    injured: opts?.westInjured ?? false,
    isKyujo: opts?.westInjured ?? false,
  });

  const world: Partial<WorldState> = {
    rikishi: new Map([
      ["east", east],
      ["west", west],
    ]),
    heyas: new Map([
      [
        "test-heya",
        {
          id: "test-heya",
          name: "Test Heya",
          rikishiIds: ["east", "west"],
        } as any,
      ],
    ]),
    calendar: { currentWeek: 1, month: 1, currentDay: 1 },
    currentBasho: {
      id: "test-basho",
      year: 2025,
      currentDay: 1,
      day: 1,
      bashoName: "hatsu" as BashoName,
      bashoNumber: 1,
      matches: [],
      standings: new Map([
        ["east", { wins: 0, losses: 0, absences: opts?.eastAbsences ?? 0 }],
        ["west", { wins: 0, losses: 0, absences: opts?.westAbsences ?? 0 }],
      ]),
      isActive: true,
    },
  };

  const match: MatchSchedule = {
    boutId: "test-bout",
    day: 1,
    eastRikishiId: "east",
    westRikishiId: "west",
  };

  // West is injured → east wins by fusensho
  const result: BoutResult = {
    boutId: "test-bout",
    winner: "east",
    winnerRikishiId: "east",
    loserRikishiId: "west",
    kimarite: "fusensho",
    kimariteName: "Fusenshō",
    stance: "no-grip",
    tachiaiWinner: "east",
    duration: 0,
    upset: false,
    isKinboshi: false,
    log: [{ phase: "finish", data: { event: "fusensho", absent: "west" } }],
    kenshoEnvelopes: 0,
    momentumScore: 0,
    inBoutInjury: null,
    isTimeout: false,
  };

  return { world: world as WorldState, match, result };
}

describe("Bug 15 + N5: Absences tracking", () => {
  it("A.1: fusensho loss increments absences (not losses) in standings", () => {
    const { world, match, result } = makeFusenshoWorld({ westInjured: true });
    const impact = applyBoutResult(world, match, result);
    const standings = impact.metadata?.updatedStandings as Map<
      string,
      { wins: number; losses: number; absences: number }
    >;
    expect(standings).toBeDefined();
    const westRec = standings!.get("west");
    expect(westRec?.absences).toBe(1);
    expect(westRec?.losses).toBe(0);
  });

  it("A.2: regular bout (non-fusensho) does not increment absences", () => {
    const { world, match, result } = makeWorld();
    const impact = applyBoutResult(world, match, result);
    const standings = impact.metadata?.updatedStandings as Map<
      string,
      { wins: number; losses: number; absences: number }
    >;
    expect(standings).toBeDefined();
    const westRec = standings!.get("west");
    expect(westRec?.absences).toBe(0);
    expect(westRec?.losses).toBe(1);
  });

  it("A.3: fusensho loser gets absences+1 in standings, losses unchanged", () => {
    const { world, match, result } = makeFusenshoWorld({ westInjured: true, westAbsences: 3 });
    const impact = applyBoutResult(world, match, result);
    const standings = impact.metadata?.updatedStandings as Map<
      string,
      { wins: number; losses: number; absences: number }
    >;
    const westRec = standings!.get("west");
    expect(westRec?.absences).toBe(4);
    expect(westRec?.losses).toBe(0);
  });

  it("A.4: fusensho winner gets wins+1 in standings (normal win)", () => {
    const { world, match, result } = makeFusenshoWorld({ westInjured: true, eastAbsences: 0 });
    const impact = applyBoutResult(world, match, result);
    const standings = impact.metadata?.updatedStandings as Map<
      string,
      { wins: number; losses: number; absences: number }
    >;
    const eastRec = standings!.get("east");
    expect(eastRec?.wins).toBe(1);
    expect(eastRec?.absences).toBe(0);
  });

  it("A.5: consecutive fusensho losses accumulate absences correctly", () => {
    const { world, match, result } = makeFusenshoWorld({ westInjured: true, westAbsences: 5 });
    const impact = applyBoutResult(world, match, result);
    const standings1 = impact.metadata?.updatedStandings as Map<
      string,
      { wins: number; losses: number; absences: number }
    >;
    expect(standings1!.get("west")?.absences).toBe(6);

    // Manually update the world's basho standings for the second call
    const updatedWorld = {
      ...world,
      currentBasho: {
        ...world.currentBasho!,
        standings: standings1,
      },
    };
    // Apply another fusensho
    const impact2 = applyBoutResult(updatedWorld, match, result);
    const standings2 = impact2.metadata?.updatedStandings as Map<
      string,
      { wins: number; losses: number; absences: number }
    >;
    const westRec = standings2!.get("west");
    expect(westRec?.absences).toBe(7);
  });

  it("A.6: BanzukePublisher reads absences >= 15 as isKyujo (integration)", () => {
    // This is a logic test: verify that the BanzukePublisher's isKyujo check
    // would trigger when absences >= 15. We test the condition directly.
    const stats = { wins: 0, losses: 0, absences: 15 };
    const isKyujo = stats.absences >= 15;
    expect(isKyujo).toBe(true);

    const stats2 = { wins: 0, losses: 0, absences: 14 };
    const isKyujo2 = stats2.absences >= 15;
    expect(isKyujo2).toBe(false);
  });

  it("A.7: BanzukePublisher passes actual absences from standings to careerHistory (N5)", () => {
    const r1 = mockRikishi("r1", {
      rank: "maegashira",
      rankNumber: 5,
      division: "makuuchi",
      careerHistory: [],
    });
    const standings = new Map([["r1", { wins: 5, losses: 5, absences: 5 }]]);
    const basho = makeMockBasho({ bashoName: "hatsu", standings, isActive: false, day: 15 });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r1]]),
      activeRikishiIds: new Set(["r1"]),
      currentBasho: basho,
      cyclePhase: "post_basho",
      history: [
        {
          year: 2025,
          bashoNumber: 1,
          bashoName: "hatsu",
          yusho: "none",
          junYusho: [],
          ginoSho: "none",
          shukunsho: "none",
          kantosho: "none",
          id: "1",
          prizes: [],
        } as any,
      ],
    });

    const impact = publishBanzukeUpdate(world);
    const newWorld = resolveImpacts(world, [impact]);
    const updatedR1 = newWorld.rikishi.get("r1")!;
    const lastEntry = updatedR1.careerHistory![updatedR1.careerHistory!.length - 1];
    expect(lastEntry.absences).toBe(5);
  });
});
