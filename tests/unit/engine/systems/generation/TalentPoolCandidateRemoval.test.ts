import { describe, it, expect, beforeEach } from "vitest";
import { tickTalentPoolYear } from "@/engine/generation/TalentPoolStateService";
import { makeMockWorld } from "@tests/unit/engine/utils";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { validateWorldIdIntegrity } from "@/engine/core/idIntegrity";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";
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
      counterFamily: "push",
      archetypeBehavior: {
        tachiaiSpeedBonus: 0,
        lateralMovementBonus: 0,
        edgeEscapeBonus: 0,
        beltTorqueBonus: 0,
        pushVelocityBonus: 0,
      },
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

describe("TalentPoolStateService — candidate removal via tickTalentPoolYear", () => {
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

    const impact = tickTalentPoolYear(world);
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

    const impact = tickTalentPoolYear(world);
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

    const impact = tickTalentPoolYear(world);
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

    const impact = tickTalentPoolYear(world);
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

  it("tombstones aged-out prospects so lifetime refs stay resolvable", () => {
    // high_school maxAge = 20 — born 2002 is age 23 in 2025 → removed.
    const oldCandidate = makeCandidate("old-1", 2002);
    const tp = makeTalentPool(
      { "old-1": oldCandidate },
      { high_school: { candidatesVisible: ["old-1"], candidatesHidden: [] } }
    );
    world.talentPool = tp;

    // A heya exists so request/heya refs resolve independently of the person
    // tombstone under test.
    world.heyas.set("heya-a", { id: "heya-a", rikishiIds: [] } as unknown as Heya);

    // Records written while the prospect was live keep referencing his
    // personId after he leaves the pool (production: signing-offer events
    // log rikishiId = candidate.personId; pending requests carry the same).
    world.events = {
      version: "1.0.0",
      log: [
        {
          id: "ev-1",
          type: "RECRUIT_DISCOVERED",
          year: 2025,
          week: 10,
          phase: "weekly",
          category: "scouting",
          importance: "minor",
          scope: "rikishi",
          rikishiId: "person_old-1",
          title: "Prospect scouted",
          summary: "A scout filed a report.",
          data: {},
        },
      ],
      dedupe: {},
    };
    world.pendingRikishiRequests = [
      {
        id: "req-1",
        rikishiId: "person_old-1",
        heyaId: "heya-a",
        type: "request_rest",
        createdWeek: 9,
        reason: "fatigue",
      },
    ];

    const newWorld = resolveImpacts(world, [tickTalentPoolYear(world)]);

    // The prospect is gone from the pool but tombstoned with his personId.
    expect(newWorld.talentPool!.candidates["old-1"]).toBeUndefined();
    expect(newWorld.talentPool!.departedIds).toContain("old-1");
    expect(newWorld.talentPool!.departedIds).toContain("person_old-1");

    const personViolations = validateWorldIdIntegrity(newWorld).filter(
      (v) => v.id === "person_old-1" || v.id === "old-1"
    );
    expect(personViolations).toEqual([]);
  });
});
