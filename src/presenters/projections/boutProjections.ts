/**
 * boutProjections.ts
 *
 * Projections for bout preview, recruitment, and H2H data.
 * Extracted from uiDigest.ts to eliminate monolithic structure.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { WorldState } from "../../engine/types/world";
import type { BoutPreviewUI } from "../boutPreviewUI";
import { getH2HReport } from "../../engine/h2h";
import { RivalryService } from "../../engine/systems/narrative/RivalryService";
import { projectRikishi } from "../rikishiUI";
import * as talentpool from "../../engine/systems/generation/TalentPoolService";
import {
  warmScoutingForRikishiList,
  getOrCreateScouted,
  getScoutingLevel,
} from "../../engine/scoutingStore";
import { describeScoutingLevel, getScoutedAttributes } from "../../engine";
import { RANK_HIERARCHY } from "../../engine/banzuke";

/**
 * Build a BoutPreviewUI for the NHK-style pre-bout overlay.
 * Returns null if the bout or its participants cannot be found.
 */
export function buildBoutPreviewUI(boutId: string, world: WorldState): BoutPreviewUI | null {
  const match = world.currentBasho?.matches.find((m) => m.boutId === boutId);
  if (!match) return null;

  const east = world.rikishi.get(match.eastRikishiId);
  const west = world.rikishi.get(match.westRikishiId);
  if (!east || !west) return null;

  const rivalriesState = RivalryService.ensureRivalriesState(world);
  const key = RivalryService.makeRivalryKey(east.id, west.id);
  const rivalryHeat = rivalriesState.pairs[key]?.heat ?? 0;

  return {
    boutId,
    day: match.day ?? world.currentBasho?.day ?? 1,
    eastRikishi: projectRikishi(east, world),
    westRikishi: projectRikishi(west, world),
    h2hReport: getH2HReport(east, west),
    rivalryHeat,
  };
}

/**
 * Project recruitment data for ScoutingPage.
 */
export function projectRecruitmentUIDigest(
  world: WorldState,
  poolType: "high_school" | "university" | "foreign"
) {
  const candidates = talentpool.listVisibleCandidates(world, poolType).map((c) => {
    const scoutLevel = talentpool.getCandidateScoutingLevel(world, c.candidateId);
    return {
      ...c,
      scoutLevel,
      scoutInfo: describeScoutingLevel(scoutLevel),
    };
  });
  return { candidates };
}

/**
 * Project opponent scouting list for ScoutingPage.
 */
export function projectOpponentScoutingUIDigest(
  world: WorldState,
  playerHeyaId: string | null,
  filterDivision: string
) {
  const list: any[] = [];
  const seed = (world as any).seed || "default";

  for (const r of world.rikishi.values()) {
    if (r.isRetired) continue;
    if (r.heyaId === playerHeyaId) continue;
    if (filterDivision && r.division !== filterDivision) continue;

    const scouted = getOrCreateScouted(world, r.id);
    const scoutLevel = getScoutingLevel(world, r.id);
    const attrs = getScoutedAttributes(scouted, seed);
    const heya = world.heyas.get(r.heyaId);

    list.push({
      ...projectRikishi(r, world),
      scoutLevel,
      scoutInfo: describeScoutingLevel(scoutLevel),
      scoutedProgress: scouted.scoutingLevel,
      scoutingInvestment: scouted.scoutingInvestment,
      scoutedAttrs: attrs,
      heyaName: heya?.name ?? "Unknown Stable",
    });
  }

  list.sort((a, b) => {
    const ta = RANK_HIERARCHY[a.rank as import("../../engine/types/banzuke").Rank]?.tier ?? 99;
    const tb = RANK_HIERARCHY[b.rank as import("../../engine/types/banzuke").Rank]?.tier ?? 99;
    if (ta !== tb) return ta - tb;
    return (a.rankNumber ?? 0) - (b.rankNumber ?? 0);
  });

  const sliced = list.slice(0, 40);
  warmScoutingForRikishiList(
    world,
    sliced.map((r) => r.id)
  );

  return { opponents: sliced };
}

/** H2H matchup data between two rikishi */
export interface H2HMatchupData {
  rikishiAId: string;
  rikishiAName: string;
  rikishiBId: string;
  rikishiBName: string;
  aWins: number;
  bWins: number;
  lastKimarite?: string;
  lastWinner?: string;
}

/**
 * Build matchup data for H2H.
 */
function buildMatchupData(
  rAId: string,
  rA: { shikona: string },
  rBId: string,
  rB: { shikona: string },
  record: {
    wins: number;
    losses: number;
    lastMatch?: { kimarite?: string; winnerId?: string } | null;
  }
): H2HMatchupData {
  return {
    rikishiAId: rAId,
    rikishiAName: rA.shikona,
    rikishiBId: rBId,
    rikishiBName: rB.shikona,
    aWins: record.wins,
    bWins: record.losses,
    lastKimarite: record.lastMatch?.kimarite,
    lastWinner: record.lastMatch?.winnerId === rAId ? rA.shikona : rB.shikona,
  };
}

/**
 * Calculate heya matchups.
 */
function calculateHeyaMatchups(
  world: WorldState,
  rikishiAIds: string[],
  rikishiBIds: string[]
): { winsA: number; winsB: number; matchups: H2HMatchupData[] } {
  let winsA = 0;
  let winsB = 0;
  const matchups: H2HMatchupData[] = [];

  for (const rAId of rikishiAIds) {
    const rA = world.rikishi.get(rAId);
    if (!rA?.h2h) continue;

    for (const rBId of rikishiBIds) {
      const record = rA.h2h[rBId];
      if (!record || (record.wins === 0 && record.losses === 0)) continue;

      const rB = world.rikishi.get(rBId);
      if (!rB) continue;

      winsA += record.wins;
      winsB += record.losses;
      matchups.push(buildMatchupData(rAId, rA, rBId, rB, record));
    }
  }

  return { winsA, winsB, matchups };
}

/**
 * Project H2H history between two stables for PerceptionOverview.
 */
export function projectH2HBetweenHeyas(world: WorldState, heyaAId: string, heyaBId: string) {
  const heyaA = world.heyas.get(heyaAId);
  const heyaB = world.heyas.get(heyaBId);
  if (!heyaA || !heyaB) return null;

  const rikishiAIds = heyaA.rikishiIds || [];
  const rikishiBIds = heyaB.rikishiIds || [];

  const { winsA, winsB, matchups } = calculateHeyaMatchups(world, rikishiAIds, rikishiBIds);
  matchups.sort((a, b) => b.aWins + b.bWins - (a.aWins + a.bWins));

  return {
    heyaAName: heyaA.name,
    heyaBName: heyaB.name,
    winsA,
    winsB,
    totalBouts: winsA + winsB,
    matchups,
  };
}
