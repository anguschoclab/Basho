import { describe, it, expect, beforeEach } from "vitest";
import { tickYear } from "@/engine/systems/generation/TalentPoolStateService";
import { makeMockWorld } from "../../utils";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import type { WorldState } from "@/engine/types/world";
import type { TalentCandidate, TalentPoolWorldState, TalentPoolType } from "@/engine/types/talent";

function makeCandidate(id: string, birthYear: number): TalentCandidate {
  return {
    candidateId: id,
    personId: `person_${id}`,
    name: `Candidate ${id}`,
    birthYear,
    originRegion: "Japan",
    nationality: "Japan",
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
  };
}

function makeTalentPool(
  candidates: Record<string, TalentCandidate>,
  pools: Partial<
    Record<TalentPoolType, { candidatesVisible: string[]; candidatesHidden: string[] }>
  > = {}
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

describe("TalentPoolStateService — candidate removal via tickYear", () => {
  let world: WorldState;

  beforeEach(() => {
    world = makeMockWorld({ year: 2025 });
  });

  it("removes aged-out candidates from the candidates object", () => {
    // high_school maxAge = 20, so a candidate born 2002 is age 23 in 2025 → should be removed
    const oldCandidate = makeCandidate("old-1", 2002);
    // Born 2010 → age 15 in 2025 → should stay
    const youngCandidate = makeCandidate("young-1", 2010);

    const tp = makeTalentPool(
      { "old-1": oldCandidate, "young-1": youngCandidate },
      {
        high_school: {
          candidatesVisible: ["old-1", "young-1"],
          candidatesHidden: [],
        },
      }
    );

    world.talentPool = tp;

    const impact = tickYear(world);
    const newWorld = resolveImpacts(world, [impact]);
    const newTp = newWorld.talentPool!;

    expect(newTp.candidates["old-1"]).toBeUndefined();
    expect(newTp.candidates["young-1"]).toBeDefined();
  });

  it("preserves candidates not in removedSet", () => {
    const c1 = makeCandidate("keep-1", 2010);
    const c2 = makeCandidate("keep-2", 2009);
    const c3 = makeCandidate("keep-3", 2011);

    const tp = makeTalentPool(
      { "keep-1": c1, "keep-2": c2, "keep-3": c3 },
      {
        high_school: {
          candidatesVisible: ["keep-1", "keep-2", "keep-3"],
          candidatesHidden: [],
        },
      }
    );

    world.talentPool = tp;

    const impact = tickYear(world);
    const newWorld = resolveImpacts(world, [impact]);
    const newTp = newWorld.talentPool!;

    expect(newTp.candidates["keep-1"]).toBeDefined();
    expect(newTp.candidates["keep-2"]).toBeDefined();
    expect(newTp.candidates["keep-3"]).toBeDefined();
  });

  it("all candidates preserved when none are aged out", () => {
    const c1 = makeCandidate("young-1", 2010);
    const c2 = makeCandidate("young-2", 2009);

    const tp = makeTalentPool(
      { "young-1": c1, "young-2": c2 },
      {
        high_school: {
          candidatesVisible: ["young-1", "young-2"],
          candidatesHidden: [],
        },
      }
    );

    world.talentPool = tp;

    const impact = tickYear(world);
    const newWorld = resolveImpacts(world, [impact]);
    const newTp = newWorld.talentPool!;

    expect(Object.keys(newTp.candidates)).toContain("young-1");
    expect(Object.keys(newTp.candidates)).toContain("young-2");
  });

  it("removes ghost IDs (missing candidate data) from visible lists", () => {
    const realCandidate = makeCandidate("real-1", 2010);

    const tp = makeTalentPool(
      { "real-1": realCandidate },
      {
        high_school: {
          candidatesVisible: ["real-1", "ghost-1", "ghost-2"],
          candidatesHidden: [],
        },
      }
    );

    world.talentPool = tp;

    const impact = tickYear(world);
    const newWorld = resolveImpacts(world, [impact]);
    const newTp = newWorld.talentPool!;

    // Ghost IDs should be removed from visible list
    expect(newTp.pools.high_school.candidatesVisible).not.toContain("ghost-1");
    expect(newTp.pools.high_school.candidatesVisible).not.toContain("ghost-2");
    expect(newTp.pools.high_school.candidatesVisible).toContain("real-1");
    // Ghost IDs should also be removed from candidates object
    expect(newTp.candidates["ghost-1"]).toBeUndefined();
    expect(newTp.candidates["ghost-2"]).toBeUndefined();
  });
});
