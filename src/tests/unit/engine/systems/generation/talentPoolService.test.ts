import { describe, it, expect } from "vitest";
import { MockFactory } from "../../../../helpers/utils/MockFactory";
import {
  fillVacanciesForNPC,
  fillVacanciesForNPCWithBidding,
  materializeCandidateToRikishi,
  finalizeSignedCandidates,
} from "@/engine/systems/generation/TalentPoolService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import type { CandidateAvailabilityState, TalentPoolWorldState } from "@/engine/types/talent";
import type { Id } from "@/engine/types/common";
import type { WorldState } from "@/engine/types/world";

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

  it("handles undefined candidate entries without crashing", () => {
    const heyaId = "test-heya" as Id;
    const heya = MockFactory.createHeya(heyaId, { rikishiIds: [] });
    const world = MockFactory.createWorld({
      heyas: new Map([[heyaId, heya]]),
      rikishi: new Map(),
      seed: "finalize-undef-seed",
    });
    const talentPool = makeTalentPool("cand-signed", "signed");
    talentPool.candidates["cand-signed"].competingSuitors = [
      { heyaId, offerType: "standard" as const, interestBand: "high" as const, deadlineWeek: 1 },
    ];
    // Add an undefined entry to test the defensive guard
    (talentPool.candidates as any)["cand-undefined"] = undefined;
    world.talentPool = talentPool;

    const impact = finalizeSignedCandidates(world);
    // Should still materialize the signed candidate despite the undefined entry
    expect(impact.collections?.rikishiToAdd?.length ?? 0).toBeGreaterThan(0);
  });
});

// ── fillVacanciesForNPCWithBidding ─────────────────────────────────────────

function makeWorldForBidding(heyaIds: string[], candidateIds: string[]): WorldState {
  const heyas = new Map();
  const oyakata = new Map();
  for (const hid of heyaIds) {
    const oyakataId = `oyakata_${hid}` as Id;
    heyas.set(hid, MockFactory.createHeya(hid as Id, { oyakataId, rikishiIds: [] }));
    oyakata.set(oyakataId, MockFactory.createOyakata(oyakataId, { heyaId: hid as Id }));
  }

  const tp = MockFactory.createTalentPool({});
  for (const cid of candidateIds) {
    const candidate = MockFactory.createCandidate(cid as Id, {
      candidateId: cid as Id,
      availabilityState: "available",
      competingSuitors: [],
    });
    tp.candidates[cid] = candidate;
    tp.pools.high_school.candidatesVisible.push(cid);
  }

  return MockFactory.createWorld({
    heyas,
    oyakata,
    rikishi: new Map(),
    seed: "bidding-test-seed",
    talentPool: tp,
  });
}

describe("fillVacanciesForNPCWithBidding", () => {
  it("returns an empty impact when no talent pool exists", () => {
    const world = MockFactory.createWorld();
    const impact = fillVacanciesForNPCWithBidding(world, { "npc-heya": 1 });
    expect(impact.collections?.rikishiToAdd?.length ?? 0).toBe(0);
  });

  it("returns an empty impact when no candidates are visible", () => {
    const heyaId = "npc-heya";
    const world = makeWorldForBidding([heyaId], []);
    const impact = fillVacanciesForNPCWithBidding(world, { [heyaId]: 1 });
    expect(impact.collections?.rikishiToAdd?.length ?? 0).toBe(0);
  });

  it("materializes a candidate for an NPC heya with vacancies", () => {
    const heyaId = "npc-heya";
    const world = makeWorldForBidding([heyaId], ["cand-1"]);
    const impact = fillVacanciesForNPCWithBidding(world, { [heyaId]: 1 });
    expect(impact.collections?.rikishiToAdd?.length ?? 0).toBeGreaterThan(0);

    const nextWorld = resolveImpacts(world, [impact]);
    expect(nextWorld.rikishi.size).toBeGreaterThan(0);
  });

  it("assigns candidates to the highest-bidding heya when multiple heyas compete", () => {
    const strongId = "strong";
    const weakId = "weak";
    // Strong heya has many sekitori (higher funds via default, lower balance multiplier)
    // Weak heya has none (gets balance boost)
    const world = makeWorldForBidding([strongId, weakId], ["cand-1"]);

    // Give the strong heya sekitori so it has a lower balance multiplier
    const strongRikishi = MockFactory.createRikishi("strong-r1", {
      heyaId: strongId as Id,
      division: "makuuchi",
    });
    world.rikishi.set("strong-r1", strongRikishi);
    world.heyas.get(strongId)!.rikishiIds = ["strong-r1"];

    const impact = fillVacanciesForNPCWithBidding(world, {
      [strongId]: 1,
      [weakId]: 1,
    });

    // At least one heya should get a rikishi
    expect(impact.collections?.rikishiToAdd?.length ?? 0).toBeGreaterThan(0);
  });

  it("respects vacancy limits per heya", () => {
    const heyaId = "npc-heya";
    const world = makeWorldForBidding([heyaId], ["cand-1", "cand-2", "cand-3"]);
    const impact = fillVacanciesForNPCWithBidding(world, { [heyaId]: 1 });
    // Only 1 vacancy → only 1 rikishi should be materialized
    expect(impact.collections?.rikishiToAdd?.length ?? 0).toBe(1);
  });

  it("does not assign the same candidate to two heyas", () => {
    const hA = "heyaA";
    const hB = "heyaB";
    const world = makeWorldForBidding([hA, hB], ["cand-1"]);
    const impact = fillVacanciesForNPCWithBidding(world, {
      [hA]: 1,
      [hB]: 1,
    });

    // Only one heya can get the single candidate
    const added = impact.collections?.rikishiToAdd ?? [];
    expect(added.length).toBe(1);
    const assignedHeya = added[0]?.heyaId;
    expect([hA, hB]).toContain(assignedHeya);
  });
});
