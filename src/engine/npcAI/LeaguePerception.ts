/**
 * LeaguePerception.ts
 * ===================
 * Builds a league-wide derived view from the current WorldState.
 * The output is intentionally banded/derived (no hidden raw values) so it can
 * be used by NPC and player strategic planners without leaking cheat information.
 */

import type { WorldState } from "../types/world";
import type { Rikishi } from "../types/rikishi";
import type { Id } from "../types/common";
import type {
  DivisionPressure,
  LeaguePerception,
  YushoRaceSnapshot,
  RivalryCluster,
} from "../ai/types";
import { getRikishi } from "../queries";

const ACTIVE_DIVISIONS = [
  "makuuchi",
  "juryo",
  "makushita",
  "sandanme",
  "jonidan",
  "jonokuchi",
] as const;

function getStanding(
  world: WorldState,
  rikishiId: Id
): { wins: number; losses: number } | undefined {
  return world.currentBasho?.standings?.get(rikishiId);
}

function activeRikishiInDivision(world: WorldState, division: string): Rikishi[] {
  const out: Rikishi[] = [];
  for (const id of world.activeRikishiIds) {
    const r = getRikishi(world, id);
    if (r && !r.isRetired && r.division === division) out.push(r);
  }
  return out;
}

function buildDivisionPressure(
  world: WorldState,
  division: string
): DivisionPressure {
  const basho = world.currentBasho;
  const rikishi = activeRikishiInDivision(world, division);
  const withRecords = [];
  for (const r of rikishi) {
    const st = getStanding(world, r.id);
    const wins = st?.wins ?? 0;
    const losses = st?.losses ?? 0;
    if (wins > 0 || losses > 0) {
      withRecords.push({
        rikishiId: r.id,
        shikona: r.shikona,
        wins,
        losses,
      });
    }
  }

  const sorted = [...withRecords].sort((a, b) => {
    const netA = a.wins - a.losses;
    const netB = b.wins - b.losses;
    if (netB !== netA) return netB - netA;
    return b.wins - a.wins;
  });

  const daysRemaining = basho ? Math.max(0, 15 - basho.day) : 0;
  const leaders = sorted.slice(0, 3);
  const relegationLine = sorted.slice(-3);
  const topWinRate = leaders[0]?.wins ?? 0;
  const secondWinRate = leaders[1]?.wins ?? -1;
  const hasActiveYushoRace =
    sorted.length > 0 && daysRemaining > 0 && topWinRate - secondWinRate <= 1;

  return {
    division,
    leaders,
    relegationLine,
    hasActiveYushoRace,
    daysRemaining,
  };
}

function buildYushoRace(world: WorldState): YushoRaceSnapshot {
  const basho = world.currentBasho;
  if (!basho || world.cyclePhase !== "active_basho") {
    return { leaders: [], isClinched: false };
  }

  const leaders: YushoRaceSnapshot["leaders"] = [];
  for (const [rikishiId, record] of basho.standings.entries()) {
    const r = getRikishi(world, rikishiId);
    if (!r || r.division !== "makuuchi") continue;
    if (record.wins === 0 && record.losses === 0) continue;
    leaders.push({
      rikishiId,
      shikona: r.shikona,
      wins: record.wins,
      losses: record.losses,
    });
  }

  leaders.sort((a, b) => {
    const netA = a.wins - a.losses;
    const netB = b.wins - b.losses;
    if (netB !== netA) return netB - netA;
    return b.wins - a.wins;
  });

  const top = leaders[0];
  const isClinched =
    basho.day >= 15 &&
    top !== undefined &&
    leaders.slice(1).every((l) => l.wins < top.wins);

  return { leaders: leaders.slice(0, 3), isClinched };
}

function buildFinanciallyFragileHeyas(world: WorldState): Id[] {
  const ids: Id[] = [];
  if (world.perceptionCache) {
    for (const [heyaId, snapshot] of Object.entries(world.perceptionCache)) {
      if (snapshot.runwayBand === "desperate" || snapshot.runwayBand === "critical") {
        ids.push(heyaId);
      }
    }
  }
  // Fallback heuristic when perception cache is missing.
  if (ids.length === 0) {
    for (const [heyaId, heya] of world.heyas.entries()) {
      const monthlyBurn = 5_000_000; // rough default
      const runwayMonths = (heya.funds ?? 0) / monthlyBurn;
      if (runwayMonths < 2) ids.push(heyaId);
    }
  }
  return ids;
}

function buildRivalryClusters(world: WorldState): RivalryCluster[] {
  const clusters: Record<Id, RivalryCluster> = {};
  if (!world.rivalriesState?.pairs) return [];

  for (const pair of Object.values(world.rivalriesState.pairs)) {
    if (pair.heat < 40) continue;
    if (!clusters[pair.aId]) {
      clusters[pair.aId] = { keyRikishiId: pair.aId, rivalIds: [], averageHeat: 0 };
    }
    if (!clusters[pair.aId].rivalIds.includes(pair.bId)) {
      clusters[pair.aId].rivalIds.push(pair.bId);
      clusters[pair.aId].averageHeat += pair.heat;
    }

    if (!clusters[pair.bId]) {
      clusters[pair.bId] = { keyRikishiId: pair.bId, rivalIds: [], averageHeat: 0 };
    }
    if (!clusters[pair.bId].rivalIds.includes(pair.aId)) {
      clusters[pair.bId].rivalIds.push(pair.aId);
      clusters[pair.bId].averageHeat += pair.heat;
    }
  }

  const result: RivalryCluster[] = [];
  for (const c of Object.values(clusters)) {
    result.push({
      ...c,
      averageHeat: c.rivalIds.length ? c.averageHeat / c.rivalIds.length : 0,
    });
  }
  return result.sort((a, b) => b.averageHeat - a.averageHeat);
}

function topRecruitAvailable(world: WorldState): boolean {
  if (!world.talentPool?.candidates) return false;
  return Object.values(world.talentPool.candidates).some(
    (c) => c.isEmergentProdigy || c.tags?.includes("amateur_star")
  );
}

export function emptyLeaguePerception(world: WorldState): LeaguePerception {
  return {
    generatedAtWeek: world.week,
    generatedAtYear: world.year,
    divisionPressures: {},
    yushoRace: { leaders: [], isClinched: false },
    financiallyFragileHeyas: [],
    rivalryClusters: [],
    topRecruitAvailable: false,
  };
}

/**
 * Build a league-wide perception snapshot.
 * Safe to call outside active basho (returns empty pressure data).
 */
export function buildLeaguePerception(world: WorldState): LeaguePerception {
  const divisionPressures: Record<string, DivisionPressure> = {};
  for (const division of ACTIVE_DIVISIONS) {
    divisionPressures[division] = buildDivisionPressure(world, division);
  }

  return {
    generatedAtWeek: world.week,
    generatedAtYear: world.year,
    divisionPressures,
    yushoRace: buildYushoRace(world),
    financiallyFragileHeyas: buildFinanciallyFragileHeyas(world),
    rivalryClusters: buildRivalryClusters(world),
    topRecruitAvailable: topRecruitAvailable(world),
  };
}
