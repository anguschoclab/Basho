/**
 * boutProjections.ts
 *
 * Projections for bout preview, recruitment, and H2H data.
 * Extracted from uiDigest.ts to eliminate monolithic structure.
 */

import type { WorldState } from "../../engine/types/world";
import type { Rank } from "../../engine/types/banzuke";
import type { TalentCandidate } from "../../engine/types/talent";
import { RANK_HIERARCHY } from "../../engine/banzuke";
import type { BoutPreviewUI } from "../boutPreviewUI";
import type { UIRikishi } from "../rikishi";
import { getH2HReport } from "../../engine/h2h";
import { RivalryService } from "../../engine/systems/narrative/RivalryService";
import { projectRikishi } from "../rikishi";
import * as talentpool from "../../engine/systems/generation/TalentPoolService";
import {
  warmScoutingForRikishiList,
  getOrCreateScouted,
  getScoutingLevel,
} from "../../engine/scoutingStore";
import { getScoutedAttributes } from "../../engine/systems/recruitment/ScoutingService";
import { EntityCollection } from "../../engine/core/EntityCollection";

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

/** Extended talent candidate with scouting information */
export interface CandidateDigestEntry extends TalentCandidate {
  scoutLevel: number;
  scoutInfo: { label: string; color: string; narrative: string };
  scoutedProgress?: number;
  scoutingInvestment?: string;
  /**
   * Whether the candidate's scouting view is still biased by initial misvaluation.
   * When true, displayed stats may be inaccurate by ±20 points.
   */
  hasBias?: boolean;
  /**
   * Strength of remaining scouting bias (0.0 = no bias, 1.0 = full bias).
   * Decays as scouting observations accumulate.
   */
  biasStrength?: number;
}

/** Recruitment digest returned by projectRecruitmentUIDigest */
export interface RecruitmentUIDigest {
  candidates: CandidateDigestEntry[];
}

export function getScoutInfo(level: number): { label: string; color: string; narrative: string } {
  if (level >= 90) {
    return { label: "Exhaustive", color: "text-emerald-500", narrative: "Fully scouted." };
  }
  if (level >= 70) {
    return { label: "Professional", color: "text-blue-500", narrative: "Deep scouting report." };
  }
  if (level >= 45) {
    return {
      label: "Detailed",
      color: "text-amber-500",
      narrative: "Solid amount of observations.",
    };
  }
  if (level >= 20) {
    return {
      label: "Observation",
      color: "text-orange-500",
      narrative: "A few basic matches observed.",
    };
  }
  return { label: "Snapshot", color: "text-gray-500", narrative: "Initial estimate only." };
}

/**
 * Project recruitment data for ScoutingPage.
 */
export function projectRecruitmentUIDigest(
  world: WorldState,
  poolType: "high_school" | "university" | "foreign"
): RecruitmentUIDigest {
  const candidates = talentpool.listVisibleCandidates(world, poolType).map((c) => {
    const scoutLevel = talentpool.getCandidateScoutingLevel(world, c.candidateId);
    const scoutedView = talentpool.getScoutedCandidateView(world, c.candidateId);
    return {
      ...c,
      scoutLevel,
      scoutInfo: getScoutInfo(scoutLevel),
      hasBias: scoutedView?.hasBias,
      biasStrength: scoutedView?.biasStrength,
    };
  });
  return { candidates };
}

/**
 * Project opponent scouting list for ScoutingPage.
 */
export interface ScoutedAttr {
  value: string;
  confidence: string;
  narrative: string;
}
export function projectOpponentScoutingUIDigest(
  world: WorldState,
  playerHeyaId: string | null,
  filterDivision: string
) {
  const list: Array<
    UIRikishi & {
      scoutLevel: number;
      scoutInfo: { label: string; color: string; narrative: string };
      scoutedProgress: number;
      scoutingInvestment: string;
      scoutedAttrs: Record<string, ScoutedAttr>;
      heyaName: string;
    }
  > = [];
  const seed = world.seed || "default";

  for (const r of EntityCollection.getActiveRikishi(world)) {
    if (r.heyaId === playerHeyaId) continue;
    if (filterDivision && r.division !== filterDivision) continue;

    const scouted = getOrCreateScouted(world, r.id);
    const scoutLevel = getScoutingLevel(world, r.id);
    const attrs = getScoutedAttributes(scouted, seed) as unknown as Record<string, ScoutedAttr>;
    const heya = world.heyas.get(r.heyaId);

    list.push({
      ...projectRikishi(r, world),
      scoutLevel,
      scoutInfo: getScoutInfo(scoutLevel),
      scoutedProgress: scouted.scoutingLevel ?? 0,
      scoutingInvestment: scouted.scoutingInvestment,
      scoutedAttrs: attrs,
      heyaName: heya?.name ?? "Unknown Stable",
    });
  }

  list.sort((a, b) => {
    const ta = (RANK_HIERARCHY as Record<string, { tier: number }>)[a.rank as Rank]?.tier ?? 99;
    const tb = (RANK_HIERARCHY as Record<string, { tier: number }>)[b.rank as Rank]?.tier ?? 99;
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

  // ⚡ Bolt Optimization: Build a Set from rikishiBIds once (O(M)), then iterate only the
  // actual H2H entries on each rA (O(K) where K << M). Avoids the O(N×M) full-roster scan.
  const bIdSet = new Set(rikishiBIds);

  for (const rAId of rikishiAIds) {
    const rA = world.rikishi.get(rAId);
    if (!rA?.h2h) continue;

    for (const rBId in rA.h2h) {
      if (!Object.prototype.hasOwnProperty.call(rA.h2h, rBId)) continue;
      const record = rA.h2h[rBId];
      if (!bIdSet.has(rBId)) continue;
      if (record.wins === 0 && record.losses === 0) continue;

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
