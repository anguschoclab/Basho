/**
 * src/engine/__tests__/TalentPoolService.test.ts
 * ================================================
 * Tests for TalentPoolService NPC fast-path and materialization:
 *   - fillVacanciesForNPC adds new rikishi to world and heya roster
 *   - materializeCandidateToRikishi produces a StateImpact with correct entity updates
 *   - finalizeSignedCandidates converts all signed candidates
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from "vitest";
import { makeMockWorld, makeMockHeya } from "./utils";
import {
  fillVacanciesForNPC,
  materializeCandidateToRikishi,
  finalizeSignedCandidates,
} from "../systems/generation/TalentPoolService";
import { resolveImpacts } from "../core/ImpactResolver";

// ── Talent Pool setup helper ───────────────────────────────────────────────

function makeTalentPool(candidateId: string, availabilityState = "available") {
  return {
    version: "1.0.0",
    lastYearlyRefreshYear: 2024,
    candidates: {
      [candidateId]: {
        candidateId,
        personId: `person-${candidateId}`,
        name: "Test Recruit",
        birthYear: 2006,
        nationality: "Japan",
        originRegion: "Tokyo",
        talentSeed: 50,
        availabilityState,
        competingSuitors:
          availabilityState === "signed"
            ? [{ heyaId: "npc-heya", offerType: "standard", interestBand: "high", deadlineWeek: 1 }]
            : [],
        combatProfile: { archetype: "oshi", statModifiers: {} },
        archetype: "oshi",
        temperament: { discipline: 60, volatility: 30 },
      },
    },
    pools: {
      high_school: {
        poolId: "pool-hs",
        poolType: "high_school",
        candidatesVisible: [candidateId],
        candidatesHidden: [],
        refreshCadence: "basho",
        populationCap: 20,
        hiddenReserveCap: 50,
        lastRefreshWeek: 0,
        scarcityBand: "normal",
        qualityBand: "normal",
      },
      university: {
        poolId: "pool-uni",
        poolType: "university",
        candidatesVisible: [],
        candidatesHidden: [],
        refreshCadence: "basho",
        populationCap: 10,
        hiddenReserveCap: 20,
        lastRefreshWeek: 0,
        scarcityBand: "normal",
        qualityBand: "normal",
      },
      foreign: {
        poolId: "pool-for",
        poolType: "foreign",
        candidatesVisible: [],
        candidatesHidden: [],
        refreshCadence: "basho",
        populationCap: 5,
        hiddenReserveCap: 10,
        lastRefreshWeek: 0,
        scarcityBand: "normal",
        qualityBand: "normal",
      },
    },
  } as any;
}

// ── fillVacanciesForNPC ────────────────────────────────────────────────────

describe("fillVacanciesForNPC", () => {
  it("returns an empty impact when no talent pool exists", () => {
    const world = makeMockWorld();
    const impact = fillVacanciesForNPC(world, { "npc-heya": 1 });
    expect(impact.entities?.rikishiUpdates?.size ?? 0).toBe(0);
  });

  it("returns an empty impact when no candidates are visible", () => {
    const world = makeMockWorld({
      heyas: new Map([["npc-heya", makeMockHeya("npc-heya")]]),
    });
    world.talentPool = makeTalentPool("cand-1");
    // Empty all visible slots
    world.talentPool.pools.high_school.candidatesVisible = [];

    const impact = fillVacanciesForNPC(world, { "npc-heya": 1 });
    expect(impact.entities?.rikishiUpdates?.size ?? 0).toBe(0);
  });

  it("materializes a candidate into a new rikishi for an NPC heya", () => {
    const heyaId = "npc-heya";
    const heya = makeMockHeya(heyaId, { rikishiIds: [] });
    const world = makeMockWorld({
      heyas: new Map([[heyaId, heya]]),
      rikishi: new Map(),
      seed: "talent-test-seed",
    });
    // Put the candidate in all pool types so any RNG pick succeeds
    world.talentPool = makeTalentPool("cand-1");
    world.talentPool.pools.university.candidatesVisible = ["cand-1"];
    world.talentPool.pools.foreign.candidatesVisible = ["cand-1"];

    // Request enough vacancies that at least one pool type returns a candidate
    const impact = fillVacanciesForNPC(world, { [heyaId]: 3 });
    const nextWorld = resolveImpacts(world, [impact]);

    // A new rikishi should be present
    expect(nextWorld.rikishi.size).toBeGreaterThan(0);
  });

  it("adds the new rikishi to the NPC heya's roster", () => {
    const heyaId = "npc-heya";
    const heya = makeMockHeya(heyaId, { rikishiIds: [] });
    const world = makeMockWorld({
      heyas: new Map([[heyaId, heya]]),
      rikishi: new Map(),
      seed: "talent-test-seed",
    });
    world.talentPool = makeTalentPool("cand-1");
    world.talentPool.pools.university.candidatesVisible = ["cand-1"];
    world.talentPool.pools.foreign.candidatesVisible = ["cand-1"];

    const impact = fillVacanciesForNPC(world, { [heyaId]: 3 });
    const nextWorld = resolveImpacts(world, [impact]);

    const updatedHeya = nextWorld.heyas.get(heyaId);
    expect(updatedHeya?.rikishiIds.length).toBeGreaterThan(0);
  });
});

// ── materializeCandidateToRikishi ─────────────────────────────────────────

describe("materializeCandidateToRikishi", () => {
  it("returns empty impact when candidate does not exist", () => {
    const world = makeMockWorld();
    world.talentPool = makeTalentPool("cand-1");
    const impact = materializeCandidateToRikishi(world, "non-existent-id", "some-heya");
    expect(impact.entities?.rikishiUpdates?.size ?? 0).toBe(0);
  });

  it("produces a rikishi update for the new recruit", () => {
    const heyaId = "test-heya";
    const heya = makeMockHeya(heyaId, { rikishiIds: [] });
    const world = makeMockWorld({
      heyas: new Map([[heyaId, heya]]),
      seed: "materialize-seed",
    });
    world.talentPool = makeTalentPool("cand-1");

    const impact = materializeCandidateToRikishi(world, "cand-1", heyaId);

    expect(impact.entities?.rikishiUpdates).toBeDefined();
    expect(impact.entities!.rikishiUpdates!.size).toBe(1);
  });

  it("links the new rikishi to the correct heya in the impact", () => {
    const heyaId = "test-heya";
    const heya = makeMockHeya(heyaId, { rikishiIds: [] });
    const world = makeMockWorld({
      heyas: new Map([[heyaId, heya]]),
      seed: "materialize-seed",
    });
    world.talentPool = makeTalentPool("cand-1");

    const impact = materializeCandidateToRikishi(world, "cand-1", heyaId);

    // Check heya update includes the new rikishi id
    const heyaUpdate = impact.entities?.heyaUpdates?.get(heyaId);
    expect(heyaUpdate?.rikishiIds).toBeDefined();
    expect(heyaUpdate!.rikishiIds!.length).toBeGreaterThan(0);
  });

  it("removes the candidate from talentPool after materialization", () => {
    const heyaId = "test-heya";
    const heya = makeMockHeya(heyaId, { rikishiIds: [] });
    const world = makeMockWorld({
      heyas: new Map([[heyaId, heya]]),
      seed: "materialize-seed",
    });
    world.talentPool = makeTalentPool("cand-1");

    materializeCandidateToRikishi(world, "cand-1", heyaId);

    // Candidate should be removed from the pool (direct mutation per implementation note)
    expect(world.talentPool?.candidates["cand-1"]).toBeUndefined();
  });
});

// ── finalizeSignedCandidates ───────────────────────────────────────────────

describe("finalizeSignedCandidates", () => {
  it("converts all signed candidates into rikishi", () => {
    const heyaId = "test-heya";
    const heya = makeMockHeya(heyaId, { rikishiIds: [] });
    const world = makeMockWorld({
      heyas: new Map([[heyaId, heya]]),
      rikishi: new Map(),
      seed: "finalize-seed",
    });
    // Candidate already signed
    world.talentPool = makeTalentPool("cand-signed", "signed");
    world.talentPool.candidates["cand-signed"].competingSuitors = [
      { heyaId, offerType: "standard", interestBand: "high", deadlineWeek: 1 },
    ];

    const impact = finalizeSignedCandidates(world);
    const nextWorld = resolveImpacts(world, [impact]);

    expect(nextWorld.rikishi.size).toBeGreaterThan(0);
    const updatedHeya = nextWorld.heyas.get(heyaId);
    expect(updatedHeya?.rikishiIds.length).toBeGreaterThan(0);
  });

  it("returns empty impact when no candidates are signed", () => {
    const world = makeMockWorld();
    world.talentPool = makeTalentPool("cand-1", "available");

    const impact = finalizeSignedCandidates(world);
    expect(impact.entities?.rikishiUpdates?.size ?? 0).toBe(0);
  });
});
