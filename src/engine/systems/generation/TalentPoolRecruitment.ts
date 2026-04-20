/**
 * TalentPoolRecruitment.ts — Offer management, signing resolution, and materialization.
 * Covers contract offers, suitor resolution, NPC auto-fill, and candidate→rikishi conversion.
 */

import { RNGRegistry } from "../../core/RNGRegistry";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import type { WorldState } from "../../types/world";
import type { Id } from "../../types/common";
import type { Heya } from "../../types/heya";
import type { Oyakata } from "../../types/oyakata";
import { TalentPoolType, TalentCandidate } from "../../types/talent";
import { convertCandidateToRikishi } from "./CandidateBuilder";
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
 * Returns an impact describing the offer registration.
 */
export function offerCandidate(
  world: WorldState,
  candidateId: Id,
  heyaId: Id,
  offerType: "standard" | "aggressive",
  interest: "low" | "medium" | "high" | "all_in"
): { ok: boolean; reason?: string; impact?: StateImpact } {
  const builder = createImpactBuilder("offerCandidate");
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
  const nextCandidates = { ...tp.candidates };
  const nextCandidate = { ...candidate, competingSuitors: [...candidate.competingSuitors] };

  const existingIdx = nextCandidate.competingSuitors.findIndex((s) => s.heyaId === heyaId);
  if (existingIdx !== -1) {
    nextCandidate.competingSuitors[existingIdx] = {
      ...nextCandidate.competingSuitors[existingIdx],
      offerType,
      interestBand: interest,
    };
  } else {
    nextCandidate.competingSuitors.push({
      heyaId,
      offerType,
      interestBand: interest,
      deadlineWeek: world.week + 2,
    });
    nextCandidate.availabilityState = "in_talks";
  }

  nextCandidates[candidateId] = nextCandidate;

  builder.updateWorldField("talentPool", {
    ...tp,
    candidates: nextCandidates,
  });

  return { ok: true, impact: builder.build() };
}

/**
 * Pure helper to resolve the winner of a contract negotiation for a candidate.
 */
export function resolveCandidateSuitor(
  world: WorldState,
  candidate: TalentCandidate
): {
  signed: boolean;
  candidate: TalentCandidate;
  winnerHeyaUpdate?: Partial<Heya>;
  event?: Parameters<typeof EventBus.recruitDiscovered>[1];
} {
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

  let winnerHeyaUpdate = undefined;
  let event = undefined;

  // High-talent signing: fire fame event and give reputation boost
  if (candidate.talentSeed >= 80) {
    const heya = world.heyas.get(winner.heyaId);
    if (heya) {
      winnerHeyaUpdate = {
        reputation: Math.min(100, (heya.reputation ?? 50) + 5),
      };

      event = {
        rikishiId: candidate.personId, // Use personId for proper event tracking
        heyaId: winner.heyaId,
        shikona: candidate.name,
        heya: heya.name,
        score: candidate.talentSeed,
        status: "high_talent_signed" as const,
      };
    }
  }

  return { signed: true, candidate: nextCandidate, winnerHeyaUpdate, event };
}

/**
 * Weekly maintenance for the talent pool.
 * Returns StateImpact describing maintenance results instead of mutating directly.
 */
export function tickWeekTalentPool(world: WorldState): StateImpact {
  const builder = createImpactBuilder("tickWeekTalentPool");
  const tp = ensureTalentPoolState(world);

  const nextCandidates = { ...tp.candidates };
  const nextScouting = { ...(tp.playerScouting || {}) };

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

    const resolution = resolveCandidateSuitor(world, candidate);
    if (resolution.signed) {
      nextCandidates[id] = resolution.candidate;
      if (resolution.winnerHeyaUpdate) {
        builder.updateHeya(
          resolution.candidate.competingSuitors[0].heyaId,
          resolution.winnerHeyaUpdate
        );
      }
      if (resolution.event) {
        builder.logEvent("RECRUIT_DISCOVERED", "narrative", resolution.event, {
          heyaId: resolution.candidate.competingSuitors[0].heyaId,
        });
      }
    }
  }

  // 3. Update world state via impact
  builder.updateWorldField("talentPool", {
    ...tp,
    candidates: nextCandidates,
    playerScouting: nextScouting,
  });

  // 4. Periodic pool refresh logic (basho cadence)
  if (world.calendar && world.calendar.month % 2 !== 0 && world.calendar.currentDay === 1) {
    builder.merge(refreshAllPools(world));
  }

  return builder.build();
}

/**
 * Automates recruitment for NPC stables.
 */
