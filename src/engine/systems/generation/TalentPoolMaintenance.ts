import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import type { WorldState } from "../../types/world";
import { ensureTalentPoolState, refreshAllPools } from "./TalentPoolStateService";
import { resolveCandidateSuitor } from "./TalentPoolOffers";

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
