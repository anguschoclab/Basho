import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import type { WorldState } from "../../types/world";
import type { Id } from "../../types/common";
import type { Oyakata } from "../../types/oyakata";
import { TalentPoolType, TalentCandidate } from "../../types/talent";
import { RNGRegistry } from "../../core/RNGRegistry";
import { getRecruitmentStrategy } from "../../npcRecruitmentStrategy";
import { materializeCandidateToRikishiInternal } from "./TalentPoolMaterialization";
import { isRecruitmentPlayerRelevant } from "../../npcAI/eventSurfacing";
import { getHeya } from "../../queries";
import { recruitmentBalanceMultipliers } from "./competitiveBalance";
import { error } from "@/engine/utils/Logger";
import { perceivedTalentSeed } from "../recruitment/perceivedTalent";
import { isForeign } from "../../utils/identity";
import { candidateConsumesForeignSlot } from "./talentPoolReads";
import { foreignSlotBidAggression, foreignSlotOccupied } from "../../npcAI/ForeignSlotPolicy";
import { DUAL_CITIZEN_BID_PREFERENCE } from "../../../constants/engine/recruitment";

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

    // Citizenship-aware slot check (§5.1–5.3): naturalized/dual-citizen
    // incumbents free the slot; dual-citizen candidates are exempt anyway.
    // `hasForeigner` is mutable: a slot-consuming pick earlier in this SAME
    // batch consumes the slot for the remaining vacancies.
    // Reads rikishi-side truth (foreignSlotOccupied scans activeRikishiIds +
    // signed-pending candidates) — heya.rikishiIds can desync after transfers.
    let hasForeigner = foreignSlotOccupied(world, heyaId);

    for (let i = 0; i < vacancyCount; i++) {
      const availableCandidates: string[] = [];
      for (const pt of ["high_school", "university", "foreign"] as const) {
        const pool = currentPools[pt];
        for (const cId of pool.candidatesVisible) {
          const c = currentCandidates[cId];
          if (!c || c.availabilityState !== "available") continue;
          // Slot occupied → only dual citizens may still appear (§5.4).
          if (hasForeigner && candidateConsumesForeignSlot(c)) continue;
          availableCandidates.push(cId);
        }
      }

      if (availableCandidates.length > 0) {
        const candidatesWithScores = availableCandidates.map((cId) => {
          const c = currentCandidates[cId];
          // Imperfect information: the stable evaluates its scouted ESTIMATE, not the
          // candidate's true talentSeed — see perceivedTalent.ts. This is what lets
          // hidden gems slip past the affinity gate into low-reputation stables.
          const talent = perceivedTalentSeed(world, heyaId, c);
          const repScore = heya.reputation ?? 50;
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
        if (candidateConsumesForeignSlot(c)) hasForeigner = true;

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
  const targetHeyaIds = Object.keys(targetHeyas);

  // Precompute rival heya map and balance multipliers to avoid O(H²) scans inside the loop.
  const rivalHeyaMap = new Map<Id, Id | undefined>();
  const first = targetHeyaIds[0];
  const second = targetHeyaIds[1];
  for (const hid of targetHeyaIds) {
    rivalHeyaMap.set(hid as Id, (hid === first ? second : first) as Id | undefined);
  }
  const balanceMap = recruitmentBalanceMultipliers(world, targetHeyaIds as Id[]);
  // §5.4: heya whose single foreign slot is already consumed (roster or a
  // signed-pending foreign candidate) may not bid on slot-consuming recruits.
  const foreignOccupied = new Map<Id, boolean>();
  for (const hid of targetHeyaIds) {
    // Rikishi-side truth: scans world.rikishi (r.heyaId) plus signed-pending
    // candidates — heya.rikishiIds can desync after merger transfers.
    foreignOccupied.set(hid, foreignSlotOccupied(world, hid));
  }

  for (const heyaId of targetHeyaIds) {
    const heya = getHeya(world, heyaId);
    if (!heya) continue;
    const oyakata = world.oyakata.get(heya.oyakataId);
    if (!oyakata) continue;

    const bidPolicy = world.npcBidPolicies?.[heyaId as Id];
    if (bidPolicy && !bidPolicy.shouldBid) continue;
    const rivalHeyaId = rivalHeyaMap.get(heyaId as Id);
    const balanceMult = balanceMap.get(heyaId as Id) ?? 1;
    const slotOccupied = foreignOccupied.get(heyaId) ?? false;
    const slotAggression = foreignSlotBidAggression(oyakata);
    const recruitmentStrat = getRecruitmentStrategy(oyakata.archetype);
    for (const candidate of allVisibleCandidates) {
      // §5.4 hard gate: slot occupied → slot-consuming candidates are invisible.
      // Dual citizens are exempt and may always appear.
      if (slotOccupied && candidateConsumesForeignSlot(candidate)) continue;
      const bidAmount = computeNpcBid(
        world,
        heya,
        oyakata,
        candidate,
        { rivalHeyaId, balanceMult, slotAggression },
        bidPolicy,
        recruitmentStrat
      );
      bids.push({ heyaId, candidateId: candidate.candidateId, bidAmount, oyakata });
    }
  }

  bids.sort((a, b) => b.bidAmount - a.bidAmount);

  const { nextCandidates, nextPools } = assignWinningBids(
    world,
    bids,
    targetHeyas,
    foreignOccupied,
    tp,
    builder
  );

  builder.updateWorldField("talentPool", {
    ...tp,
    candidates: nextCandidates,
    pools: nextPools,
  });

  return builder.build();
}

/** Per-candidate bid: balance, family bias, §9.3 slot policy, and policy cap. */
function computeNpcBid(
  world: WorldState,
  heya: NonNullable<ReturnType<typeof getHeya>>,
  oyakata: Oyakata,
  candidate: TalentCandidate,
  ctx: { rivalHeyaId: Id | undefined; balanceMult: number; slotAggression: number },
  bidPolicy: NonNullable<WorldState["npcBidPolicies"]>[Id] | undefined,
  recruitmentStrat: ReturnType<typeof getRecruitmentStrategy>
): number {
  const rawBid = recruitmentStrat.calculateMaxBid(
    world,
    heya,
    oyakata,
    candidate.candidateId,
    ctx.rivalHeyaId
  );
  let bidAmount = Math.round(rawBid * ctx.balanceMult);
  // Meta-adaptation lever (WS2): bias bids toward candidates whose
  // dominant family matches the manager's committed posture.
  if (bidPolicy?.familyBias) {
    const fp = candidate.combatProfile?.familyPreferences;
    if (fp) {
      const dominant = (Object.entries(fp) as [string, number][]).sort(
        (a, b) => b[1] - a[1]
      )[0];
      if (dominant && dominant[0] === bidPolicy.familyBias.family) {
        bidAmount = Math.round(bidAmount * (1 + bidPolicy.familyBias.weight));
      }
    }
  }
  // §9.3 slot policy: persona-weighted aggression on foreign recruits,
  // plus a standing preference for slot-exempt dual citizens.
  if (candidateConsumesForeignSlot(candidate)) {
    bidAmount = Math.round(bidAmount * ctx.slotAggression);
  } else if (candidate.dualCitizen) {
    bidAmount = Math.round(bidAmount * (1 + DUAL_CITIZEN_BID_PREFERENCE));
  }
  if (bidPolicy && bidPolicy.maxBid > 0) {
    bidAmount = Math.min(bidAmount, bidPolicy.maxBid);
  }
  return bidAmount;
}

/**
 * Resolve sorted bids to signings: materialize each winner, emit the
 * recruitment-bidding event, and respect per-heya vacancy caps.
 */
function assignWinningBids(
  world: WorldState,
  bids: Array<{ heyaId: Id; candidateId: Id; bidAmount: number; oyakata: Oyakata }>,
  targetHeyas: Record<string, number>,
  foreignOccupied: Map<Id, boolean>,
  tp: NonNullable<WorldState["talentPool"]>,
  builder: ReturnType<typeof createImpactBuilder>
): { nextCandidates: Record<string, TalentCandidate>; nextPools: typeof tp.pools } {
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

    // §5.4 batch enforcement: a slot-consuming foreigner won earlier in this
    // same resolution consumes the heya's slot — later foreign wins are void.
    const consumesSlot = candidateConsumesForeignSlot(candidate);
    if (consumesSlot && foreignOccupied.get(bid.heyaId)) continue;

    currentCandidates[bid.candidateId] = {
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

    try {
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
    } catch (err) {
      error(`Failed to materialize candidate ${bid.candidateId}`, "TalentPoolNPCRecruitment", err);
      continue;
    }

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
        // WS7 surfacing flags — foreign signings and dual citizens are
        // distinct feed items per the slot-policy contract (§5.3–5.4).
        isForeign: isForeign({ nationality: candidate.nationality }),
        dualCitizen: candidate.dualCitizen === true,
      },
      { heyaId: bid.heyaId, importance: isRecruitmentPlayerRelevant(world, candidate) }
    );

    assignedCandidates.add(bid.candidateId);
    assignedHeyaSlots.set(bid.heyaId, heyaSlotsUsed + 1);
    if (consumesSlot) foreignOccupied.set(bid.heyaId, true);
  }

  return { nextCandidates: currentCandidates, nextPools: currentPools };
}