export function fillVacanciesForNPC(
  world: WorldState,
  targetHeyas: Record<string, number>
): StateImpact {
  const builder = createImpactBuilder("fillVacanciesForNPC");
  const tp = world.talentPool;
  if (!tp) return builder.build();

  const rng = RNGRegistry.getSystemRNG(world, "scouting", `npc_fill_${world.week}`);

  const sortedHeyas = Object.keys(targetHeyas).sort((a, b) => {
    const heyaA = world.heyas.get(a);
    const heyaB = world.heyas.get(b);
    return (heyaB?.reputation || 0) - (heyaA?.reputation || 0);
  });

  let currentCandidates = { ...tp.candidates };
  let currentPools = { ...tp.pools };

  for (const heyaId of sortedHeyas) {
    const vacancyCount = targetHeyas[heyaId];
    const heya = world.heyas.get(heyaId);
    if (!heya) continue;

    const hasForeigner =
      Array.from(world.rikishi.values()).filter(
        (r) => r.heyaId === heyaId && r.origin === "foreign" && !r.isRetired
      ).length > 0;

    for (let i = 0; i < vacancyCount; i++) {
      const availableCandidates: string[] = [];
      for (const pt of ["high_school", "university", "foreign"] as const) {
        if (pt === "foreign" && hasForeigner) continue;
        const pool = currentPools[pt];
        for (const cId of pool.candidatesVisible) {
          const c = currentCandidates[cId];
          if (c && c.availabilityState === "available") {
            availableCandidates.push(cId);
          }
        }
      }

      if (availableCandidates.length > 0) {
        const candidatesWithScores = availableCandidates.map((cId) => {
          const c = currentCandidates[cId];
          const talent = c.talentSeed;
          const repScore = heya.reputation || 50;
          let affinity = 1.0;
          if (talent >= 80 && repScore < 70) affinity = 0.1;
          if (talent >= 90 && repScore < 85) affinity = 0.05;

          const score = talent * affinity + rng.int(0, 20);
          return { cId, score, c };
        });

        candidatesWithScores.sort((a, b) => b.score - a.score);

        const pickIdx = rng.int(0, Math.min(2, candidatesWithScores.length - 1));
        const bestCandidate = candidatesWithScores[pickIdx];
        const cId = bestCandidate.cId;
        const c = bestCandidate.c;

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

        currentCandidates[cId] = updatedCandidate;

        // Materialize immediately for NPC to keep banzuke populated
        const materializeImpact = materializeCandidateToRikishiInternal(
          world,
          cId,
          heyaId,
          currentCandidates,
          currentPools
        );
        builder.merge(materializeImpact.impact);
        currentCandidates = materializeImpact.nextCandidates;
        currentPools = materializeImpact.nextPools;
      }
    }
  }

  builder.updateWorldField("talentPool", {
    ...tp,
    candidates: currentCandidates,
    pools: currentPools,
  });

  return builder.build();
}

/**
 * Automates recruitment for NPC stables with competitive bidding.
 */
export function fillVacanciesForNPCWithBidding(
  world: WorldState,
  targetHeyas: Record<string, number>
): StateImpact {
  const builder = createImpactBuilder("fillVacanciesForNPCWithBidding");
  const tp = world.talentPool;
  if (!tp) return builder.build();

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

  const bids: Array<{ heyaId: Id; candidateId: Id; bidAmount: number; oyakata: Oyakata }> = [];

  for (const [heyaId, vacancyCount] of Object.entries(targetHeyas)) {
    const heya = world.heyas.get(heyaId);
    if (!heya) continue;
    const oyakata = world.oyakata.get(heya.oyakataId);
    if (!oyakata) continue;

    const recruitmentStrat = getRecruitmentStrategy(oyakata.archetype);
    const candidatesToBid = allVisibleCandidates.slice(0, vacancyCount);
    for (const candidate of candidatesToBid) {
      const rivalHeyaId = Object.keys(targetHeyas).find((hid) => hid !== heyaId);
      const bidAmount = recruitmentStrat.calculateMaxBid(
        world,
        heya,
        oyakata,
        candidate.candidateId,
        rivalHeyaId
      );
      bids.push({ heyaId, candidateId: candidate.candidateId, bidAmount, oyakata });
    }
  }

  bids.sort((a, b) => b.bidAmount - a.bidAmount);

  const assignedCandidates = new Set<Id>();
  const assignedHeyaSlots = new Map<Id, number>();
  for (const heyaId of Object.keys(targetHeyas)) {
    assignedHeyaSlots.set(heyaId, 0);
  }

  let currentCandidates = { ...tp.candidates };
  let currentPools = { ...tp.pools };

  for (const bid of bids) {
    if (assignedCandidates.has(bid.candidateId)) continue;
    const heyaSlotsUsed = assignedHeyaSlots.get(bid.heyaId) ?? 0;
    const heyaVacancies = targetHeyas[bid.heyaId] ?? 0;
    if (heyaSlotsUsed >= heyaVacancies) continue;

    const candidate = currentCandidates[bid.candidateId];
    if (!candidate) continue;

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
    currentCandidates[bid.candidateId] = updatedCandidate;

    const materializeImpact = materializeCandidateToRikishiInternal(
      world,
      bid.candidateId,
      bid.heyaId,
      currentCandidates,
      currentPools
    );
    builder.merge(materializeImpact.impact);
    currentCandidates = materializeImpact.nextCandidates;
    currentPools = materializeImpact.nextPools;

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

    assignedCandidates.add(bid.candidateId);
    assignedHeyaSlots.set(bid.heyaId, heyaSlotsUsed + 1);
  }

  builder.updateWorldField("talentPool", {
    ...tp,
    candidates: currentCandidates,
    pools: currentPools,
  });

  return builder.build();
}

