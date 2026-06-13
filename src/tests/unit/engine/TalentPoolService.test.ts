import { describe, it, expect } from "vitest";
import { MockFactory } from "../../helpers/utils/MockFactory";
import {
  fillVacanciesForNPC,
  materializeCandidateToRikishi,
  finalizeSignedCandidates,
} from "@/engine/systems/generation/TalentPoolService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import type { CandidateAvailabilityState, TalentPoolWorldState } from "@/engine/types/talent";
import type { Id } from "@/engine/types/common";

// ── Talent Pool setup helper ───────────────────────────────────────────────

function makeTalentPool(
  candidateId: string,
  availabilityState: CandidateAvailabilityState = "available"
): TalentPoolWorldState {
  const candidate = MockFactory.createCandidate(candidateId as Id, {
    candidateId: candidateId as Id,
    availabilityState,
    competingSuitors:
      availabilityState === "signed"
        ? [
            {
              heyaId: "npc-heya" as Id,
              offerType: "standard",
              interestBand: "high",
              deadlineWeek: 1,
            },
          ]
        : [],
  });

  const pool = MockFactory.createTalentPool({
    lastYearlyRefreshYear: 2024,
    candidates: {
      [candidateId]: candidate,
    },
  });

  pool.pools.high_school.candidatesVisible = [candidateId];
  return pool;
}

// ── fillVacanciesForNPC ────────────────────────────────────────────────────

describe("fillVacanciesForNPC", () => {
  it("returns an empty impact when no talent pool exists", () => {
    const world = MockFactory.createWorld();
    const impact = fillVacanciesForNPC(world, { "npc-heya": 1 });
    expect(impact.collections?.rikishiToAdd?.length ?? 0).toBe(0);
  });

  it("returns an empty impact when no candidates are visible", () => {
    const heyaId = "npc-heya" as Id;
    const world = MockFactory.createWorld({
      heyas: new Map([[heyaId, MockFactory.createHeya(heyaId)]]),
      talentPool: makeTalentPool("cand-1"),
    });
    // Empty all visible slots
    if (world.talentPool) {
      world.talentPool.pools.high_school.candidatesVisible = [];
    }

    const impact = fillVacanciesForNPC(world, { [heyaId]: 1 });
    expect(impact.collections?.rikishiToAdd?.length ?? 0).toBe(0);
  });

  it("produces an impact that materializes a candidate into a new rikishi for an NPC heya", () => {
    const heyaId = "npc-heya" as Id;
    const heya = MockFactory.createHeya(heyaId, { rikishiIds: [] });
    const world = MockFactory.createWorld({
      heyas: new Map([[heyaId, heya]]),
      rikishi: new Map(),
      seed: "talent-test-seed",
      talentPool: makeTalentPool("cand-1"),
    });

    if (world.talentPool) {
      world.talentPool.pools.university.candidatesVisible = ["cand-1"];
      world.talentPool.pools.foreign.candidatesVisible = ["cand-1"];
    }

    const impact = fillVacanciesForNPC(world, { [heyaId]: 3 });

    // Impact should describe a new rikishi addition
    expect(impact.collections?.rikishiToAdd?.length ?? 0).toBeGreaterThan(0);

    const nextWorld = resolveImpacts(world, [impact]);
    expect(nextWorld.rikishi.size).toBeGreaterThan(0);
  });

  it("adds the new rikishi to the NPC heya's roster in the impact", () => {
    const heyaId = "npc-heya" as Id;
    const heya = MockFactory.createHeya(heyaId, { rikishiIds: [] });
    const world = MockFactory.createWorld({
      heyas: new Map([[heyaId, heya]]),
      rikishi: new Map(),
      seed: "talent-test-seed",
      talentPool: makeTalentPool("cand-1"),
    });

    if (world.talentPool) {
      world.talentPool.pools.university.candidatesVisible = ["cand-1"];
      world.talentPool.pools.foreign.candidatesVisible = ["cand-1"];
    }

    const impact = fillVacanciesForNPC(world, { [heyaId]: 3 });

    // Impact should update the heya's roster
    const heyaUpdate = impact.entities?.heyaUpdates?.get(heyaId);
    expect(heyaUpdate?.rikishiIds?.length).toBeGreaterThan(0);

    const nextWorld = resolveImpacts(world, [impact]);
    const updatedHeya = nextWorld.heyas.get(heyaId);
    expect(updatedHeya?.rikishiIds.length).toBeGreaterThan(0);
  });
});

