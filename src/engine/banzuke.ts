/**
 * Banzuke (Ranking) System — Modularized Version
 * This file serves as the main entry point for banzuke updates and ranking logic.
 */

import { stableTieBreak } from "./utils/sort";
import { RANK_HIERARCHY, type Division, type RankPosition, type BanzukeEntry, type BashoPerformance, type MovementEvent } from "./types/banzuke";
export type { BanzukeEntry, BashoPerformance };
import type { Rikishi } from "./types/rikishi";
import type { Heya } from "./types/heya";

// Re-export helpers and local logic
export * from "./banzuke/banzukeHelpers";
export * from "./banzuke/ozekiLogic";
export * from "./banzuke/specialPrizes";
export { RANK_HIERARCHY };

import { compareRanks, formatRank, kachiKoshiThreshold } from "./banzuke/banzukeHelpers";
import { getOzekiStatus, type OzekiKadobanMap } from "./banzuke/ozekiLogic";
import { computeMovementUnits, bestTierAllowed } from "./banzuke/promotionLogic";
import { buildFullSlotTemplate } from "./banzuke/banzukeTemplate";

/** Defines the structure for banzuke update result. */
interface BanzukeUpdateResult {
  newBanzuke: BanzukeEntry[];
  events: MovementEvent[];
  updatedOzekiKadoban: OzekiKadobanMap;
  sanyakuCounts: {
    yokozuna: number;
    ozeki: number;
    sekiwake: number;
    komusubi: number;
    maegashira: number;
  };
}

/** Helper to generate a unique key for a position for sorting. */
function positionKey(e: BanzukeEntry): number {
  const tier = RANK_HIERARCHY[e.position.rank].tier;
  const num = e.position.rankNumber ?? 0;
  const side = e.position.side === "east" ? 0 : 1;
  return tier * 1000 + num * 2 + side;
}

/** Helper to determine division tier (lower is better). */
function divisionTier(d: Division): number {
  switch (d) {
    case "makuuchi": return 1;
    case "juryo": return 2;
    case "makushita": return 3;
    case "sandanme": return 4;
    case "jonidan": return 5;
    case "jonokuchi": return 6;
  }
}

/**
 * Main entrance to update the entire banzuke after a tournament.
 */
export function updateBanzuke(
  currentBanzuke: BanzukeEntry[],
  perfById: Map<string, BashoPerformance>,
  previousOzekiKadoban: OzekiKadobanMap = {},
  heyaMap?: Map<string, Heya>
): BanzukeUpdateResult {
  const updatedOzekiKadoban: OzekiKadobanMap = { ...previousOzekiKadoban };
  const demotedOzeki = new Set<string>();

  for (const e of currentBanzuke) {
    if (e.position.rank !== "ozeki") continue;
    const p = perfById.get(e.rikishiId);
    const next = getOzekiStatus(p?.wins ?? 0, p?.losses ?? 0, p?.absences ?? 0, previousOzekiKadoban[e.rikishiId]);
    updatedOzekiKadoban[e.rikishiId] = next;
    if (next.consecutiveMakeKoshi >= 2) demotedOzeki.add(e.rikishiId);
  }

  const sanyakuCounts = computeVariableSanyakuCounts(currentBanzuke, perfById, demotedOzeki);
  const fullTemplate = buildFullSlotTemplate(sanyakuCounts, {
    makuuchi: 42, juryo: 28, makushita: 60, sandanme: 50, jonidan: 40, jonokuchi: 20
  });

  // Assign candidates to slots
  const scored = currentBanzuke.map((e) => {
    const p = perfById.get(e.rikishiId);
    const move = computeMovementUnits(e, p, demotedOzeki);
    
    let politicalWeight = 0;
    if (heyaMap && e.rikishiId) {
       const heya = Array.from(heyaMap.values()).find(h => h.rikishiIds?.includes(e.rikishiId));
       if (heya?.ichimon === "Dewanoumi") politicalWeight = 300;
       else if (heya?.ichimon === "Nishonoseki") politicalWeight = 250;
       else if (heya?.ichimon) politicalWeight = 100;
    }

    const oldKey = positionKey(e);
    const desiredKey = oldKey - (move * 1_000) - politicalWeight;
    return { entry: e, oldKey, desiredKey, eligibleBestTier: bestTierAllowed(e, p, updatedOzekiKadoban[e.rikishiId], demotedOzeki) };
  }).sort((a, b) => a.desiredKey !== b.desiredKey ? a.desiredKey - b.desiredKey : (a.oldKey !== b.oldKey ? a.oldKey - b.oldKey : stableTieBreak(a.entry.rikishiId, b.entry.rikishiId)));

  const assigned: BanzukeEntry[] = [];
  const used = new Set<string>();

  for (const slot of fullTemplate) {
    const idx = scored.findIndex(cand => !used.has(cand.entry.rikishiId) && RANK_HIERARCHY[slot.position.rank].tier >= cand.eligibleBestTier);
    if (idx !== -1) {
      const winner = scored.splice(idx, 1)[0];
      used.add(winner.entry.rikishiId);
      assigned.push({ ...winner.entry, division: slot.division, position: slot.position });
    }
  }

  const events: MovementEvent[] = banzukeMovementEvents(currentBanzuke, assigned, updatedOzekiKadoban, previousOzekiKadoban);
  return { newBanzuke: assigned, events, updatedOzekiKadoban, sanyakuCounts };
}

