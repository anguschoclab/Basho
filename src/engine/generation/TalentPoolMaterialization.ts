import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { StateImpact } from "@/engine/core/StateImpact";
import type { WorldState } from "@/engine/types/world";
import type { Id } from "@/engine/types/common";
import { TalentPoolType, TalentCandidate, TalentPoolState } from "@/engine/types/talent";
import { convertCandidateToRikishi } from "@/engine/generation/CandidateBuilder";
import { RNGRegistry } from "@/engine/core/RNGRegistry";
import { getHeya } from "@/engine/core/queries";
import { assessMaezumo } from "@/engine/generation/MaezumoService";
import { countsAsForeign } from "@/engine/utils/citizenshipUtils";
import { candidateConsumesForeignSlot } from "@/engine/generation/talentPoolReads";

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
  /** Set when a new rikishi entity was actually minted (undefined when the
   *  already-materialized guard short-circuited). */
  newRikishiId?: string;
} {
  const builder = createImpactBuilder("materializeCandidateToRikishiInternal");
  const candidate = candidates[candidateId];
  if (!candidate) return { impact: builder.build(), nextCandidates: candidates, nextPools: pools };
  let newRikishiId: string | undefined;

  // Already-materialized guard: the rikishi id is the candidate's personId,
  // so a stale "signed" candidate whose personId is already a live rikishi
  // must not mint a duplicate entity or re-append the roster slot. The
  // candidate is still stripped from the pools below.
  if (!world.rikishi.has(candidate.personId)) {
    const rng = RNGRegistry.getSystemRNG(world, "scouting", `materialize_${candidateId}`);
    const rikishi = convertCandidateToRikishi({ candidate, rng, currentYear: world.year, heyaId });

    // Apply maezumo assessment to determine initial jonokuchi rankNumber
    const maezumoResult = assessMaezumo(rikishi, world.seed ?? "default");
    if (maezumoResult.rankNumber !== undefined) {
      rikishi.rankNumber = maezumoResult.rankNumber;
    }
    if (maezumoResult.maezumoCompleted) {
      rikishi.maezumoCompleted = true;
    }

    builder.addRikishi(rikishi);
    newRikishiId = rikishi.id;
    const heya = getHeya(world, heyaId);
    if (heya) {
      builder.updateHeya(heyaId, { rikishiIds: [...(heya.rikishiIds || []), rikishi.id] });
    }
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

  return { impact: builder.build(), nextCandidates, nextPools, newRikishiId };
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
 *
 * Scans BOTH the main talentPool and the candidatePool watchlist: the
 * poaching pipeline resolves deadlines to `signed` on candidatePool copies,
 * which mirror a main-pool candidate id — so a materialized watchlist entry
 * also consumes the main-pool copy (the same person cannot sign twice).
 */
export function finalizeSignedCandidates(world: WorldState): StateImpact {
  const builder = createImpactBuilder("finalizeSignedCandidates");
  const tp = world.talentPool;
  const cp = world.candidatePool;
  if (!tp && !cp) return builder.build();

  let tpCandidates: Record<Id, TalentCandidate> = { ...(tp?.candidates ?? {}) };
  let tpPools: Record<TalentPoolType, TalentPoolState> = {
    ...(tp?.pools ?? {}),
  } as Record<TalentPoolType, TalentPoolState>;
  let tpChanged = false;

  let cpCandidates: Record<Id, TalentCandidate> = { ...(cp?.candidates ?? {}) };
  let cpPools: Record<TalentPoolType, TalentPoolState> = {
    ...(cp?.pools ?? {}),
  } as Record<TalentPoolType, TalentPoolState>;
  let cpChanged = false;

  // §5.4 last-line guard: regardless of which path signed a candidate, a heya
  // can never materialize a second slot-consuming foreigner. Excess signings
  // fall through — the candidate returns to the pool for next cycle.
  const foreignOccupied = new Set<Id>();
  for (const r of world.rikishi.values()) {
    if (!r.isRetired && r.heyaId && countsAsForeign(r, world.year)) {
      foreignOccupied.add(r.heyaId);
    }
  }

  // personIds minted during THIS pass — the rikishi map on `world` is the
  // pre-impact snapshot, so a candidate copied into both pools would
  // otherwise mint a second rikishi for the same person in one batch.
  const mintedPersonIds = new Set<string>();

  const stripCandidate = (
    id: Id,
    candidates: Record<Id, TalentCandidate>,
    pools: Record<TalentPoolType, TalentPoolState>
  ) => {
    const { [id]: _removed, ...nextCandidates } = candidates;
    void _removed;
    const nextPools = { ...pools };
    for (const pt of Object.keys(nextPools) as TalentPoolType[]) {
      nextPools[pt] = {
        ...nextPools[pt],
        candidatesVisible: nextPools[pt].candidatesVisible.filter((cid) => cid !== id),
        candidatesHidden: nextPools[pt].candidatesHidden.filter((cid) => cid !== id),
      };
    }
    return { nextCandidates, nextPools };
  };

  /**
   * Materialize one signed candidate out of the given pool records.
   * Returns the updated records plus whether the entry was consumed.
   */
  const processSigned = (
    id: Id,
    candidates: Record<Id, TalentCandidate>,
    pools: Record<TalentPoolType, TalentPoolState>
  ): {
    candidates: Record<Id, TalentCandidate>;
    pools: Record<TalentPoolType, TalentPoolState>;
    consumed: boolean;
  } => {
    const candidate = candidates[id];
    if (!candidate || candidate.availabilityState !== "signed") {
      return { candidates, pools, consumed: false };
    }
    if (candidate.competingSuitors.length === 0) {
      return { candidates, pools, consumed: false };
    }
    const winner = candidate.competingSuitors[0];
    const heyaId = winner.heyaId;
    if (!world.heyas.has(heyaId)) {
      return { candidates, pools, consumed: false };
    }

    // The person was already materialized via another pool copy this pass —
    // consume the duplicate entry without minting a second rikishi.
    if (mintedPersonIds.has(candidate.personId)) {
      const stripped = stripCandidate(id, candidates, pools);
      return { candidates: stripped.nextCandidates, pools: stripped.nextPools, consumed: true };
    }

    if (candidateConsumesForeignSlot(candidate) && foreignOccupied.has(heyaId)) {
      return {
        candidates: {
          ...candidates,
          [id]: {
            ...candidate,
            availabilityState: "available" as const,
            competingSuitors: [],
          },
        },
        pools,
        consumed: true,
      };
    }

    const resolution = materializeCandidateToRikishiInternal(world, id, heyaId, candidates, pools);
    builder.merge(resolution.impact);
    if (resolution.newRikishiId) mintedPersonIds.add(candidate.personId);
    if (candidateConsumesForeignSlot(candidate)) foreignOccupied.add(heyaId);
    return { candidates: resolution.nextCandidates, pools: resolution.nextPools, consumed: true };
  };

  if (tp) {
    for (const id in tp.candidates) {
      if (!Object.prototype.hasOwnProperty.call(tp.candidates, id)) continue;
      const res = processSigned(id, tpCandidates, tpPools);
      tpCandidates = res.candidates;
      tpPools = res.pools;
      if (res.consumed) tpChanged = true;
    }
  }

  if (cp) {
    for (const id in cp.candidates) {
      if (!Object.prototype.hasOwnProperty.call(cp.candidates, id)) continue;
      const res = processSigned(id, cpCandidates, cpPools);
      cpCandidates = res.candidates;
      cpPools = res.pools;
      if (!res.consumed) continue;
      cpChanged = true;
      // The watchlist copy mirrors a main-pool candidate id — once it is
      // consumed here, the main-pool entry must go too (same person).
      if (tp && tpCandidates[id] && res.candidates[id] === undefined) {
        const stripped = stripCandidate(id, tpCandidates, tpPools);
        tpCandidates = stripped.nextCandidates;
        tpPools = stripped.nextPools;
        tpChanged = true;
      }
    }
  }

  // Only emit pool updates if we actually materialized someone.
  // Otherwise this overwrites upstream talent pool changes (e.g. from
  // fillVacanciesForNPCWithBidding) via Object.assign in the impact merge.
  if (tpChanged && tp) {
    builder.updateWorldField("talentPool", {
      ...tp,
      candidates: tpCandidates,
      pools: tpPools,
    });
  }
  if (cpChanged && cp) {
    builder.updateWorldField("candidatePool", {
      ...cp,
      candidates: cpCandidates,
      pools: cpPools,
    });
  }

  return builder.build();
}
