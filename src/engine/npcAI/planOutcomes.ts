/**
 * planOutcomes.ts
 * ================
 * Scores archived strategic plans against real world-state movement.
 *
 * When a plan is created, `computePlanBaseline` snapshots the metrics the
 * plan claims to move. When the plan is replaced or expires,
 * `evaluatePlanOutcome` re-measures and classifies the outcome as
 * success / partial / abandoned. `scoreWithMemory` in StrategicPlanner then
 * penalizes templates that keep failing, and `computeStallPenalty` decays a
 * plan whose primary metric hasn't moved across a long weekly run.
 */

import type { AIPlan, OyakataMemory, PlanBaseline } from "../ai/types";
import type { WorldState } from "../types/world";
import type { Id } from "../types/common";
import type { RunwayBand } from "../types/narrative";
import { getHeya } from "../queries";
import { RANK_HIERARCHY } from "../types/banzuke";

export interface PlanOutcome {
  outcome: "success" | "partial" | "abandoned";
  summary: string;
}

const RUNWAY_ORDINAL: Record<RunwayBand, number> = {
  desperate: 0,
  critical: 1,
  tight: 2,
  comfortable: 3,
  secure: 4,
};

const HEALTHY_RUNWAY_ORDINAL = RUNWAY_ORDINAL.comfortable;
/** Heat drop required for rivalry_suppression to count as a full success. */
const RIVALRY_SUCCESS_DROP = 20;

function memberIds(world: WorldState, heyaId: Id): Set<Id> {
  return new Set(getHeya(world, heyaId)?.rikishiIds ?? []);
}

function countSekitori(world: WorldState, ids: Set<Id>): number {
  let count = 0;
  for (const id of ids) {
    const r = world.rikishi.get(id);
    if (r && !r.isRetired && RANK_HIERARCHY[r.rank]?.isSekitori) count++;
  }
  return count;
}

function maxRivalryHeat(world: WorldState, ids: Set<Id>): number {
  let max = 0;
  for (const pair of Object.values(world.rivalriesState?.pairs ?? {})) {
    if ((ids.has(pair.aId) || ids.has(pair.bId)) && pair.heat > max) {
      max = pair.heat;
    }
  }
  return max;
}

function countYushoWins(world: WorldState, ids: Set<Id>): number {
  let wins = 0;
  for (const basho of world.history ?? []) {
    if (ids.has(basho.yusho)) wins++;
  }
  return wins;
}

/** True when a heya rikishi currently leads the active basho standings. */
function heyaHasBashoLeader(world: WorldState, ids: Set<Id>): boolean {
  const standings = world.currentBasho?.standings;
  if (!standings || standings.size === 0) return false;
  let maxWins = 0;
  for (const rec of standings.values()) {
    if (rec.wins > maxWins) maxWins = rec.wins;
  }
  if (maxWins <= 0) return false;
  for (const id of ids) {
    if ((standings.get(id)?.wins ?? 0) === maxWins) return true;
  }
  return false;
}

/** Snapshot the metrics a plan claims to move, taken at plan creation. */
export function computePlanBaseline(world: WorldState, heyaId: Id): PlanBaseline {
  const heya = getHeya(world, heyaId);
  const ids = memberIds(world, heyaId);
  return {
    runwayOrdinal: RUNWAY_ORDINAL[heya?.runwayBand ?? "tight"] ?? RUNWAY_ORDINAL.tight,
    rosterSize: ids.size,
    sekitoriCount: countSekitori(world, ids),
    maxRivalryHeat: maxRivalryHeat(world, ids),
    yushoWins: countYushoWins(world, ids),
    politicalCapital: heya?.politicalCapital ?? 0,
    hasAcademy: !!heya?.youthAcademy,
  };
}

/**
 * The metric a plan is trying to move, as an ordinal where higher = better.
 * Recorded on each weekly decisionHistory entry for stall detection.
 */
export function planPrimaryMetricOrdinal(
  world: WorldState,
  heyaId: Id,
  planId: string | undefined
): number {
  const ids = memberIds(world, heyaId);
  switch (planId) {
    case "financial_consolidation":
      return RUNWAY_ORDINAL[getHeya(world, heyaId)?.runwayBand ?? "tight"] ?? 2;
    case "rebuilding":
      return countSekitori(world, ids);
    case "recruitment_blitz":
      return ids.size;
    case "rivalry_suppression":
      return 100 - maxRivalryHeat(world, ids);
    case "yokozuna_push":
      return countYushoWins(world, ids) * 10 + (heyaHasBashoLeader(world, ids) ? 5 : 0);
    case "kadoban_survival":
      return kadobanCount(world, ids) === 0 ? 1 : 0;
    case "yusho_defense":
      return countYushoWins(world, ids);
    case "faction_ascension":
      return Math.floor((getHeya(world, heyaId)?.politicalCapital ?? 0) / 10);
    case "talent_pipeline":
      return (getHeya(world, heyaId)?.youthAcademy ? 2 : 0) + countSekitori(world, ids);
    default:
      return countSekitori(world, ids);
  }
}

/** Number of heya rikishi currently kadoban. */
function kadobanCount(world: WorldState, ids: Set<Id>): number {
  let n = 0;
  for (const id of ids) {
    if (world.ozekiKadoban?.[id]?.isKadoban) n++;
  }
  return n;
}