import type { TalentPoolType, TalentCandidate, TalentPoolState } from "../../types/talent";
import { convertCandidateToRikishi } from "./CandidateBuilder";

/**
 * Internal helper for materialization that tracks state updates during a loop.
 */
function materializeCandidateToRikishiInternal(
  world: WorldState,
  candidateId: Id,
  heyaId: Id,
  candidates: Record<Id, TalentCandidate>,
  pools: Record<TalentPoolType, TalentPoolState>
): {
  impact: StateImpact;
  nextCandidates: Record<Id, TalentCandidate>;
  nextPools: Record<TalentPoolType, TalentPoolState>;
} {
  const builder = createImpactBuilder("materializeCandidateToRikishiInternal");
  const candidate = candidates[candidateId];
  if (!candidate) return { impact: builder.build(), nextCandidates: candidates, nextPools: pools };

  const rng = RNGRegistry.getSystemRNG(world, "scouting", `materialize_${candidateId}`);
  const rikishi = convertCandidateToRikishi({ candidate, rng, currentYear: world.year, heyaId });

  builder.updateRikishi(rikishi.id, rikishi);
  const heya = world.heyas.get(heyaId);
  if (heya) {
    builder.updateHeya(heyaId, { rikishiIds: [...(heya.rikishiIds || []), rikishi.id] });
  }

  // Purely remove candidate from pools/candidates tracking
  const { [candidateId]: _, ...nextCandidates } = candidates;
  void _;

  const nextPools = { ...pools };
  for (const pt of Object.keys(nextPools) as TalentPoolType[]) {
    nextPools[pt] = {
      ...nextPools[pt],
      candidatesVisible: nextPools[pt].candidatesVisible.filter(
        (cid: string) => cid !== candidateId
      ),
      candidatesHidden: nextPools[pt].candidatesHidden.filter((cid: string) => cid !== candidateId),
    };
  }

  return { impact: builder.build(), nextCandidates, nextPools };
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
  const tp = world.talentPool;
  if (!tp) return createImpactBuilder("materializeCandidateToRikishi").build();

  const result = materializeCandidateToRikishiInternal(
    world,
    candidateId,
    heyaId,
    tp.candidates,
    tp.pools
  );
  const builder = createImpactBuilder("materializeCandidateToRikishi");
  builder.merge(result.impact);
  builder.updateWorldField("talentPool", {
    ...tp,
    candidates: result.nextCandidates,
    pools: result.nextPools,
  });

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

  let currentCandidates = { ...tp.candidates };
  let currentPools = { ...tp.pools };

  for (const [id, candidate] of Object.entries(tp.candidates)) {
    if (candidate.availabilityState === "signed" && candidate.competingSuitors.length > 0) {
      const winner = candidate.competingSuitors[0];
      const heyaId = winner.heyaId;
      if (world.heyas.has(heyaId)) {
        const resolution = materializeCandidateToRikishiInternal(
          world,
          id,
          heyaId,
          currentCandidates,
          currentPools
        );
        builder.merge(resolution.impact);
        currentCandidates = resolution.nextCandidates;
        currentPools = resolution.nextPools;
      }
    }
  }

  builder.updateWorldField("talentPool", {
    ...tp,
    candidates: currentCandidates,
    pools: currentPools,
  });

  return builder.build();
}
