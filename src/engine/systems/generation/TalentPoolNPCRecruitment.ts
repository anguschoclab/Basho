import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import type { WorldState } from "../../types/world";
import type { Id } from "../../types/common";
import type { Oyakata } from "../../types/oyakata";
import { TalentPoolType, TalentCandidate } from "../../types/talent";
import { RNGRegistry } from "../../core/RNGRegistry";
import { getRecruitmentStrategy } from "../../npcRecruitmentStrategy";
import { EntityCollection } from "../../core/EntityCollection";
import { materializeCandidateToRikishiInternal } from "./TalentPoolMaterialization";
import { isRecruitmentPlayerRelevant } from "../../npc/npcEventSurfacing";
import { getHeya } from "../../queries";

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
    const heyaA = getHeya(world, a);
    const heyaB = getHeya(world, b);
    return (heyaB?.reputation || 0) - (heyaA?.reputation || 0);
  });

  let currentCandidates = { ...tp.candidates };
  let currentPools = { ...tp.pools };

  for (const heyaId of sortedHeyas) {
    const vacancyCount = targetHeyas[heyaId];
    const heya = getHeya(world, heyaId);
    if (!heya || vacancyCount <= 0) continue;

    const hasForeigner = EntityCollection.getHeyaRoster(world, heyaId).some(
      (r) => r.origin === "foreign"
    );

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

  for (const [heyaId, _vacancyCount] of Object.entries(targetHeyas)) {
    const heya = getHeya(world, heyaId);
    if (!heya) continue;
    const oyakata = world.oyakata.get(heya.oyakataId);
    if (!oyakata) continue;

    const recruitmentStrat = getRecruitmentStrategy(oyakata.archetype);
    for (const candidate of allVisibleCandidates) {
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

    const importance = isRecruitmentPlayerRelevant(world, candidate);

    builder.logEvent(
      "NPC_MANAGER_DECISION",
      "narrative",
      {
        heyaId: bid.heyaId,
        candidateId: bid.candidateId,
        bidAmount: bid.bidAmount,
        archetype: bid.oyakata.archetype,
        strategy: "recruitment_bidding",
        candidateName: candidate.name,
      },
      { heyaId: bid.heyaId, importance }
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
