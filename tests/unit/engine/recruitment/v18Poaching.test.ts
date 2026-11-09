/**
 * v18Poaching.test.ts
 * ====================
 * Failing-first regression pins for S7-4 — player poaching is non-functional.
 *
 * Bug A — `simulateNPCInterest` (src/engine/generation/CandidatePoolService.ts:120,168-178)
 *   rebuilds `nextCandidates` from `{}` every weekly tick, copying candidates fresh
 *   out of `world.talentPool` with newly-rolled NPC suitors. The player suitor that
 *   `poachCandidate` appends (same file :204-249) lives only on the candidatePool
 *   copy, so `phase01_week_candidate_pool` destroys it (and the "in_talks" state)
 *   before `tickWeekCandidatePool` ever gets to resolve the deadline.
 *
 * Bug B — `finalizeSignedCandidates` (src/engine/generation/TalentPoolMaterialization.ts:113-177)
 *   only iterates `world.talentPool.candidates`. A candidatePool entry that resolves
 *   `availabilityState: "signed"` to the winning suitor is never materialized: NPC
 *   "wins" mint no rikishi, player poach wins mint none either, and the signed
 *   entry lingers in the watchlist forever.
 *
 * Both pins drive the real production path: phase01_week_candidate_pool (the tick
 * entry point), poachCandidate, and finalizeSignedCandidates + resolveImpacts.
 */
import { describe, it, expect } from "vitest";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import { phase01_week_candidate_pool } from "@/engine/tick/phases/phase01_week_candidate_pool";
import { poachCandidate } from "@/engine/generation/CandidatePoolService";
import { finalizeSignedCandidates } from "@/engine/generation/TalentPoolService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import type { Id } from "@/engine/types/common";
import type { WorldState } from "@/engine/types/world";

const PLAYER = "h-player" as Id;
const NPC = "h-npc" as Id;
const CAND = "cand-1" as Id;

/**
 * World where the main talent pool holds one visible candidate that the NPC
 * heya is guaranteed to watch: interest probability is
 * 0.15 + talentSeed/200 + reputation/200 = 0.15 + 0.35 + 0.5 = 1.0
 * (talentSeed 70 → NPC interestBand "high", below the player's "all_in",
 * so the player deterministically wins any honest deadline resolution).
 */
function watchedCandidateWorld(week = 1): WorldState {
  const candidate = MockFactory.createCandidate(CAND, {
    talentSeed: 70,
    availabilityState: "available",
  });
  const talentPool = MockFactory.createTalentPool();
  talentPool.candidates[CAND] = candidate;
  talentPool.pools.high_school.candidatesVisible = [CAND];

  return MockFactory.createWorld({
    seed: "v18-poach-seed",
    week,
    playerHeyaId: PLAYER,
    heyas: new Map([
      [PLAYER, MockFactory.createHeya(PLAYER)],
      [NPC, MockFactory.createHeya(NPC, { reputation: 100 })],
    ]),
    talentPool,
    candidatePool: MockFactory.createTalentPool(),
  });
}

describe("S7-4a — player poach suitor survives the weekly candidate-pool tick", () => {
  it("keeps the player's competing suitor (and in_talks state) after phase01_week_candidate_pool", () => {
    const world = watchedCandidateWorld();

    // First weekly tick: NPC interest populates the watchlist.
    const w1 = resolveImpacts(world, [phase01_week_candidate_pool(world)]);
    expect(
      w1.candidatePool?.candidates[CAND]?.competingSuitors.length
    ).toBeGreaterThan(0);

    // Player poaches: registers an "all_in" suitor with a week+4 deadline.
    const poach = poachCandidate(w1, CAND, PLAYER);
    expect(poach.ok).toBe(true);
    const w2 = resolveImpacts(w1, [poach.impact!]);
    expect(
      w2.candidatePool?.candidates[CAND]?.competingSuitors.some((s) => s.heyaId === PLAYER)
    ).toBe(true);
    expect(w2.candidatePool?.candidates[CAND]?.availabilityState).toBe("in_talks");

    // Second weekly tick — the player's offer is still inside its 4-week window.
    const w3 = resolveImpacts(w2, [phase01_week_candidate_pool(w2)]);

    // PIN (currently RED): the player suitor must still be on the candidate.
    // simulateNPCInterest rebuilds candidates from the talent pool and wipes it.
    const candidate = w3.candidatePool?.candidates[CAND];
    expect(candidate?.availabilityState).toBe("in_talks");
    expect(candidate?.competingSuitors.some((s) => s.heyaId === PLAYER)).toBe(true);
  });

  it("resolves an expired deadline in the player's favor when the player outbids all NPC suitors", () => {
    const world = watchedCandidateWorld();
    const w1 = resolveImpacts(world, [phase01_week_candidate_pool(world)]);

    const poach = poachCandidate(w1, CAND, PLAYER);
    expect(poach.ok).toBe(true);
    const w2 = resolveImpacts(w1, [poach.impact!]);

    // Advance past the player's deadlineWeek (world.week + 4 = 5).
    const w3in = { ...w2, week: 6 };
    const w3 = resolveImpacts(w3in, [phase01_week_candidate_pool(w3in)]);

    // PIN (currently RED): player ("all_in") outranks every NPC band, so the
    // deadline resolution must sign the candidate to the player's heya.
    const signed = w3.candidatePool?.candidates[CAND];
    expect(signed?.availabilityState).toBe("signed");
    expect(signed?.competingSuitors[0]?.heyaId).toBe(PLAYER);
  });
});

describe("S7-4b — signed candidatePool entries are materialized into rikishi", () => {
  it("mints a rikishi when a watchlist candidate is resolved 'signed' to the player's heya", () => {
    const candidate = MockFactory.createCandidate(CAND, {
      availabilityState: "signed",
      competingSuitors: [
        {
          heyaId: PLAYER,
          interestBand: "all_in",
          offerType: "aggressive",
          deadlineWeek: 5,
        },
      ],
    });
    const candidatePool = MockFactory.createTalentPool();
    candidatePool.candidates[CAND] = candidate;
    candidatePool.pools.high_school.candidatesVisible = [CAND];

    const world = MockFactory.createWorld({
      seed: "v18-poach-materialize",
      week: 1,
      playerHeyaId: PLAYER,
      heyas: new Map([[PLAYER, MockFactory.createHeya(PLAYER, { rikishiIds: [] })]]),
      // The signing lives on the candidatePool (watchlist); the main talent
      // pool is empty — the only thing finalize could act on is the watchlist.
      talentPool: MockFactory.createTalentPool(),
      candidatePool,
    });

    const next = resolveImpacts(world, [finalizeSignedCandidates(world)]);

    // PIN (currently RED): finalizeSignedCandidates only scans
    // world.talentPool.candidates, so the signed watchlist entry mints nothing
    // and lingers in candidatePool forever.
    expect(next.rikishi.has(candidate.personId)).toBe(true);
    expect(next.activeRikishiIds.has(candidate.personId)).toBe(true);
    expect(next.heyas.get(PLAYER)?.rikishiIds).toContain(candidate.personId);
    // The consumed watchlist entry must not linger as a ghost.
    expect(next.candidatePool?.candidates[CAND]).toBeUndefined();
  });
});
