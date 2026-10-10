/**
 * Golden-master characterization for const-object service monoliths targeted
 * by Phase-2 splits (weakest existing coverage):
 *   CrisisService (1 prior test), DynastyService (2), GlobalCupService (2),
 *   YokozunaService (3)
 *
 * Written BEFORE the splits; snapshots must match byte-for-byte after.
 * Snapshots the exact StateImpact/payload outputs on seeded fixture worlds.
 */
import { describe, it, expect } from "vitest";
import { CrisisService } from "@/engine/systems/narrative/CrisisService";
import { DynastyService } from "@/engine/systems/legacy/DynastyService";
import { GlobalCupService } from "@/engine/systems/economy/GlobalCupService";
import { YokozunaService } from "@/engine/systems/governance/YokozunaService";
import { makeMockWorld, mockRikishi, makeMockHeya } from "../utils";
import type { Oyakata } from "@/engine/types/oyakata";

function mockOyakata(id: string, overrides: Partial<Oyakata> = {}): Oyakata {
  return {
    id,
    heyaId: "heya-1",
    name: `Oyakata-${id}`,
    shikona: `Shikona-${id}`,
    age: 55,
    archetype: "technician",
    traits: {},
    yearsInCharge: 5,
    ...overrides,
  } as Oyakata;
}

/** Deterministically serialize a StateImpact for golden-master comparison. */
function impactDigest(impact: unknown): string {
  return JSON.stringify(
    impact,
    (_k, v) => (v instanceof Map ? { __map: [...v.entries()].sort() } : v),
    2
  );
}

describe("CrisisService — golden master", () => {
  it("empty world across weeks (no-crisis vs triggered depends on seeded roll)", () => {
    for (const week of [1, 2, 3, 4, 5]) {
      const world = makeMockWorld({ week });
      const impact = CrisisService.checkForWeeklyCrisis(world);
      expect(impactDigest(impact)).toMatchSnapshot();
    }
  });

  it("_autonomousSim world always yields empty impact", () => {
    const world = makeMockWorld({ week: 3 });
    (world as { _autonomousSim?: boolean })._autonomousSim = true;
    expect(impactDigest(CrisisService.checkForWeeklyCrisis(world))).toMatchSnapshot();
  });

  it("rollEvent registry selection across seeds", () => {
    for (const week of [7, 11, 13]) {
      const world = makeMockWorld({ week });
      expect(CrisisService.rollEvent(world)).toMatchSnapshot();
    }
  });
});

describe("DynastyService — golden master", () => {
  function worldWithOyakata(age: number, successors: Array<ReturnType<typeof mockRikishi>> = []) {
    const heya = makeMockHeya("heya-1", {
      oyakataId: "oya-1",
      rikishiIds: successors.map((r) => r.id),
    });
    const world = makeMockWorld({
      heyas: new Map([[heya.id, heya]]),
      rikishi: new Map(successors.map((r) => [r.id, r])),
      activeRikishiIds: new Set(successors.map((r) => r.id)),
    });
    world.oyakata.set("oya-1", mockOyakata("oya-1", { age }));
    return world;
  }

  const AGES = [50, 59, 60, 62, 64, 65, 70];

  for (const age of AGES) {
    it(`tickSuccessionCheck at oyakata age ${age} (no successors)`, () => {
      const world = worldWithOyakata(age);
      expect(impactDigest(DynastyService.tickSuccessionCheck(world))).toMatchSnapshot();
    });
  }

  it("age 65 with eligible sekitori successor", () => {
    const world = worldWithOyakata(65, [
      mockRikishi("r-sec", { heyaId: "heya-1", division: "makuuchi", rank: "maegashira" }),
    ]);
    expect(impactDigest(DynastyService.tickSuccessionCheck(world))).toMatchSnapshot();
  });

  it("age 65 with only makushita-top10 drought fallback", () => {
    const world = worldWithOyakata(65, [
      mockRikishi("r-mak", { heyaId: "heya-1", division: "makushita", rankNumber: 5 }),
    ]);
    expect(impactDigest(DynastyService.tickSuccessionCheck(world))).toMatchSnapshot();
  });

  it("findEligibleSuccessors across roster shapes", () => {
    const world = worldWithOyakata(60, [
      mockRikishi("r-sec", { heyaId: "heya-1", division: "juryo" }),
      mockRikishi("r-mak", { heyaId: "heya-1", division: "makushita", rankNumber: 3 }),
      mockRikishi("r-other", { heyaId: "heya-2", division: "makuuchi" }),
    ]);
    expect(DynastyService.findEligibleSuccessors(world, "heya-1")).toMatchSnapshot();
  });

  it("deriveLegacyTier / getLegacyTierTrainingBonus", () => {
    expect(
      ["none", "bronze", "silver", "gold", "platinum", "mythic", undefined].map((t) => [
        t,
        DynastyService.getLegacyTierTrainingBonus(t),
      ])
    ).toMatchSnapshot();
  });
});