// ── materializeCandidateToRikishi ─────────────────────────────────────────

describe("materializeCandidateToRikishi", () => {
  it("returns empty impact when candidate does not exist", () => {
    const world = MockFactory.createWorld({
      talentPool: makeTalentPool("cand-1"),
    });
    const impact = materializeCandidateToRikishi(world, "non-existent-id" as Id, "some-heya" as Id);
    expect(impact.entities?.rikishiUpdates?.size ?? 0).toBe(0);
  });

  it("produces a rikishi update for the new recruit in the impact", () => {
    const heyaId = "test-heya" as Id;
    const heya = MockFactory.createHeya(heyaId, { rikishiIds: [] });
    const world = MockFactory.createWorld({
      heyas: new Map([[heyaId, heya]]),
      seed: "materialize-seed",
      talentPool: makeTalentPool("cand-1"),
    });

    const impact = materializeCandidateToRikishi(world, "cand-1" as Id, heyaId);

    expect(impact.collections?.rikishiToAdd).toBeDefined();
    expect(impact.collections?.rikishiToAdd?.length).toBe(1);
  });

  it("links the new rikishi to the correct heya in the impact", () => {
    const heyaId = "test-heya" as Id;
    const heya = MockFactory.createHeya(heyaId, { rikishiIds: [] });
    const world = MockFactory.createWorld({
      heyas: new Map([[heyaId, heya]]),
      seed: "materialize-seed",
      talentPool: makeTalentPool("cand-1"),
    });

    const impact = materializeCandidateToRikishi(world, "cand-1" as Id, heyaId);

    // Check heya update includes the new rikishi id
    const heyaUpdate = impact.entities?.heyaUpdates?.get(heyaId);
    expect(heyaUpdate?.rikishiIds).toBeDefined();
    expect(heyaUpdate?.rikishiIds?.length).toBeGreaterThan(0);
  });

  it("describes removal of the candidate from talentPool in the impact", () => {
    const heyaId = "test-heya" as Id;
    const heya = MockFactory.createHeya(heyaId, { rikishiIds: [] });
    const world = MockFactory.createWorld({
      heyas: new Map([[heyaId, heya]]),
      seed: "materialize-seed",
      talentPool: makeTalentPool("cand-1"),
    });

    const impact = materializeCandidateToRikishi(world, "cand-1" as Id, heyaId);

    // Verify talentPool update
    const tpUpdate = impact.worldFields?.talentPool;
    expect(tpUpdate).toBeDefined();
    expect(tpUpdate?.candidates["cand-1"]).toBeUndefined();

    // Verify after resolution
    const nextWorld = resolveImpacts(world, [impact]);
    expect(nextWorld.talentPool?.candidates["cand-1"]).toBeUndefined();
  });
});

// ── finalizeSignedCandidates ───────────────────────────────────────────────

describe("finalizeSignedCandidates", () => {
  it("produces an impact that converts all signed candidates into rikishi", () => {
    const heyaId = "test-heya" as Id;
    const heya = MockFactory.createHeya(heyaId, { rikishiIds: [] });
    const world = MockFactory.createWorld({
      heyas: new Map([[heyaId, heya]]),
      rikishi: new Map(),
      seed: "finalize-seed",
    });
    // Candidate already signed
    const talentPool = makeTalentPool("cand-signed", "signed");
    talentPool.candidates["cand-signed"].competingSuitors = [
      { heyaId, offerType: "standard" as const, interestBand: "high" as const, deadlineWeek: 1 },
    ];
    world.talentPool = talentPool;

    const impact = finalizeSignedCandidates(world);

    // Verify rikishi creation in impact
    expect(impact.collections?.rikishiToAdd?.length ?? 0).toBeGreaterThan(0);

    const nextWorld = resolveImpacts(world, [impact]);
    expect(nextWorld.rikishi.size).toBeGreaterThan(0);
    const updatedHeya = nextWorld.heyas.get(heyaId);
    expect(updatedHeya?.rikishiIds.length).toBeGreaterThan(0);
  });

  it("returns empty impact when no candidates are signed", () => {
    const world = MockFactory.createWorld({
      talentPool: makeTalentPool("cand-1", "available"),
    });

    const impact = finalizeSignedCandidates(world);
    expect(impact.collections?.rikishiToAdd?.length ?? 0).toBe(0);
  });
});
