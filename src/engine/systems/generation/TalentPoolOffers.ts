import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import type { WorldState } from "../../types/world";
import type { Id } from "../../types/common";
import type { Heya } from "../../types/heya";
import { TalentCandidate } from "../../types/talent";
import { rngFromSeed } from "../../rng";
import { BardEngine } from "../../bard/BardEngine";
import { ensureTalentPoolState } from "./TalentPoolStateService";
import { getForeignCountInHeya } from "./TalentPoolScouting";
import { FOREIGN_RIKISHI_LIMIT_PER_HEYA } from "../../../constants/engine/recruitment";
import { getHeya } from "../../queries";
import { EventBus } from "../../events";

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
