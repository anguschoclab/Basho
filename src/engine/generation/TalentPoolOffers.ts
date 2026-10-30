import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { StateImpact } from "@/engine/core/StateImpact";
import type { WorldState } from "@/engine/types/world";
import type { Id } from "@/engine/types/common";
import type { Heya } from "@/engine/types/heya";
import { TalentCandidate } from "@/engine/types/talent";
import { rngFromSeed, rngForWorld } from "@/engine/core/rng";
import {
  computeSignChance,
  bestScoutNegotiation,
  heyaHasDormitory,
} from "@/engine/recruitment/scoutMissions";
import { BardEngine } from "@/engine/bard/BardEngine";
import { ensureTalentPoolState } from "@/engine/generation/TalentPoolStateService";
import { getForeignCountInHeya, candidateConsumesForeignSlot } from "@/engine/generation/TalentPoolScouting";
import { FOREIGN_RIKISHI_LIMIT_PER_HEYA } from "@/constants/engine/recruitment";
import { getHeya } from "@/engine/core/queries";
import { EventBus } from "@/engine/events/events";

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

  // 1. Validation: Foreigner limit — §5.3/5.4: only slot-consuming candidates
  // are gated; dual citizens are exempt and may always be recruited.
  if (candidateConsumesForeignSlot(candidate)) {
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

  // §5.4: a slot-consuming candidate can only be won by a suitor whose heya
  // has a free foreign slot — ineligible suitors are dropped before ranking.
  const consumesSlot = candidateConsumesForeignSlot(candidate);
  const eligibleSuitors = candidate.competingSuitors.filter(
    (s) => !consumesSlot || getForeignCountInHeya(world, s.heyaId) < FOREIGN_RIKISHI_LIMIT_PER_HEYA
  );
  // No suitor can legally sign — the talks collapse and the candidate goes
  // back on the market rather than re-resolving the same deadline weekly.
  if (!eligibleSuitors.length) {
    return {
      signed: false,
      candidate: { ...candidate, availabilityState: "available", competingSuitors: [] },
    };
  }

  // P4 sign-chance model: a suitor's probability blends declared interest,
  // offer aggression, heya prestige, scout negotiation skill and the
  // dormitory family-persuasion hook; a crowded field drags every bid down.
  // The winner is a seeded weighted draw — deterministic per candidate+week
  // and honest about long-shot signings.
  const rng = rngForWorld(
    world,
    "recruitment",
    `suitor-resolve-${candidate.candidateId}-w${world.week ?? 0}`
  );
  const weights = eligibleSuitors.map((s) =>
    computeSignChance({
      competingSuitors: eligibleSuitors.length - 1,
      heyaPrestige: getHeya(world, s.heyaId)?.reputation ?? 50,
      negotiation: bestScoutNegotiation(world, s.heyaId),
      hasDormitory: heyaHasDormitory(world, s.heyaId),
      offerType: s.offerType === "aggressive" ? "aggressive" : "standard",
      interest: s.interestBand,
    })
  );
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let winner = eligibleSuitors[0];
  if (totalWeight > 0) {
    let roll = rng.next() * totalWeight;
    for (let i = 0; i < eligibleSuitors.length; i++) {
      roll -= weights[i];
      winner = eligibleSuitors[i];
      if (roll <= 0) break;
    }
  }
  const nextCandidate = {
    ...candidate,
    availabilityState: "signed" as const,
    competingSuitors: [winner],
  };

  let winnerHeyaUpdate = undefined;
  let event = undefined;

  // High-talent signing: fire fame event and give reputation boost
  if (candidate.talentSeed >= 80) {
    const heya = getHeya(world, winner.heyaId);
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