/**
 * Score decay for a plan that has run ≥4 consecutive weeks without moving
 * its primary metric. Only the trailing same-plan run counts.
 */
export function computeStallPenalty(planId: string, memory: OyakataMemory): number {
  const history = memory.decisionHistory ?? [];
  let run = 0;
  let firstOrdinal: number | undefined;
  let lastOrdinal: number | undefined;
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i];
    if (entry.planId !== planId) break;
    run++;
    if (lastOrdinal === undefined) lastOrdinal = entry.metricOrdinal;
    firstOrdinal = entry.metricOrdinal;
  }
  if (run < 4) return 0;
  if (
    firstOrdinal !== undefined &&
    lastOrdinal !== undefined &&
    lastOrdinal > firstOrdinal
  ) {
    return 0;
  }
  return Math.min(run - 3, 4) * 4;
}

/** Classify a completed/replaced plan by comparing baseline to current state. */
export function evaluatePlanOutcome(
  world: WorldState,
  heyaId: Id,
  plan: AIPlan
): PlanOutcome {
  const base = plan.baseline;
  if (!base) {
    return {
      outcome: "abandoned",
      summary: `Plan ${plan.planId} ended without a recorded baseline.`,
    };
  }

  const ids = memberIds(world, heyaId);

  switch (plan.planId) {
    case "yokozuna_push": {
      if (countYushoWins(world, ids) > base.yushoWins) {
        return { outcome: "success", summary: "The stable produced a yusho winner." };
      }
      if (heyaHasBashoLeader(world, ids)) {
        return { outcome: "partial", summary: "A heya rikishi is leading the basho race." };
      }
      return { outcome: "abandoned", summary: "No title challenge materialized." };
    }
    case "financial_consolidation": {
      const current = RUNWAY_ORDINAL[getHeya(world, heyaId)?.runwayBand ?? "tight"] ?? 2;
      if (current > base.runwayOrdinal && current >= HEALTHY_RUNWAY_ORDINAL) {
        return { outcome: "success", summary: "Finances recovered to a healthy band." };
      }
      if (current > base.runwayOrdinal) {
        return { outcome: "partial", summary: "Finances improved but remain fragile." };
      }
      return { outcome: "abandoned", summary: "Runway did not improve." };
    }
    case "rebuilding": {
      const sekitori = countSekitori(world, ids);
      if (sekitori > base.sekitoriCount) {
        return { outcome: "success", summary: "New sekitori were developed." };
      }
      if (ids.size > base.rosterSize) {
        return { outcome: "partial", summary: "The roster grew but produced no new sekitori." };
      }
      return { outcome: "abandoned", summary: "The roster stagnated." };
    }
    case "rivalry_suppression": {
      const heat = maxRivalryHeat(world, ids);
      if (heat <= base.maxRivalryHeat - RIVALRY_SUCCESS_DROP) {
        return { outcome: "success", summary: "The heated rivalry cooled off." };
      }
      if (heat < base.maxRivalryHeat) {
        return { outcome: "partial", summary: "Rivalry heat is trending down." };
      }
      return { outcome: "abandoned", summary: "Rivalry heat did not drop." };
    }
    case "recruitment_blitz": {
      if (ids.size > base.rosterSize) {
        return { outcome: "success", summary: "The stable signed new recruits." };
      }
      return { outcome: "abandoned", summary: "No recruits were signed." };
    }
    case "kadoban_survival": {
      const stillKadoban = kadobanCount(world, ids);
      const ozekiLeft = [...ids].some(
        (id) => world.rikishi.get(id)?.rank === "ozeki"
      );
      if (stillKadoban === 0 && ozekiLeft) {
        return { outcome: "success", summary: "The Ozeki cleared kadoban status." };
      }
      if (stillKadoban > 0) {
        return { outcome: "partial", summary: "The Ozeki remains kadoban — fight continues." };
      }
      return { outcome: "abandoned", summary: "The Ozeki was lost before kadoban cleared." };
    }
    case "yusho_defense": {
      if (countYushoWins(world, ids) > base.yushoWins) {
        return { outcome: "success", summary: "The title was defended." };
      }
      if (heyaHasBashoLeader(world, ids)) {
        return { outcome: "partial", summary: "The champion remains in the title race." };
      }
      return { outcome: "abandoned", summary: "The title defense fizzled." };
    }
    case "faction_ascension": {
      const capital = getHeya(world, heyaId)?.politicalCapital ?? 0;
      const baseCapital = base.politicalCapital ?? 0;
      if (capital >= baseCapital + 20) {
        return { outcome: "success", summary: "Faction influence grew substantially." };
      }
      if (capital > baseCapital) {
        return { outcome: "partial", summary: "Political capital is trending upward." };
      }
      return { outcome: "abandoned", summary: "No faction ground was gained." };
    }
    case "talent_pipeline": {
      const heya = getHeya(world, heyaId);
      if (heya?.youthAcademy && !base.hasAcademy) {
        return { outcome: "success", summary: "A youth academy was established." };
      }
      if (countSekitori(world, ids) > base.sekitoriCount || ids.size > base.rosterSize) {
        return { outcome: "partial", summary: "The pipeline is producing bodies." };
      }
      return { outcome: "abandoned", summary: "No pipeline investment materialized." };
    }
    default:
      return { outcome: "partial", summary: "The plan ran its course without incident." };
  }
}
