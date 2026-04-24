import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import type { WorldState } from "../../types/world";
import { ensureTalentPoolState, refreshAllPools } from "./TalentPoolStateService";
import { resolveCandidateSuitor } from "./TalentPoolOffers";
import { RNGRegistry } from "../../core/RNGRegistry";

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

  // 3. Passive Discovery: move 1-2 candidates from hidden to visible pools every week
  const nextPools = { ...tp.pools };
  const rng = RNGRegistry.getSystemRNG(world, "scouting", `discovery_${world.week}`);
  
  for (const pt of ["high_school", "university", "foreign"] as const) {
    const pool = { ...nextPools[pt] };
    if (pool.candidatesHidden.length > 0) {
      const count = rng.int(3, 5);
      for (let i = 0; i < count; i++) {
        const cId = pool.candidatesHidden.shift();
        if (cId) {
          pool.candidatesVisible.push(cId);
        }
      }
    }
    nextPools[pt] = pool;
  }

  // 4. Update world state via impact
  builder.updateWorldField("talentPool", {
    ...tp,
    candidates: nextCandidates,
    pools: nextPools,
    playerScouting: nextScouting,
  });

  // 5. Periodic pool refresh logic (basho cadence)
  if (world.calendar && world.calendar.month % 2 !== 0 && world.calendar.currentDay === 1) {
    builder.merge(refreshAllPools(world));
  }

  return builder.build();
}
