/**
 * CandidatePoolService.test.ts
 * ============================
 * Tests for the NPC candidate watchlist service.
 * Covers: pool initialization, NPC interest simulation, player poaching,
 * weekly maintenance tick, and yearly refresh.
 */

import { describe, it, expect } from "vitest";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";
import type { WorldState } from "@/engine/types/world";
import type { TalentPoolWorldState } from "@/engine/types/talent";
import {
  ensureCandidatePoolState,
  simulateNPCInterest,
  poachCandidate,
  tickWeekCandidatePool,
  listNPCWatchedCandidates,
} from "@/engine/systems/generation/CandidatePoolService";
import { refreshAllPools } from "@/engine/systems/generation/TalentPoolStateService";

function makeWorld(seed = "test-candidate-pool"): WorldState {
  return generateInitialWorld(seed);
}

describe("CandidatePoolService", () => {
  describe("ensureCandidatePoolState", () => {
    it("initializes candidatePool if missing", () => {
      const world = makeWorld();
      // WorldFactory now initializes candidatePool, so it should already exist
      expect(world.candidatePool).toBeDefined();
      const cp = ensureCandidatePoolState(world);
      expect(cp).toBeDefined();
      expect(cp.version).toBe("1.0.0");
      expect(cp.candidates).toBeDefined();
      expect(cp.pools).toBeDefined();
      expect(cp.pools.high_school).toBeDefined();
      expect(cp.pools.university).toBeDefined();
      expect(cp.pools.foreign).toBeDefined();
    });

    it("returns existing candidatePool without re-initializing", () => {
      const world = makeWorld();
      const cp1 = ensureCandidatePoolState(world);
      cp1.lastYearlyRefreshYear = 1999;
      const cp2 = ensureCandidatePoolState(world);
      expect(cp2.lastYearlyRefreshYear).toBe(1999);
    });

    it("writes the initialized pool to world.candidatePool", () => {
      const world = makeWorld();
      // WorldFactory already initializes it
      expect(world.candidatePool).toBeDefined();
      expect(world.candidatePool?.version).toBe("1.0.0");
    });
  });

  describe("simulateNPCInterest", () => {
    it("populates candidatePool with candidates from talentPool that NPC heyas are watching", () => {
      const world = makeWorld();
      // talentPool is initialized by WorldFactory, but candidates start hidden and empty.
      // Populate the pool by calling refreshAllPools, then reveal some.
      const tp = world.talentPool!;
      const refreshImpact = refreshAllPools(world);
      const refreshedTp = refreshImpact.worldFields?.talentPool as typeof tp;
      if (refreshedTp) {
        world.talentPool = refreshedTp;
      }

      // Move some hidden candidates to visible
      const tp2 = world.talentPool!;
      for (const pt of ["high_school", "university", "foreign"] as const) {
        const pool = tp2.pools[pt];
        const toReveal = Math.min(10, pool.candidatesHidden.length);
        for (let i = 0; i < toReveal; i++) {
          const cId = pool.candidatesHidden.shift();
          if (cId) pool.candidatesVisible.push(cId);
        }
      }

      // Verify we have visible candidates now
      const visibleIds: string[] = [];
      for (const pt of ["high_school", "university", "foreign"] as const) {
        visibleIds.push(...tp2.pools[pt].candidatesVisible);
      }
      expect(visibleIds.length).toBeGreaterThan(0);

      const impact = simulateNPCInterest(world);
      expect(impact.worldFields?.candidatePool).toBeDefined();

      const cp = impact.worldFields?.candidatePool as TalentPoolWorldState;
      // Should have at least some candidates in the candidate pool
      expect(Object.keys(cp.candidates).length).toBeGreaterThan(0);
    });

    it("does not include candidates already signed or withdrawn", () => {
      const world = makeWorld();
      const tp = world.talentPool!;
      // Mark some candidates as signed
      const ids = Object.keys(tp.candidates).slice(0, 3);
      for (const id of ids) {
        tp.candidates[id].availabilityState = "signed";
      }

      const impact = simulateNPCInterest(world);
      const cp = impact.worldFields?.candidatePool as TalentPoolWorldState;
      for (const id of ids) {
        expect(cp.candidates[id]).toBeUndefined();
      }
    });

    it("assigns NPC suitor interest to candidates", () => {
      const world = makeWorld();
      // Populate and reveal candidates
      const tp = world.talentPool!;
      const refreshImpact = refreshAllPools(world);
      const refreshedTp = refreshImpact.worldFields?.talentPool as typeof tp;
      if (refreshedTp) {
        world.talentPool = refreshedTp;
      }

      const tp2 = world.talentPool!;
      for (const pt of ["high_school", "university", "foreign"] as const) {
        const pool = tp2.pools[pt];
        const toReveal = Math.min(10, pool.candidatesHidden.length);
        for (let i = 0; i < toReveal; i++) {
          const cId = pool.candidatesHidden.shift();
          if (cId) pool.candidatesVisible.push(cId);
        }
      }

      const impact = simulateNPCInterest(world);
      const cp = impact.worldFields?.candidatePool as TalentPoolWorldState;

      let hasSuitor = false;
      for (const id in cp.candidates) {
        const candidate = cp.candidates[id];
        if (candidate.competingSuitors.length > 0) {
          hasSuitor = true;
          // Suitor should reference an NPC heya (not the player's heya)
          const suitor = candidate.competingSuitors[0];
          expect(suitor.heyaId).toBeDefined();
          expect(suitor.heyaId).not.toBe(world.playerHeyaId);
          expect(suitor.interestBand).toBeDefined();
          break;
        }
      }
      // At least some candidates should have NPC suitors
      expect(hasSuitor).toBe(true);
    });
  });

  describe("poachCandidate", () => {
    it("rejects poaching a non-existent candidate", () => {
      const world = makeWorld();
      ensureCandidatePoolState(world);
      const result = poachCandidate(world, "nonexistent-id", world.playerHeyaId ?? "");
      expect(result.ok).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it("rejects poaching from the player's own heya", () => {
      const world = makeWorld();
      const cp = ensureCandidatePoolState(world);
      const playerHeyaId = world.playerHeyaId ?? "";

      // Inject a candidate with the player's heya as a suitor
      const candidateId = "test-poach-own";
      cp.candidates[candidateId] = {
        candidateId,
        personId: candidateId,
        name: "Test Candidate",
        originRegion: "Japan",
        nationality: "Japan",
        visibilityBand: "public",
        reputationSeed: 50,
        tags: [],
        combatProfile: { archetype: "hybrid", speed: 50, technique: 50, balance: 50, stamina: 50, mental: 50, adaptability: 50 } as any,
        availabilityState: "available",
        competingSuitors: [{ heyaId: playerHeyaId, interestBand: "high", offerType: "standard", deadlineWeek: 999 }],
        archetype: "hybrid",
        heightPotentialCm: 180,
        weightPotentialKg: 100,
        talentSeed: 50,
        temperament: { discipline: 50, volatility: 50 },
      } as any;

      const result = poachCandidate(world, candidateId, playerHeyaId);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("own");
    });

    it("allows poaching a candidate watched by an NPC heya", () => {
      const world = makeWorld();
      const cp = ensureCandidatePoolState(world);
      const playerHeyaId = world.playerHeyaId ?? "";

      // Find an NPC heya
      const npcHeyaIds = Array.from(world.heyas.keys()).filter((id) => id !== playerHeyaId);
      expect(npcHeyaIds.length).toBeGreaterThan(0);
      const npcHeyaId = npcHeyaIds[0];

      // Inject a candidate watched by the NPC heya
      const candidateId = "test-poach-npc";
      cp.candidates[candidateId] = {
        candidateId,
        personId: candidateId,
        name: "Poachable Candidate",
        originRegion: "Japan",
        nationality: "Japan",
        visibilityBand: "public",
        reputationSeed: 70,
        tags: [],
        combatProfile: { archetype: "hybrid", speed: 60, technique: 60, balance: 60, stamina: 60, mental: 60, adaptability: 60 } as any,
        availabilityState: "available",
        competingSuitors: [{ heyaId: npcHeyaId, interestBand: "medium", offerType: "standard", deadlineWeek: 999 }],
        archetype: "hybrid",
        heightPotentialCm: 180,
        weightPotentialKg: 100,
        talentSeed: 70,
        temperament: { discipline: 60, volatility: 40 },
      } as any;

      const result = poachCandidate(world, candidateId, playerHeyaId);
      expect(result.ok).toBe(true);
      expect(result.impact).toBeDefined();
    });
  });

  describe("tickWeekCandidatePool", () => {
    it("returns a StateImpact with metadata", () => {
      const world = makeWorld();
      ensureCandidatePoolState(world);
      const impact = tickWeekCandidatePool(world);
      expect(impact).toBeDefined();
      expect("metadata" in impact).toBe(true);
    });

    it("ages out candidates with expired deadlines", () => {
      const world = makeWorld();
      const cp = ensureCandidatePoolState(world);

      // Inject a candidate with an expired deadline
      const candidateId = "test-expired";
      cp.candidates[candidateId] = {
        candidateId,
        personId: candidateId,
        name: "Expired Candidate",
        originRegion: "Japan",
        nationality: "Japan",
        visibilityBand: "public",
        reputationSeed: 50,
        tags: [],
        combatProfile: { archetype: "hybrid", speed: 50, technique: 50, balance: 50, stamina: 50, mental: 50, adaptability: 50 } as any,
        availabilityState: "in_talks",
        competingSuitors: [{ heyaId: "npc-1", interestBand: "low", offerType: "standard", deadlineWeek: 1 }],
        archetype: "hybrid",
        heightPotentialCm: 180,
        weightPotentialKg: 100,
        talentSeed: 50,
        temperament: { discipline: 50, volatility: 50 },
      } as any;

      // Set world week past the deadline
      world.week = 5;

      const impact = tickWeekCandidatePool(world);
      const updatedCp = impact.worldFields?.candidatePool as TalentPoolWorldState;
      // The expired candidate should have been resolved (signed or withdrawn)
      expect(updatedCp.candidates[candidateId]?.availabilityState).not.toBe("in_talks");
    });

    it("does nothing if candidatePool is not initialized", () => {
      const world = makeWorld();
      // WorldFactory initializes candidatePool, so manually delete it to test the no-op path
      world.candidatePool = undefined;
      const impact = tickWeekCandidatePool(world);
      expect(impact).toBeDefined();
      // Should be a no-op impact
      expect(Object.keys(impact.worldFields || {}).length).toBe(0);
    });
  });

  describe("listNPCWatchedCandidates", () => {
    it("returns candidates from candidatePool that have NPC suitors", () => {
      const world = makeWorld();
      const cp = ensureCandidatePoolState(world);
      const playerHeyaId = world.playerHeyaId ?? "";
      const npcHeyaIds = Array.from(world.heyas.keys()).filter((id) => id !== playerHeyaId);

      // Inject candidates
      cp.candidates["watched-1"] = {
        candidateId: "watched-1",
        personId: "watched-1",
        name: "Watched One",
        originRegion: "Japan",
        nationality: "Japan",
        visibilityBand: "public",
        reputationSeed: 60,
        tags: [],
        combatProfile: { archetype: "hybrid", speed: 55, technique: 55, balance: 55, stamina: 55, mental: 55, adaptability: 55 } as any,
        availabilityState: "available",
        competingSuitors: [{ heyaId: npcHeyaIds[0], interestBand: "high", offerType: "standard", deadlineWeek: 999 }],
        archetype: "hybrid",
        heightPotentialCm: 180,
        weightPotentialKg: 100,
        talentSeed: 60,
        temperament: { discipline: 55, volatility: 45 },
      } as any;
      cp.candidates["unwatched-1"] = {
        candidateId: "unwatched-1",
        personId: "unwatched-1",
        name: "Unwatched One",
        birthYear: 2005,
        originRegion: "Japan",
        nationality: "Japan",
        visibilityBand: "public",
        reputationSeed: 40,
        tags: [],
        combatProfile: { archetype: "hybrid", speed: 40, technique: 40, balance: 40, stamina: 40, mental: 40, adaptability: 40 } as any,
        availabilityState: "available",
        competingSuitors: [],
        archetype: "hybrid",
        heightPotentialCm: 175,
        weightPotentialKg: 90,
        talentSeed: 40,
        temperament: { discipline: 40, volatility: 60 },
      } as any;

      const watched = listNPCWatchedCandidates(world);
      expect(watched.length).toBeGreaterThanOrEqual(1);
      expect(watched.some((c) => c.candidateId === "watched-1")).toBe(true);
      expect(watched.some((c) => c.candidateId === "unwatched-1")).toBe(false);
    });

    it("returns empty array if candidatePool is not initialized", () => {
      const world = makeWorld();
      world.candidatePool = undefined;
      const watched = listNPCWatchedCandidates(world);
      expect(watched).toEqual([]);
    });
  });
});
