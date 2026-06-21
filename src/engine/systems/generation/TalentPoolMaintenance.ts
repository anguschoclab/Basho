import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import type { WorldState } from "../../types/world";
import { ensureTalentPoolState, refreshAllPools } from "./TalentPoolStateService";
import { resolveCandidateSuitor } from "./TalentPoolOffers";
import { RNGRegistry } from "../../core/RNGRegistry";
import { computeReplacementGap } from "./RecruitmentController";

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
  // ⚡ Bolt Optimization: Replace Object.entries() with for...in loop to avoid O(N) tuple allocations
  for (const id in nextScouting) {
    if (!Object.prototype.hasOwnProperty.call(nextScouting, id)) continue;
    const record = nextScouting[id];
    if (world.week - record.lastScoutedWeek > 4) {
      nextScouting[id] = {
        ...record,
        scoutingLevel: Math.max(0, record.scoutingLevel - 2),
      };
    }
  }

  // 2. Resolve suitor deadlines
  // ⚡ Bolt Optimization: Replace Object.entries() with for...in loop to avoid O(N) tuple allocations
  for (const id in nextCandidates) {
    if (!Object.prototype.hasOwnProperty.call(nextCandidates, id)) continue;
    const candidate = nextCandidates[id];
    if (!candidate) continue;
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

  // 3. Passive Discovery: reveal candidates from hidden to visible pools every week.
  // Gap-aware: when the active population is below the equilibrium target, reveal
  // enough per pool to cover the weekly replacement gap (ceil(gap / 3) per pool × 3
  // pools ≥ gap). Falls back to the baseline 20-30 when at/above target.
  const nextPools = { ...tp.pools };
  const rng = RNGRegistry.getSystemRNG(world, "scouting", `discovery_${world.week}`);
  const gap = computeReplacementGap(world);
  const perPoolFloor = gap > 0 ? Math.ceil(gap / 3) : 0;

  for (const pt of ["high_school", "university", "foreign"] as const) {
    const pool = { ...nextPools[pt] };
    if (pool.candidatesHidden.length > 0) {
      const baseline = rng.int(20, 30);
      const count = Math.max(baseline, perPoolFloor);
      const bounded = Math.min(count, pool.candidatesHidden.length);
      for (let i = 0; i < bounded; i++) {
        const cId = pool.candidatesHidden.shift();
        if (cId) {
          pool.candidatesVisible.push(cId);
        }
      }
    }
    nextPools[pt] = pool;
  }

  // 4. Emergency demographic floor: dump all hidden candidates to visible so NPC recruitment can access them
  // Use active (non-retired) count — world.rikishi.size grows unbounded as retirees accumulate
  const population = world.activeRikishiIds.size;
  const isEmergency = population < 700;
  if (isEmergency) {
    for (const pt of ["high_school", "university", "foreign"] as const) {
      const pool = { ...nextPools[pt] };
      pool.candidatesVisible = [...pool.candidatesVisible, ...pool.candidatesHidden];
      pool.candidatesHidden = [];
      nextPools[pt] = pool;
    }
    console.log(
      `[RECRUITMENT] Emergency: moved all hidden candidates to visible. Active population: ${population}`
    );
  }

  // 5. Update world state via impact (incorporates passive discovery + emergency reveal)
  builder.updateWorldField("talentPool", {
    ...tp,
    candidates: nextCandidates,
    pools: nextPools,
    playerScouting: nextScouting,
  });

  // 6. Periodic pool refresh logic — every 2 weeks to keep candidates available
  // The old condition (month odd && day === 1) never fired because weekly ticks
  // always land on days 7, 14, 21, 28, 5, 12, … never on day 1.
  // world.week also never changes (phase00_preflight doesn't update it).
  // Use dayIndexGlobal which increments every day and is a multiple of 7 on weekly ticks.
  const dayIndex = world.dayIndexGlobal ?? 0;
  if (dayIndex > 0 && dayIndex % 14 === 0) {
    builder.merge(refreshAllPools(world));
  }

  return builder.build();
}