describe("GlobalCupService — golden master", () => {
  function cupWorld() {
    const roster = [
      mockRikishi("r-yoko", { rank: "yokozuna", nationality: "JP" }),
      mockRikishi("r-ozeki", { rank: "ozeki" }),
      mockRikishi("r-seki", { rank: "sekiwake" }),
      mockRikishi("r-komu", { rank: "komusubi" }),
      mockRikishi("r-m1", { rank: "maegashira", rankNumber: 1 }),
      mockRikishi("r-m5", { rank: "maegashira", rankNumber: 5 }),
      mockRikishi("r-m10", { rank: "maegashira", rankNumber: 10, injured: true }),
      mockRikishi("r-jry", { rank: "maegashira", division: "juryo", rankNumber: 2 }),
    ];
    return makeMockWorld({
      rikishi: new Map(roster.map((r) => [r.id, r])),
      activeRikishiIds: new Set(roster.map((r) => r.id)),
    });
  }

  it("selectParticipants ordering + foreign slots", () => {
    expect(GlobalCupService.selectParticipants(cupWorld())).toMatchSnapshot();
  });

  it("initializeTournament impact", () => {
    expect(impactDigest(GlobalCupService.initializeTournament(cupWorld()))).toMatchSnapshot();
  });

  it("simulateMatch deterministic result", () => {
    const world = cupWorld();
    const participants = GlobalCupService.selectParticipants(world);
    if (participants.length >= 2) {
      const match = {
        id: "m1",
        round: 1,
        east: participants[0],
        west: participants[1],
      } as unknown as Parameters<typeof GlobalCupService.simulateMatch>[1];
      expect(GlobalCupService.simulateMatch(world, match)).toMatchSnapshot();
    }
  });
});

describe("YokozunaService — golden master", () => {
  function ydcWorld(historyLength = 2) {
    return makeMockWorld({
      history: Array.from({ length: historyLength }, (_, i) => ({ bashoId: `b${i}` })),
    } as unknown as Parameters<typeof makeMockWorld>[0]);
  }

  it("evaluateCandidate across rikishi profiles", () => {
    const world = ydcWorld();
    const cases: Array<[label: string, Partial<Parameters<typeof mockRikishi>[1]>]> = [
      ["maegashira-not-candidate", { rank: "maegashira" }],
      ["ozeki-14wins", { rank: "ozeki", currentBashoWins: 14 }],
      ["ozeki-10wins", { rank: "ozeki", currentBashoWins: 10 }],
      ["ozeki-8wins", { rank: "ozeki", currentBashoWins: 8 }],
      ["ozeki-4wins", { rank: "ozeki", currentBashoWins: 4 }],
      ["yokozuna-already", { rank: "yokozuna", currentBashoWins: 14 }],
    ];
    for (const [label, ov] of cases) {
      const r = mockRikishi(`r-${label}`, ov as Parameters<typeof mockRikishi>[1]);
      expect([label, YokozunaService.evaluateCandidate(world, r)]).toMatchSnapshot();
    }
  });

  it("evaluateCandidate with insufficient history returns null", () => {
    const world = ydcWorld(1);
    const r = mockRikishi("r-oz", { rank: "ozeki", currentBashoWins: 15 });
    expect(YokozunaService.evaluateCandidate(world, r)).toBeNull();
  });
});
