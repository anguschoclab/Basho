/**
 * TalentPoolRecruitment.ts — Offer management, signing resolution, and materialization.
 * Covers contract offers, suitor resolution, NPC auto-fill, and candidate→rikishi conversion.
 */

import { RNGRegistry } from "../../core/RNGRegistry";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { resolveImpacts } from "../../core/ImpactResolver";
import type { StateImpact } from "../../core/StateImpact";
import { WorldState } from "../../types/world";
import { Id } from "../../types/common";
import { Heya } from "../../types/heya";
import { Oyakata } from "../../types/oyakata";
import { TalentPoolType, TalentCandidate } from "../../types/talent";
import { convertCandidateToRikishi } from "./CandidateGenerator";
import { rngFromSeed } from "../../rng";
import { EventBus } from "../../events";
import { BardEngine } from "../../narrative/BardEngine";
import { getRecruitmentStrategy } from "../../npcRecruitmentStrategy";
import { ensureTalentPoolState, refreshAllPools } from "./TalentPoolStateService";
import { getForeignCountInHeya } from "./TalentPoolScouting";

// --- Constants ---
export const FOREIGN_RIKISHI_LIMIT_PER_HEYA = 1;
export const BASE_SCOUT_COST = 50000;
export const REVEAL_COST = 100000;

/**
 * Submits an offer to a candidate from the player's stable.
 */
export function offerCandidate(
  world: WorldState,
  candidateId: Id,
  heyaId: Id,
  offerType: "standard" | "aggressive",
  interest: "low" | "medium" | "high" | "all_in"
): { ok: boolean; reason?: string } {
  const tp = ensureTalentPoolState(world);
  const candidate = tp.candidates[candidateId];
  if (!candidate) return { ok: false, reason: "Candidate not found" };

  const rng = rngFromSeed(`offer-validate-${candidateId}-${heyaId}`, "narrative", "scouting");

  // 1. Validation: Foreigner limit
  if ((candidate.nationality ?? "Japan") !== "Japan") {
    const foreignCount = getForeignCountInHeya(world, heyaId);
    if (foreignCount >= FOREIGN_RIKISHI_LIMIT_PER_HEYA) {
      return {
        ok: false,
        reason: BardEngine.resolve(rng, "ui.labels.scouting.reasons.foreigner_limit").text,
      };
    }
  }

  // 2. Validation: Already signed or unavailable
  if (candidate.availabilityState !== "available" && candidate.availabilityState !== "in_talks") {
    return {
      ok: false,
      reason: BardEngine.resolve(rng, "ui.labels.scouting.reasons.unavailable").text,
    };
  }

  // 3. Register suitor
  const existing = candidate.competingSuitors.find((s) => s.heyaId === heyaId);
  if (existing) {
    existing.offerType = offerType;
    existing.interestBand = interest;
  } else {
    candidate.competingSuitors.push({
      heyaId,
      offerType,
      interestBand: interest,
      deadlineWeek: world.week + 2,
    });
    candidate.availabilityState = "in_talks";
  }

  return { ok: true };
}

/**
 * Pure helper to resolve the winner of a contract negotiation for a candidate.
 */
