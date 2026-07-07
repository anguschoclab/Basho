import { describe, it, expect } from "vitest";
import { listVisibleCandidates } from "@/engine/systems/generation/TalentPoolScouting";
import { makeMockWorld, makeMockHeya } from "../../utils";
import type { TalentCandidate, TalentPoolWorldState, TalentPoolType } from "@/engine/types/talent";

function makeCandidate(id: string, overrides: Partial<TalentCandidate> = {}): TalentCandidate {
  return {
    candidateId: id,
    personId: `person_${id}`,
    name: `Candidate ${id}`,
    birthYear: 2005,
    originRegion: "Mongolia",
    nationality: "Mongolia",
    visibilityBand: "rumored",
    reputationSeed: 50,
    tags: [],
    combatProfile: {
      archetype: "oshi",
      familyPreferences: { push: 10, belt: 0, trick: 0, speed: 0 },
      preferredGrip: "none",
      preferredGripDepth: "standard",
      statModifiers: {},
    },
    availabilityState: "available",
    competingSuitors: [],
    archetype: "oshi",
    style: "oshi",
    heightPotentialCm: 180,
    weightPotentialKg: 140,
    talentSeed: 50,
    temperament: { discipline: 50, volatility: 50 },
    ...overrides,
  };
}

function makeTalentPool(
  candidates: Record<string, TalentCandidate>,
  pools: Partial<Record<TalentPoolType, { candidatesVisible: string[]; candidatesHidden: string[] }>> = {}
): TalentPoolWorldState {
  return {
    version: "1.0.0",
    lastYearlyRefreshYear: 2025,
    candidates,
    pools: {
      high_school: {
        poolId: "hs",
        poolType: "high_school",
        refreshCadence: "monthly",
        populationCap: 20,
        hiddenReserveCap: 50,
        candidatesVisible: pools.high_school?.candidatesVisible ?? [],
        candidatesHidden: pools.high_school?.candidatesHidden ?? [],
        lastRefreshWeek: 1,
        scarcityBand: "normal",
        qualityBand: "normal",
      },
      university: {
        poolId: "uni",
        poolType: "university",
        refreshCadence: "monthly",
        populationCap: 20,
        hiddenReserveCap: 50,
        candidatesVisible: pools.university?.candidatesVisible ?? [],
        candidatesHidden: pools.university?.candidatesHidden ?? [],
        lastRefreshWeek: 1,
        scarcityBand: "normal",
        qualityBand: "normal",
      },
      foreign: {
        poolId: "foreign",
        poolType: "foreign",
        refreshCadence: "monthly",
        populationCap: 20,
        hiddenReserveCap: 50,
        candidatesVisible: pools.foreign?.candidatesVisible ?? [],
        candidatesHidden: pools.foreign?.candidatesHidden ?? [],
        lastRefreshWeek: 1,
        scarcityBand: "normal",
        qualityBand: "normal",
      },
    },
  };
}

describe("listVisibleCandidates", () => {
  it("returns empty array when talentPool is missing", () => {
    const world = makeMockWorld();
    expect(listVisibleCandidates(world, "high_school")).toEqual([]);
  });

  it("returns empty array when pool is missing", () => {
    const world = makeMockWorld({ talentPool: makeTalentPool({}) } as any);
    // Pool exists but has no visible candidates
    expect(listVisibleCandidates(world, "high_school")).toEqual([]);
  });

  it("returns all visible candidates for non-foreign pools", () => {
    const c1 = makeCandidate("c1");
    const c2 = makeCandidate("c2");
    const world = makeMockWorld({
      talentPool: makeTalentPool(
        { c1, c2 },
        { high_school: { candidatesVisible: ["c1", "c2"], candidatesHidden: [] } }
      ),
    } as any);

    const result = listVisibleCandidates(world, "high_school");
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.candidateId)).toEqual(["c1", "c2"]);
  });

  it("filters foreign candidates by regional presence >= 40", () => {
    const c1 = makeCandidate("c1", { originRegion: "Mongolia" });
    const c2 = makeCandidate("c2", { originRegion: "Georgia" });
    const heya = makeMockHeya("h1", {
      regionalPresence: { Mongolia: 10, Georgia: 85 } as any,
    });
    const world = makeMockWorld({
      talentPool: makeTalentPool(
        { c1, c2 },
        { foreign: { candidatesVisible: ["c1", "c2"], candidatesHidden: [] } }
      ),
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
    } as any);

    const result = listVisibleCandidates(world, "foreign");
    expect(result).toHaveLength(1);
    expect(result[0].candidateId).toBe("c2");
  });

  it("returns all foreign candidates when no player heya", () => {
    const c1 = makeCandidate("c1", { originRegion: "Mongolia" });
    const c2 = makeCandidate("c2", { originRegion: "Georgia" });
    const world = makeMockWorld({
      talentPool: makeTalentPool(
        { c1, c2 },
        { foreign: { candidatesVisible: ["c1", "c2"], candidatesHidden: [] } }
      ),
    } as any);

    const result = listVisibleCandidates(world, "foreign");
    expect(result).toHaveLength(2);
  });

  it("does not include undefined candidates from visible list", () => {
    const c1 = makeCandidate("c1");
    const world = makeMockWorld({
      talentPool: makeTalentPool(
        { c1 },
        { high_school: { candidatesVisible: ["c1", "ghost"], candidatesHidden: [] } }
      ),
    } as any);

    const result = listVisibleCandidates(world, "high_school");
    expect(result).toHaveLength(1);
    expect(result[0].candidateId).toBe("c1");
  });
});
