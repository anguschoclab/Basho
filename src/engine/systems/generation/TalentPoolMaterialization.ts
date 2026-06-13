import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import type { WorldState } from "../../types/world";
import type { Id } from "../../types/common";
import { TalentPoolType, TalentCandidate, TalentPoolState } from "../../types/talent";
import { convertCandidateToRikishi } from "./CandidateBuilder";
import { RNGRegistry } from "../../core/RNGRegistry";
import { getHeya } from "../../queries";

/**
 * Internal helper for materialization that tracks state updates during a loop.
 */
export function materializeCandidateToRikishiInternal(
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

  builder.addRikishi(rikishi);
  const heya = getHeya(world, heyaId);
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