function banzukeMovementEvents(old: BanzukeEntry[], assigned: BanzukeEntry[], nextOzeki: OzekiKadobanMap, prevOzeki: OzekiKadobanMap): MovementEvent[] {
  const events: MovementEvent[] = [];
  const oldById = new Map(old.map(e => [e.rikishiId, e]));

  for (const e of assigned) {
    const o = oldById.get(e.rikishiId);
    if (!o) continue;
    const from = `${o.division}:${formatRank(o.position)}`;
    const to = `${e.division}:${formatRank(e.position)}`;
    if (from === to) continue;

    const fromTier = RANK_HIERARCHY[o.position.rank].tier;
    const toTier = RANK_HIERARCHY[e.position.rank].tier;
    let kind: MovementEvent["kind"] = "lateral";
    if (toTier < fromTier || divisionTier(e.division) < divisionTier(o.division)) kind = "promotion";
    else if (toTier > fromTier || divisionTier(e.division) > divisionTier(o.division)) kind = "demotion";

    events.push({ rikishiId: e.rikishiId, from, to, kind, description: `${kind === "promotion" ? "Promoted" : (kind === "demotion" ? "Demoted" : "Moved")}: ${from} → ${to}` });
  }

  for (const [id, state] of Object.entries(nextOzeki)) {
    const oldState = prevOzeki[id];
    if (!oldState || (oldState.isKadoban === state.isKadoban && oldState.consecutiveMakeKoshi === state.consecutiveMakeKoshi)) continue;
    events.push({ rikishiId: id, from: `kadoban:${oldState.isKadoban}`, to: `kadoban:${state.isKadoban}`, kind: "status", description: state.consecutiveMakeKoshi >= 2 ? "Ozeki demoted." : (state.isKadoban ? "Kadoban status set." : "Kadoban status cleared.") });
  }
  return events;
}

function computeVariableSanyakuCounts(current: BanzukeEntry[], perfById: Map<string, BashoPerformance>, demoted: Set<string>): BanzukeUpdateResult["sanyakuCounts"] {
  const m = current.filter(e => e.division === "makuuchi");
  const yCount = Math.min(6, m.filter(e => e.position.rank === "yokozuna").length + m.filter(e => e.position.rank === "ozeki" && !!perfById.get(e.rikishiId)?.promoteToYokozuna).length);
  let oCount = Math.max(2, m.filter(e => e.position.rank === "ozeki" && !demoted.has(e.rikishiId)).length + m.filter(e => e.position.rank === "sekiwake" && (perfById.get(e.rikishiId)?.wins ?? 0) >= 11).length);
  let sCount = Math.max(2, Math.min(6, 2 + demoted.size + m.filter(e => e.position.rank === "komusubi" && (perfById.get(e.rikishiId)?.wins ?? 0) >= 10).length));
  let kCount = Math.max(2, Math.min(6, 2 + m.filter(e => e.position.rank === "maegashira" && (!!perfById.get(e.rikishiId)?.yusho || ((e.position.rankNumber ?? 99) <= 4 && (perfById.get(e.rikishiId)?.wins ?? 0) >= 10))).length));

  // Balanced trim if needed
  while (yCount + oCount + sCount + kCount > 20) {
    if (kCount > 2) kCount--; else if (sCount > 2) sCount--; else if (oCount > 2) oCount--; else break;
  }

  return { yokozuna: yCount, ozeki: oCount, sekiwake: sCount, komusubi: kCount, maegashira: Math.max(0, 42 - (yCount+oCount+sCount+kCount)) };
}
