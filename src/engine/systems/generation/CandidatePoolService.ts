/**
 * CandidatePoolService.ts
 * =======================
 * NPC Candidate Watchlist Service.
 *
 * The candidatePool is a secondary talent pool that tracks candidates
 * NPC oyakata have identified as interesting but not yet committed to
 * recruiting. The player can scout these candidates and attempt to
 * poach them before the NPC heya signs them.
 *
 * Key operations:
 *   ensureCandidatePoolState — initialize the pool if missing
 *   simulateNPCInterest      — populate with candidates NPC heyas are watching
 *   poachCandidate           — player attempts to steal an NPC-watched candidate
 *   tickWeekCandidatePool    — weekly maintenance (deadline resolution, NPC interest shifts)
 *   listNPCWatchedCandidates — read operator for UI
 */

import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import type { WorldState } from "../../types/world";
import { DEFAULT_START_YEAR } from "../../../constants/engine/calendar";
import type { Id } from "../../types/common";
import type {
  TalentPoolWorldState,
  TalentCandidate,
  SuitorInterestBand,
  SuitorOfferType,
} from "../../types/talent";
import { RNGRegistry } from "../../core/RNGRegistry";

// ── Pool Initialization ───────────────────────────────────────────────────

export function ensureCandidatePoolState(world: WorldState): TalentPoolWorldState {
  if (!world.candidatePool) {
    Object.defineProperty(world, "candidatePool", { value: {
      // @world-builder
      version: "1.0.0",
      lastYearlyRefreshYear: world.year ?? DEFAULT_START_YEAR,
      candidates: {},
      pools: {
        high_school: {
          poolId: "high_school",
          poolType: "high_school",
          refreshCadence: "yearly",
          populationCap: 50,
          hiddenReserveCap: 50,
          candidatesVisible: [],
          candidatesHidden: [],
          lastRefreshWeek: world.week ?? 0,
          scarcityBand: "normal",
          qualityBand: "normal",
        },
        university: {
          poolId: "university",
          poolType: "university",
          refreshCadence: "yearly",
          populationCap: 40,
          hiddenReserveCap: 40,
          candidatesVisible: [],
          candidatesHidden: [],
          lastRefreshWeek: world.week ?? 0,
          scarcityBand: "normal",
          qualityBand: "normal",
        },
        foreign: {
          poolId: "foreign",
          poolType: "foreign",
          refreshCadence: "yearly",
          populationCap: 30,
          hiddenReserveCap: 30,
          candidatesVisible: [],
          candidatesHidden: [],
          lastRefreshWeek: world.week ?? 0,
          scarcityBand: "normal",
          qualityBand: "normal",
        },
      },
    }, enumerable: true, configurable: true, writable: true });
  }
  return world.candidatePool;
}

// ── NPC Interest Simulation ───────────────────────────────────────────────

/**
 * Scans the main talentPool for available candidates that NPC heyas
 * would be interested in, and populates the candidatePool with copies
 * of those candidates plus NPC suitor interest.
 *
 * NPC heyas with higher reputation are more likely to watch higher-tier
 * candidates. Interest is deterministic via RNG.
 */
