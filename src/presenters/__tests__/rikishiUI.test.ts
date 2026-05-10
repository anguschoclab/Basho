import { describe, it, expect } from "vitest";
import { rankScore, projectRosterEntry } from "../rikishiUI";
import { mockRikishi } from "../../engine/__tests__/utils";
import type { WorldState } from "../../engine/types/world";
import { projectRikishi } from "../rikishiUI";
import { SeededRNG } from "../../engine/rng";

describe("rikishiUI - rankScore", () => {
  it("should calculate correct score for yokozuna 1 east", () => {
    // tier 1 * 1000 + 1 * 2 + 0 = 1002
    expect(rankScore("yokozuna", 1, "east")).toBe(1002);
  });

  it("should calculate correct score for yokozuna 1 west", () => {
    // tier 1 * 1000 + 1 * 2 + 0.5 = 1002.5
    expect(rankScore("yokozuna", 1, "west")).toBe(1002.5);
  });

  it("should calculate correct score for ozeki 1 east", () => {
    // tier 2 * 1000 + 1 * 2 + 0 = 2002
    expect(rankScore("ozeki", 1, "east")).toBe(2002);
  });

  it("should calculate correct score for maegashira 5 west", () => {
    // tier 5 * 1000 + 5 * 2 + 0.5 = 5010.5
    expect(rankScore("maegashira", 5, "west")).toBe(5010.5);
  });

  it("should handle missing side (defaults to 0.5)", () => {
    // tier 5 * 1000 + 5 * 2 + 0.5 = 5010.5
    expect(rankScore("maegashira", 5)).toBe(5010.5);
  });

  it("should handle missing rankNumber (defaults to 0)", () => {
    // tier 3 * 1000 + 0 * 2 + 0 = 3000
    expect(rankScore("sekiwake", undefined, "east")).toBe(3000);
  });

  it("should handle missing rankNumber and side", () => {
    // tier 4 * 1000 + 0 * 2 + 0.5 = 4000.5
    expect(rankScore("komusubi")).toBe(4000.5);
  });

  it("should handle unknown ranks (defaults to tier 99)", () => {
    // tier 99 * 1000 + 2 * 2 + 0 = 99004
    expect(rankScore("unknown_rank", 2, "east")).toBe(99004);
  });

  it("should return lowest score (highest rank) for yokozuna 1 east", () => {
    const yokozuna1East = rankScore("yokozuna", 1, "east");
    const yokozuna1West = rankScore("yokozuna", 1, "west");
    const ozeki1East = rankScore("ozeki", 1, "east");

    expect(yokozuna1East).toBeLessThan(yokozuna1West);
    expect(yokozuna1West).toBeLessThan(ozeki1East);
  });
});