export function resolveCandidateSuitor(
  world: WorldState,
  candidate: TalentCandidate
): { signed: boolean; candidate: TalentCandidate; winnerHeya?: Heya } {
  if (candidate.availabilityState !== "in_talks" || !candidate.competingSuitors.length) {
    return { signed: false, candidate };
  }

  const bandRank: Record<string, number> = {
    all_in: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  const sortedSuitors = [...candidate.competingSuitors].sort(
    (a, b) => (bandRank[b.interestBand] ?? 0) - (bandRank[a.interestBand] ?? 0)
  );

  const winner = sortedSuitors[0];
  const nextCandidate = {
    ...candidate,
    availabilityState: "signed" as const,
    competingSuitors: [winner],
  };

  let winnerHeya = undefined;

  // High-talent signing: fire fame event and give reputation boost
  if (candidate.talentSeed >= 80) {
    const heya = world.heyas.get(winner.heyaId);
    if (heya) {
      winnerHeya = {
        ...heya,
        reputation: Math.min(100, (heya.reputation ?? 50) + 5),
      };

      EventBus.recruitDiscovered(world, {
        rikishiId: candidate.personId, // Use personId for proper event tracking
        heyaId: winner.heyaId,
        shikona: candidate.name,
        heya: heya.name,
        score: candidate.talentSeed,
        status: "high_talent_signed",
      });
    }
  }

  return { signed: true, candidate: nextCandidate, winnerHeya };
}

/**
 * Weekly maintenance for the talent pool.
 */
export function tickWeekTalentPool(world: WorldState): WorldState {
  const tp = ensureTalentPoolState(world);

  const nextWorld = { ...world };
  const nextCandidates = { ...tp.candidates };
  const nextScouting = { ...tp.playerScouting };
  const nextHeyas = new Map(world.heyas);

  // 1. Weekly decay of scouting intel
  for (const [id, record] of Object.entries(nextScouting)) {
    if (world.week - record.lastScoutedWeek > 4) {
      nextScouting[id] = {
        ...record,
        scoutingLevel: Math.max(0, record.scoutingLevel - 2),
      };
    }
  }

  // 2. Resolve suitor deadlines
  for (const [id, candidate] of Object.entries(nextCandidates)) {
    if (candidate.availabilityState !== "in_talks") continue;
    if (!candidate.competingSuitors.length) continue;

    const deadlineExpired = candidate.competingSuitors.some((s) => world.week >= s.deadlineWeek);
    if (!deadlineExpired) continue;

    const resolution = resolveCandidateSuitor(nextWorld, candidate);
    if (resolution.signed) {
      nextCandidates[id] = resolution.candidate;
      if (resolution.winnerHeya) {
        nextHeyas.set(resolution.winnerHeya.id, resolution.winnerHeya);
      }
    }
  }

  // 3. Update world state
  nextWorld.heyas = nextHeyas;
  nextWorld.talentPool = {
    ...tp,
    candidates: nextCandidates,
    playerScouting: nextScouting,
  };

  // 4. Periodic pool refresh logic (basho cadence)
  if (world.calendar && world.calendar.month % 2 !== 0 && world.calendar.currentDay === 1) {
    refreshAllPools(nextWorld);
  }

  return nextWorld;
}

/**
 * Automates recruitment for NPC stables.
 * Materializes candidates immediately into world.rikishi and updates heya rosters.
 * Also returns the StateImpact for callers that need it, but self-applies to ensure
 * rikishi always land in the world regardless of whether callers resolve the impact.
 */
export function fillVacanciesForNPC(
  world: WorldState,
  targetHeyas: Record<string, number>
): StateImpact {
  const builder = createImpactBuilder("fillVacanciesForNPC");
  const tp = world.talentPool;
  if (!tp) return builder.build();

  const rng = RNGRegistry.getSystemRNG(world, "scouting", `npc_fill_${world.week}`);

  // First, map target heyas by prestige band index for weighting
  // Elite stables get first pick in the logic, or we weight the scores by reputation
  const sortedHeyas = Object.keys(targetHeyas).sort((a, b) => {
    const heyaA = world.heyas.get(a);
    const heyaB = world.heyas.get(b);
    return (heyaB?.reputation || 0) - (heyaA?.reputation || 0);
  });

  for (const heyaId of sortedHeyas) {
    const vacancyCount = targetHeyas[heyaId];
    const heya = world.heyas.get(heyaId);
    if (!heya) continue;

    const hasForeigner =
      Array.from(world.rikishi.values()).filter(
        (r) => r.heyaId === heyaId && r.origin === "foreign" && !r.isRetired
      ).length > 0;

    for (let i = 0; i < vacancyCount; i++) {
      // Collect all available visible candidates
      const availableCandidates: string[] = [];
      for (const pt of ["high_school", "university", "foreign"] as const) {
        if (pt === "foreign" && hasForeigner) continue;
        const pool = tp.pools[pt];
        for (const cId of pool.candidatesVisible) {
          const c = tp.candidates[cId];
          if (c && c.availabilityState === "available") {
            availableCandidates.push(cId);
          }
        }
      }

      if (availableCandidates.length > 0) {
        // Score candidates based on talent and heya reputation/prestige
        const candidatesWithScores = availableCandidates.map((cId) => {
          const c = tp.candidates[cId];
          const talent = c.talentSeed;
          // Reputation match: higher reputation heyas attract higher talent
          // The penalty is high for a low-rep heya trying to grab an 85+ talent
          const repScore = heya.reputation || 50;
          let affinity = 1.0;
          if (talent >= 80 && repScore < 70) affinity = 0.1; // Elite candidates largely reject small stables
          if (talent >= 90 && repScore < 85) affinity = 0.05; // Generational candidates strictly reject

          const score = talent * affinity + rng.int(0, 20); // Add variance
          return { cId, score, c };
        });

        // Sort by highest score
        candidatesWithScores.sort((a, b) => b.score - a.score);

        // Pick from top 3
        const pickIdx = rng.int(0, Math.min(2, candidatesWithScores.length - 1));
        const bestCandidate = candidatesWithScores[pickIdx];
        const cId = bestCandidate.cId;
        const c = bestCandidate.c;

        // NPC fast-path signing: bypass multi-week negotiation to stabilize world
        const updatedCandidate = {
          ...c,
          availabilityState: "signed" as const,
          competingSuitors: [
            {
              heyaId,
              offerType: "standard" as const,
              interestBand: "high" as const,
              deadlineWeek: world.week,
            },
          ],
        };

        // Note: talentPool updates are not directly supported by ImpactBuilder yet
        // For now, we'll update them directly as talentPool is a nested state
        tp.candidates[cId] = updatedCandidate;

        // Materialize immediately for NPCs to keep the banzuke populated
        const materializeImpact = materializeCandidateToRikishi(world, cId, heyaId);
        if (materializeImpact.entities?.rikishiUpdates) {
          for (const [id, update] of materializeImpact.entities.rikishiUpdates) {
            builder.updateRikishi(id, update);
          }
        }
        if (materializeImpact.entities?.heyaUpdates) {
          for (const [id, update] of materializeImpact.entities.heyaUpdates) {
            builder.updateHeya(id, update);
          }
        }
      }
    }
  }

  // Self-apply: all call sites discard the return value, so we must apply the
  // rikishi/heya updates directly to the world to ensure NPC rikishi materialize.
  const impact = builder.build();
  if (
    (impact.entities?.rikishiUpdates?.size ?? 0) > 0 ||
    (impact.entities?.heyaUpdates?.size ?? 0) > 0
  ) {
    const resolved = resolveImpacts(world, [impact]);
    Object.assign(world, resolved);
  }
  return impact;
}

/**
 * Automates recruitment for NPC stables with competitive bidding.
 * NPCs bid against each other for visible candidates using their archetype's calculateMaxBid().
 * Materializes candidates immediately into world.rikishi and updates heya rosters.
 * Returns StateImpact describing recruitment decisions.
 */
export function fillVacanciesForNPCWithBidding(
  world: WorldState,
  targetHeyas: Record<string, number>
): StateImpact {
  const builder = createImpactBuilder("fillVacanciesForNPCWithBidding");
  const tp = world.talentPool;
  if (!tp) return builder.build();

  // Collect all visible candidates across all pools
  const allVisibleCandidates: TalentCandidate[] = [];
  for (const poolType of ["high_school", "university", "foreign"] as TalentPoolType[]) {
    const pool = tp.pools[poolType];
    for (const cId of pool.candidatesVisible) {
      const c = tp.candidates[cId];
      if (c && c.availabilityState === "available") {
        allVisibleCandidates.push(c);
      }
    }
  }

  // For each heya with vacancies, calculate bids for available candidates
  const bids: Array<{ heyaId: Id; candidateId: Id; bidAmount: number; oyakata: Oyakata }> = [];

  for (const [heyaId, vacancyCount] of Object.entries(targetHeyas)) {
    const heya = world.heyas.get(heyaId);
    if (!heya) continue;

    const oyakata = world.oyakata.get(heya.oyakataId);
    if (!oyakata) continue;

    const recruitmentStrat = getRecruitmentStrategy(oyakata.archetype);

    // Calculate bids for visible candidates (up to vacancy count)
    const candidatesToBid = allVisibleCandidates.slice(0, vacancyCount);
    for (const candidate of candidatesToBid) {
      // Identify rival heyas (other stables that might want this candidate)
      const rivalHeyaId = Object.keys(targetHeyas).find((hid) => hid !== heyaId);

      const bidAmount = recruitmentStrat.calculateMaxBid(
        world,
        heya,
        oyakata,
        candidate.candidateId,
        rivalHeyaId
      );

      bids.push({
        heyaId,
        candidateId: candidate.candidateId,
        bidAmount,
        oyakata,
      });
    }
  }

  // Sort bids by amount (highest first) to resolve competitive assignments
  bids.sort((a, b) => b.bidAmount - a.bidAmount);

  // Track which candidates and heyas have been assigned
  const assignedCandidates = new Set<Id>();
  const assignedHeyaSlots = new Map<Id, number>();

  // Initialize slot tracking
  for (const heyaId of Object.keys(targetHeyas)) {
    assignedHeyaSlots.set(heyaId, 0);
  }

  // Assign candidates to highest bidders
  for (const bid of bids) {
    // Skip if candidate already assigned
    if (assignedCandidates.has(bid.candidateId)) continue;

    // Skip if heya has filled all vacancies
    const heyaSlotsUsed = assignedHeyaSlots.get(bid.heyaId) ?? 0;
    const heyaVacancies = targetHeyas[bid.heyaId] ?? 0;
    if (heyaSlotsUsed >= heyaVacancies) continue;

    // Assign candidate to this heya
    const candidate = tp.candidates[bid.candidateId];
    if (!candidate) continue;

    // Mark as signed with competing suitor
    const updatedCandidate = {
      ...candidate,
      availabilityState: "signed" as const,
      competingSuitors: [
        {
          heyaId: bid.heyaId,
          offerType: "standard" as const,
          interestBand: "high" as const,
          deadlineWeek: world.week,
        },
      ],
    };

    tp.candidates[bid.candidateId] = updatedCandidate;

    // Materialize immediately for NPCs
    const materializeImpact = materializeCandidateToRikishi(world, bid.candidateId, bid.heyaId);
    if (materializeImpact.entities?.rikishiUpdates) {
      for (const [id, update] of materializeImpact.entities.rikishiUpdates) {
        builder.updateRikishi(id, update);
      }
    }
    if (materializeImpact.entities?.heyaUpdates) {
      for (const [id, update] of materializeImpact.entities.heyaUpdates) {
        builder.updateHeya(id, update);
      }
    }

    // Log bidding decision using existing event type
    builder.logEvent(
      "NPC_MANAGER_DECISION",
      "narrative",
      {
        heyaId: bid.heyaId,
        candidateId: bid.candidateId,
        bidAmount: bid.bidAmount,
        archetype: bid.oyakata.archetype,
        strategy: "recruitment_bidding",
      },
      { heyaId: bid.heyaId, importance: "minor" }
    );

    // Mark as assigned
    assignedCandidates.add(bid.candidateId);
    assignedHeyaSlots.set(bid.heyaId, heyaSlotsUsed + 1);
  }

  // Self-apply to ensure NPC rikishi materialize
  const impact = builder.build();
  if (
    (impact.entities?.rikishiUpdates?.size ?? 0) > 0 ||
    (impact.entities?.heyaUpdates?.size ?? 0) > 0
  ) {
    const resolved = resolveImpacts(world, [impact]);
    Object.assign(world, resolved);
  }
  return impact;
}

/**
 * Converts a signed candidate into a full Rikishi entity and adds them to the world.
 * Standardized pure implementation used for both NPC fast-path and weekly resolution.
 * Returns StateImpact describing rikishi materialization instead of mutating directly.
 */
export function materializeCandidateToRikishi(
  world: WorldState,
  candidateId: Id,
  heyaId: Id
): StateImpact {
  const builder = createImpactBuilder("materializeCandidateToRikishi");
  const tp = world.talentPool;
  const candidate = tp?.candidates[candidateId];
  if (!candidate || !tp) return builder.build();

  const rng = RNGRegistry.getSystemRNG(world, "scouting", `materialize_${candidateId}`);

  const rikishi = convertCandidateToRikishi({
    candidate,
    rng,
    currentYear: world.year,
    heyaId,
  });

  // 1. Inject into world
  builder.updateRikishi(rikishi.id, rikishi);

  // 2. Link to heya
  const heya = world.heyas.get(heyaId);
  if (heya) {
    const newRikishiIds = [...(heya.rikishiIds || []), rikishi.id];
    builder.updateHeya(heyaId, { rikishiIds: newRikishiIds });
  }

  // 3. Remove from talent pool (mark as signed)
  // Note: talentPool updates are not directly supported by ImpactBuilder yet
  // For now, we'll update them directly as talentPool is a nested state
  const nextCandidates = Object.fromEntries(
    Object.entries(tp.candidates).filter(([id]) => id !== candidateId)
  );
  world.talentPool = { ...tp, candidates: nextCandidates };

  return builder.build();
}

/**
 * Finalizes all "signed" candidates by converting them into full Rikishi entities.
 * This ensures recruits are actually added to stable rosters and the world state.
 */
export function finalizeSignedCandidates(world: WorldState): StateImpact {
  const builder = createImpactBuilder("finalizeSignedCandidates");
  const tp = world.talentPool;
  if (!tp) return builder.build();

  const nextCandidates = { ...tp.candidates };
  const signedIds = new Set<string>();

  for (const [id, candidate] of Object.entries(tp.candidates)) {
    if (candidate.availabilityState === "signed" && candidate.competingSuitors.length > 0) {
      const winner = candidate.competingSuitors[0];
      const heyaId = winner.heyaId;
      const heya = world.heyas.get(heyaId);

      if (heya) {
        const rng = RNGRegistry.getSystemRNG(world, "scouting", `finalize_${id}`);
        const rikishi = convertCandidateToRikishi({
          candidate,
          rng,
          currentYear: world.year,
          heyaId,
        });

        // Add to world
        builder.updateRikishi(rikishi.id, rikishi);

        // Add to heya roster
        const newRikishiIds = [...(heya.rikishiIds || []), rikishi.id];
        builder.updateHeya(heyaId, { rikishiIds: newRikishiIds });

        // Mark for removal from talent pool
        signedIds.add(id);
      }
    }
  }

  // Remove signed candidates from talent pool
  const nextCandidatesFiltered = Object.fromEntries(
    Object.entries(nextCandidates).filter(([id]) => !signedIds.has(id))
  );

  // Re-filter visibility lists to remove converted candidates
  const nextPools = { ...tp.pools };
  for (const pt of Object.keys(nextPools) as TalentPoolType[]) {
    nextPools[pt] = {
      ...nextPools[pt],
      candidatesVisible: nextPools[pt].candidatesVisible.filter(
        (cid) => nextCandidatesFiltered[cid]
      ),
      candidatesHidden: nextPools[pt].candidatesHidden.filter((cid) => nextCandidatesFiltered[cid]),
    };
  }

  // Note: talentPool updates are not directly supported by ImpactBuilder yet
  // For now, we'll update them directly as talentPool is a nested state
  world.talentPool = { ...tp, candidates: nextCandidatesFiltered, pools: nextPools };

  return builder.build();
}