export function simulateNPCInterest(world: WorldState): StateImpact {
  const builder = createImpactBuilder("simulateNPCInterest");
  const cp = ensureCandidatePoolState(world);
  const tp = world.talentPool;
  if (!tp) return builder.build();

  const rng = RNGRegistry.getSystemRNG(world, "scouting", `npc_interest_${world.week}`);
  const playerHeyaId = world.playerHeyaId;

  // Collect NPC heya IDs sorted by reputation (highest first)
  const npcHeyas: { id: Id; reputation: number }[] = [];
  for (const [id, heya] of world.heyas) {
    if (id !== playerHeyaId) {
      npcHeyas.push({ id, reputation: heya.reputation ?? 50 });
    }
  }
  const sortedNpcHeyas = [...npcHeyas].sort((a, b) => b.reputation - a.reputation);

  if (sortedNpcHeyas.length === 0) return builder.build();

  const nextCandidates: Record<Id, TalentCandidate> = {};
  const nextPools = { ...cp.pools };

  // Scan visible candidates in the main talent pool
  for (const pt of ["high_school", "university", "foreign"] as const) {
    const pool = tp.pools[pt];
    if (!pool) continue;

    const watchedIds: Id[] = [];
    for (const cId of pool.candidatesVisible) {
      const candidate = tp.candidates[cId];
      if (!candidate) continue;
      if (candidate.availabilityState !== "available") continue;

      // NPC interest probability: higher reputation heyas watch better candidates
      // Each NPC heya has a chance to watch each candidate
      const suitors: TalentCandidate["competingSuitors"] = [];
      for (const npc of sortedNpcHeyas) {
        // Probability: base 15% + reputation factor + talent factor
        const talentFactor = (candidate.talentSeed ?? 50) / 200; // 0–0.5
        const repFactor = npc.reputation / 200; // 0–0.5
        const probability = 0.15 + talentFactor + repFactor;
        if (rng.next() < probability) {
          const interestBand: SuitorInterestBand =
            candidate.talentSeed > 80
              ? "all_in"
              : candidate.talentSeed > 65
                ? "high"
                : candidate.talentSeed > 45
                  ? "medium"
                  : "low";
          const offerType: SuitorOfferType =
            interestBand === "all_in"
              ? "aggressive"
              : interestBand === "high"
                ? "prestige_pitch"
                : "standard";
          suitors.push({
            heyaId: npc.id,
            interestBand,
            offerType,
            deadlineWeek: (world.week ?? 0) + rng.int(2, 8),
          });
        }
      }

      if (suitors.length > 0) {
        // Copy candidate into candidate pool with NPC suitors
        nextCandidates[cId] = {
          ...candidate,
          competingSuitors: suitors,
        };
        watchedIds.push(cId);
      }
    }

    // Update pool visible list
    const cpPool = { ...nextPools[pt] };
    cpPool.candidatesVisible = watchedIds;
    nextPools[pt] = cpPool;
  }

  builder.updateWorldField("candidatePool", {
    ...cp,
    candidates: nextCandidates,
    pools: nextPools,
  });

  return builder.build();
}

// ── Player Poaching ───────────────────────────────────────────────────────

/**
 * Player attempts to poach a candidate from the candidate pool
 * (i.e., make a competing offer before the NPC heya signs them).
 *
 * Validation:
 *   - Candidate must exist in the candidate pool
 *   - Player cannot poach from their own heya
 *   - Candidate must be available or in_talks
 *
 * On success, registers the player as a competing suitor.
 */
export function poachCandidate(
  world: WorldState,
  candidateId: Id,
  heyaId: Id
): { ok: boolean; reason?: string; impact?: StateImpact } {
  const builder = createImpactBuilder("poachCandidate");
  const cp = world.candidatePool;
  if (!cp) return { ok: false, reason: "Candidate pool not initialized" };

  const candidate = cp.candidates[candidateId];
  if (!candidate) return { ok: false, reason: "Candidate not found in watchlist" };

  // Check if player is trying to poach from their own heya
  const existingSuitor = candidate.competingSuitors.find((s) => s.heyaId === heyaId);
  if (existingSuitor) {
    return { ok: false, reason: "Cannot poach from your own heya" };
  }

  // Check availability
  if (candidate.availabilityState !== "available" && candidate.availabilityState !== "in_talks") {
    return { ok: false, reason: "Candidate is no longer available" };
  }

  // Register player as a competing suitor with "aggressive" interest
  const nextCandidates = { ...cp.candidates };
  nextCandidates[candidateId] = {
    ...candidate,
    availabilityState: "in_talks",
    competingSuitors: [
      ...candidate.competingSuitors,
      {
        heyaId,
        interestBand: "all_in",
        offerType: "aggressive",
        deadlineWeek: (world.week ?? 0) + 4,
      },
    ],
  };

  builder.updateWorldField("candidatePool", {
    ...cp,
    candidates: nextCandidates,
  });

  return { ok: true, impact: builder.build() };
}

// ── Weekly Maintenance Tick ───────────────────────────────────────────────

/**
 * Weekly maintenance for the candidate pool:
 * 1. Resolve expired suitor deadlines (candidate signs with highest bidder or withdraws)
 * 2. Shift NPC interest (some candidates gain/lose suitors)
 * 3. Remove candidates no longer available in the main talent pool
 */