describe("projectRosterEntry", () => {
  const baseRikishi = mockRikishi("r1", {
    shikona: "Testyama",
    heyaId: "h1",
    rank: "maegashira",
    rankNumber: 5,
    division: "makuuchi",
    side: "east",
    currentBashoWins: 8,
    currentBashoLosses: 7,
    careerWins: 100,
    careerLosses: 50,
    injured: true,
    condition: 80,
    fatigue: 10,
    power: 85,
    technique: 75,
    speed: 65,
    balance: 55,
    momentum: 5,
    talentSeed: 90,

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing edge case with invalid archetype
  });

  it("should map base rikishi properties correctly", () => {
    const entry = projectRosterEntry(baseRikishi);
    expect(entry.id).toBe("r1");
    expect(entry.shikona).toBe("Testyama");
    expect(entry.record).toBe("8-7");
    expect(entry.careerRecord).toBe("100-50");
    expect(entry.isInjured).toBe(true);
    expect(entry.condition).toBe(80);
    expect(entry.fatigue).toBe(10);
    expect(entry.momentum).toBe(5);

    // Check stat bands mapping
    expect(entry.powerBand).toEqual(expect.any(String));
    expect(entry.techniqueBand).toEqual(expect.any(String));
    expect(entry.speedBand).toEqual(expect.any(String));
    expect(entry.balanceBand).toEqual(expect.any(String));
    expect(entry.potentialBand).toEqual(expect.any(String));
    expect(entry.archetypeLabel).toBeDefined();
  });

  it("should resolve heya ownership correctly when world state is provided", () => {
    const world = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing with partial world object
      heyas: new Map([["h1", { id: "h1", isPlayerOwned: true } as any]]),
    } as unknown as WorldState;

    const entry = projectRosterEntry(baseRikishi, world);
    expect(entry.isPlayerOwned).toBe(true);
  });

  it("should default heya ownership to false if world state is omitted or heya not found", () => {
    const entryWithoutWorld = projectRosterEntry(baseRikishi);
    expect(entryWithoutWorld.isPlayerOwned).toBe(false);

    const worldWithDifferentHeya = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock
      heyas: new Map([["h2", { id: "h2", isPlayerOwned: true } as any]]),
    } as unknown as WorldState;
    const entryNotFound = projectRosterEntry(baseRikishi, worldWithDifferentHeya);
    expect(entryNotFound.isPlayerOwned).toBe(false);
  });

  it("should calculate rankDelta correctly based on prevScore", () => {
    const currScore = rankScore(baseRikishi.rank, baseRikishi.rankNumber, baseRikishi.side); // M5 East

    // Unchanged
    const unchangedEntry = projectRosterEntry(baseRikishi, undefined, currScore);
    expect(unchangedEntry.rankDelta).toEqual({ type: "unchanged", steps: 0 });

    // Up (prevScore > currScore, lower score means higher rank)
    const upEntry = projectRosterEntry(baseRikishi, undefined, currScore + 4);
    expect(upEntry.rankDelta).toEqual({ type: "up", steps: 2 });

    // Down (prevScore < currScore)
    const downEntry = projectRosterEntry(baseRikishi, undefined, currScore - 6);
    expect(downEntry.rankDelta).toEqual({ type: "down", steps: 3 });
  });

  it('should set rankDelta to "new" if no prevScore but world history exists', () => {
    const worldWithHistory = {
      heyas: new Map(),
      history: [{}], // mocked non-empty history
    } as unknown as WorldState;

    const entry = projectRosterEntry(baseRikishi, worldWithHistory);
    expect(entry.rankDelta).toEqual({ type: "new", steps: 0 });
  });

  it("should not set rankDelta if no prevScore and no world history", () => {
    const worldNoHistory = {
      heyas: new Map(),
      history: [],
    } as unknown as WorldState;

    const entry1 = projectRosterEntry(baseRikishi);
    expect(entry1.rankDelta).toBeUndefined();

    const entry2 = projectRosterEntry(baseRikishi, worldNoHistory);
    expect(entry2.rankDelta).toBeUndefined();
  });
});

describe("projectRikishi - new band calculations", () => {
  const baseWorld = {
    year: 2020,
    heyas: new Map([["h1", { id: "h1", name: "Test Heya", isPlayerOwned: true }]]),
    rikishi: new Map(),
  } as unknown as WorldState;

  it("should calculate age band correctly based on birth year", () => {
    const rikishi = mockRikishi("r1", {
      shikona: "Testyama",
      heyaId: "h1",
      birthYear: 2000, // 20 years old
      height: 175,
      weight: 85,
    });

    const projected = projectRikishi(rikishi, baseWorld);
    expect(projected.age).toBe(20);
    expect(projected.ageBand).toEqual(expect.any(String));
    expect(projected.ageDescriptor).toEqual(expect.any(String));
  });

  it("should calculate weight band correctly", () => {
    const rikishi = mockRikishi("r1", {
      shikona: "Testyama",
      heyaId: "h1",
      birthYear: 2000,
      height: 175,
      weight: 120, // Heavy weight
    });

    const projected = projectRikishi(rikishi, baseWorld);
    expect(projected.weight).toBe(120);
    expect(projected.weightBand).toEqual(expect.any(String));
    expect(projected.weightDescriptor).toEqual(expect.any(String));
  });

  it("should calculate height band correctly", () => {
    const rikishi = mockRikishi("r1", {
      shikona: "Testyama",
      heyaId: "h1",
      birthYear: 2000,
      height: 190, // Tall
      weight: 85,
    });

    const projected = projectRikishi(rikishi, baseWorld);
    expect(projected.height).toBe(190);
    expect(projected.heightBand).toEqual(expect.any(String));
    expect(projected.heightDescriptor).toEqual(expect.any(String));
  });

  it("should include all new descriptor fields in UIRikishi", () => {
    const rikishi = mockRikishi("r1", {
      shikona: "Testyama",
      heyaId: "h1",
      birthYear: 1995,
      height: 180,
      weight: 95,
    });

    const projected = projectRikishi(rikishi, baseWorld);
    expect(projected).toHaveProperty("ageBand");
    expect(projected).toHaveProperty("weightBand");
    expect(projected).toHaveProperty("heightBand");
    expect(projected).toHaveProperty("ageDescriptor");
    expect(projected).toHaveProperty("weightDescriptor");
    expect(projected).toHaveProperty("heightDescriptor");
  });
});
