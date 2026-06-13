/**
 * scoutingProjections.ts
 *
 * Scouting & intelligence summary projection.
 */

import type { WorldState } from "../../engine/types/world";
import { EntityCollection } from "../../engine/core/EntityCollection";
import { buildPerceptionSnapshot } from "../uiDigest";

export interface ScoutingOpponentSnap {
  heyaId: string;
  heyaName: string;
  rosterStrengthBand: string;
  statureBand: string;
  mediaHeatBand: string;
  welfareRiskBand: string;
  isPlayer: boolean;
}

export interface ScoutingSummary {
  opponentSnaps: ScoutingOpponentSnap[];
  totalHeyas: number;
  dominantCount: number;
  weakCount: number;
}

export function projectScoutingSummary(world: WorldState): ScoutingSummary {
  const snaps: ScoutingOpponentSnap[] = [];
  const playerHeyaId = world.playerHeyaId;
  let dominantCount = 0;
  let weakCount = 0;

  for (const heya of EntityCollection.getHeyas(world)) {
    if ((heya.rikishiIds?.length ?? 0) === 0) continue;
    const snap = buildPerceptionSnapshot(world, heya.id);
    snaps.push({
      heyaId: heya.id,
      heyaName: heya.name,
      rosterStrengthBand: snap.rosterStrengthBand,
      statureBand: snap.statureBand,
      mediaHeatBand: snap.stableMediaHeatBand,
      welfareRiskBand: snap.welfareRiskBand,
      isPlayer: heya.id === playerHeyaId,
    });
    if (snap.rosterStrengthBand === "dominant") dominantCount++;
    if (snap.rosterStrengthBand === "weak") weakCount++;
  }

  snaps.sort((a, b) => {
    if (a.isPlayer !== b.isPlayer) return a.isPlayer ? -1 : 1;
    const order = ["dominant", "strong", "competitive", "developing", "weak"];
    return order.indexOf(a.rosterStrengthBand) - order.indexOf(b.rosterStrengthBand);
  });

  return {
    opponentSnaps: snaps,
    totalHeyas: snaps.length,
    dominantCount,
    weakCount,
  };
}