export function tickWeekCandidatePool(world: WorldState): StateImpact {
  const builder = createImpactBuilder("tickWeekCandidatePool");
  if (!world.candidatePool) return builder.build();

  const cp = world.candidatePool;
  const currentWeek = world.week ?? 0;
  const rng = RNGRegistry.getSystemRNG(world, "scouting", `cp_tick_${currentWeek}`);

  let nextCandidates: Record<Id, TalentCandidate> = { ...cp.candidates };

  // 1. Resolve expired deadlines
  for (const id in nextCandidates) {
    if (!Object.prototype.hasOwnProperty.call(nextCandidates, id)) continue;
    const candidate = nextCandidates[id];
    if (!candidate) continue;
    if (candidate.availabilityState !== "in_talks") continue;

    const hasExpiredDeadline = candidate.competingSuitors.some(
      (s) => currentWeek >= s.deadlineWeek
    );
    if (!hasExpiredDeadline) continue;

    // Resolve: pick the suitor with the highest interest band
    const interestOrder: Record<SuitorInterestBand, number> = {
      all_in: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    let bestSuitor = candidate.competingSuitors[0];
    for (const suitor of candidate.competingSuitors) {
      if (interestOrder[suitor.interestBand] > interestOrder[bestSuitor.interestBand]) {
        bestSuitor = suitor;
      }
    }

    // Mark as signed by the winning suitor
    nextCandidates[id] = {
      ...candidate,
      availabilityState: "signed",
      competingSuitors: [bestSuitor],
    };
  }

  // 2. Remove candidates that are no longer available in the main talent pool
  //    (they may have been signed via the regular recruitment pipeline)
  if (world.talentPool) {
    const tp = world.talentPool;
    const removeSet = new Set<Id>();
    for (const id in nextCandidates) {
      if (!Object.prototype.hasOwnProperty.call(nextCandidates, id)) continue;
      const mainCandidate = tp.candidates[id];
      if (
        !mainCandidate ||
        mainCandidate.availabilityState === "signed" ||
        mainCandidate.availabilityState === "withdrawn"
      ) {
        removeSet.add(id);
      }
    }
    if (removeSet.size > 0) {
      const filtered: Record<Id, TalentCandidate> = {};
      for (const id in nextCandidates) {
        if (Object.prototype.hasOwnProperty.call(nextCandidates, id) && !removeSet.has(id)) {
          filtered[id] = nextCandidates[id];
        }
      }
      nextCandidates = filtered;
    }
  }

  // 3. NPC interest shifts: randomly adjust interest bands for remaining candidates
  for (const id in nextCandidates) {
    if (!Object.prototype.hasOwnProperty.call(nextCandidates, id)) continue;
    const candidate = nextCandidates[id];
    if (!candidate) continue;
    if (candidate.availabilityState !== "available") continue;

    // Small chance for an NPC heya to escalate interest
    if (rng.bool(0.1) && candidate.competingSuitors.length > 0) {
      const suitors = [...candidate.competingSuitors];
      const idx = rng.int(0, suitors.length - 1);
      const escalation: Record<SuitorInterestBand, SuitorInterestBand> = {
        low: "medium",
        medium: "high",
        high: "all_in",
        all_in: "all_in",
      };
      suitors[idx] = {
        ...suitors[idx],
        interestBand: escalation[suitors[idx].interestBand],
      };
      nextCandidates[id] = { ...candidate, competingSuitors: suitors };
    }
  }

  builder.updateWorldField("candidatePool", {
    ...cp,
    candidates: nextCandidates,
  });

  return builder.build();
}

// ── Read Operators ────────────────────────────────────────────────────────

/**
 * Lists all candidates in the candidate pool that have at least one NPC suitor.
 * Used by the UI to show the player which candidates NPC stables are watching.
 */
export function listNPCWatchedCandidates(world: WorldState): TalentCandidate[] {
  const cp = world.candidatePool;
  if (!cp) return [];

  const result: TalentCandidate[] = [];
  for (const id in cp.candidates) {
    if (!Object.prototype.hasOwnProperty.call(cp.candidates, id)) continue;
    const candidate = cp.candidates[id];
    if (candidate && candidate.competingSuitors.length > 0) {
      result.push(candidate);
    }
  }
  return result;
}

/**
 * Gets the NPC heya that is most interested in a given candidate.
 * Returns undefined if no suitors or candidate not found.
 */
export function getTopSuitor(
  world: WorldState,
  candidateId: Id
): { heyaId: Id; interestBand: SuitorInterestBand } | undefined {
  const cp = world.candidatePool;
  if (!cp) return undefined;
  const candidate = cp.candidates[candidateId];
  if (!candidate || candidate.competingSuitors.length === 0) return undefined;

  const interestOrder: Record<SuitorInterestBand, number> = {
    all_in: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  let top = candidate.competingSuitors[0];
  for (const suitor of candidate.competingSuitors) {
    if (interestOrder[suitor.interestBand] > interestOrder[top.interestBand]) {
      top = suitor;
    }
  }
  return { heyaId: top.heyaId, interestBand: top.interestBand };
}
