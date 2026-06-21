/**
 * Banzuke (Ranking) System — Modularized Version
 * This file serves as the main entry point for banzuke updates and ranking logic.
 */

import {
  RANK_HIERARCHY,
  type Division,
  type RankPosition,
  type BanzukeEntry,
  type BashoPerformance,
  type MovementEvent,
  type BanzukeSnapshot,
} from "./types/banzuke";
export type { BanzukeEntry, BashoPerformance };
import type { Rikishi } from "./types/rikishi";
import type { Heya } from "./types/heya";

interface BanzukeChange {
  rikishiId: string;
  oldPosition: RankPosition | null;
  newPosition: RankPosition;
  change: "up" | "down" | "none" | "new";
}

// Re-export helpers and local logic
export * from "./banzuke/banzukeHelpers";
export * from "./banzuke/ozekiLogic";
export * from "./banzuke/specialPrizes";
export { RANK_HIERARCHY };
export { generateSanshoLedgerEntry } from "./economics_awards";
export { generateKeshoForPromotions } from "./systems/keshoMawashi/KeshoMawashiGenerator";

import { formatRank, resolveBanzukeTie, type BanzukeCandidate } from "./banzuke/banzukeHelpers";
import type { WorldState } from "./types/world";
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

/**
 * Generates a unique numeric key for a banzuke entry to facilitate sorting.
 * The key is derived from tier, rank number, and side (East/West).
 *
 * @param {BanzukeEntry} e - The banzuke entry.
 * @returns {number} A numeric sort key (lower is better).
 */
function positionKey(e: BanzukeEntry): number {
  const tier = RANK_HIERARCHY[e.position.rank].tier;
  const num = e.position.rankNumber ?? 0;
  const side = e.position.side === "east" ? 0 : 1;
  return tier * 1000 + num * 2 + side;
}

/**
 * Compares the current banzuke snapshot with a previous one to detect rank changes (up/down/new).
 * Returns a list of changes sorted by significance (Sanyaku changes first).
 *
 * @param {BanzukeSnapshot} currentSnapshot - The current banzuke state.
 * @param {BanzukeSnapshot | null} previousSnapshot - The previous banzuke state.
 * @param {Map<string, Rikishi>} rikishiMap - Map of rikishi details for retirement checks.
 * @returns {BanzukeChange[]} Array of detected rank changes.
 */
export function compareBanzuke(
  currentSnapshot: BanzukeSnapshot,
  previousSnapshot: BanzukeSnapshot | null,
  rikishiMap: Map<string, Rikishi>
): BanzukeChange[] {
  const changes: BanzukeChange[] = [];

  // Build a map of rikishiId -> previous position
  const previousPositions = new Map<string, RankPosition>();
  const previousDivisions = new Map<string, Division>();

  if (previousSnapshot) {
    for (const [divKey, divSnapshot] of Object.entries(previousSnapshot.divisions)) {
      for (const assignment of divSnapshot.assignments) {
        previousPositions.set(assignment.rikishiId, assignment.position);
        previousDivisions.set(assignment.rikishiId, divKey as Division);
      }
    }
  }

  for (const [divKey, divSnapshot] of Object.entries(currentSnapshot.divisions)) {
    for (const assignment of divSnapshot.assignments) {
      const rikishi = rikishiMap.get(assignment.rikishiId);
      if (!rikishi || rikishi.isRetired) continue;

      const previousPosition = previousPositions.get(assignment.rikishiId);
      const previousDivision = previousDivisions.get(assignment.rikishiId);

      let change: "up" | "down" | "none" | "new" = "none";

      if (!previousPosition) {
        change = "new";
      } else {
        // Compare using RANK_HIERARCHY tier
        const currentTier = RANK_HIERARCHY[assignment.position.rank].tier;
        const previousTier = RANK_HIERARCHY[previousPosition.rank].tier;

        if (currentTier < previousTier) {
          change = "up";
        } else if (currentTier > previousTier) {
          change = "down";
        } else if (previousDivision && previousDivision !== (divKey as Division)) {
          // Same tier but different division - treat as division_change
          change = "none"; // Will be handled as division_change in transformation
        }
      }

      changes.push({
        rikishiId: assignment.rikishiId,
        oldPosition: previousPosition || null,
        newPosition: assignment.position,
        change,
      });
    }
  }

  // Sort by significance: sanyaku changes > major promotions > demotions > no change > new
  changes.sort((a, b) => {
    const isSanyaku = (pos: RankPosition | null) =>
      pos && ["yokozuna", "ozeki", "sekiwake", "komusubi"].includes(pos.rank);
    const aSanyaku = isSanyaku(a.newPosition) || isSanyaku(a.oldPosition);
    const bSanyaku = isSanyaku(b.newPosition) || isSanyaku(b.oldPosition);

    if (aSanyaku && !bSanyaku) return -1;
    if (!aSanyaku && bSanyaku) return 1;

    const changeOrder = { up: 0, new: 1, down: 2, none: 3 };
    return changeOrder[a.change] - changeOrder[b.change];
  });

  return changes;
}

/** Helper to determine division tier (lower is better). */
const DIVISION_TIER_MAP: Record<Division, number> = {
  makuuchi: 1,
  juryo: 2,
  makushita: 3,
  sandanme: 4,
  jonidan: 5,
  jonokuchi: 6,
};

function divisionTier(d: Division): number {
  return DIVISION_TIER_MAP[d];
}

/**
 * Main entry point for updating the entire banzuke hierarchy after a tournament.
 * Calculates promotions, demotions, Ozeki status, and assigns rikishi to available slots.
 *
 * @param {BanzukeEntry[]} currentBanzuke - The banzuke as it stood during the tournament.
 * @param {Map<string, BashoPerformance>} perfById - Map of rikishi performances in the last basho.
 * @param {WorldState} world - The current global world state.
 * @param {OzekiKadobanMap} [previousOzekiKadoban={}] - Map of Ozeki kadoban statuses from the previous cycle.
 * @param {Map<string, Heya>} [heyaMap] - Optional map of heya for political weight calculations.
 * @returns {BanzukeUpdateResult} The results of the banzuke update including the new roster and events.
 */
export function updateBanzuke(
  currentBanzuke: BanzukeEntry[],
  perfById: Map<string, BashoPerformance>,
  world: WorldState,
  previousOzekiKadoban: OzekiKadobanMap = {},
  heyaMap?: Map<string, Heya>
): BanzukeUpdateResult {
  const updatedOzekiKadoban: OzekiKadobanMap = { ...previousOzekiKadoban };
  const demotedOzeki = new Set<string>();

  for (const e of currentBanzuke) {
    if (e.position.rank !== "ozeki") continue;
    const p = perfById.get(e.rikishiId);
    const next = getOzekiStatus(
      p?.wins ?? 0,
      p?.losses ?? 0,
      p?.absences ?? 0,
      previousOzekiKadoban[e.rikishiId]
    );
    updatedOzekiKadoban[e.rikishiId] = next;
    if (next.consecutiveMakeKoshi >= 2) demotedOzeki.add(e.rikishiId);
  }

  const sanyakuCounts = computeVariableSanyakuCounts(currentBanzuke, perfById, demotedOzeki);

  // Dynamic division capacity: scale lower divisions to the active field so no
  // rikishi is frozen out of the banzuke. Makuuchi (42) and juryo (28) are fixed
  // (sekitori tiers); the remaining population is distributed across makushita,
  // sandanme, jonidan, and jonokuchi (the overflow safety net).
  const fieldSize = currentBanzuke.length;
  const elite = 42 + 28; // makuuchi + juryo fixed
  const lowerPopulation = Math.max(0, fieldSize - elite);
  const HEADROOM = 8;
  const makushita = Math.max(60, Math.ceil(lowerPopulation * 0.18) + HEADROOM);
  const sandanme = Math.max(60, Math.ceil(lowerPopulation * 0.24) + HEADROOM);
  const jonidan = Math.max(60, Math.ceil(lowerPopulation * 0.28) + HEADROOM);
  const jonokuchi =
    Math.max(40, lowerPopulation - (makushita + sandanme + jonidan)) + HEADROOM;
  const fullTemplate = buildFullSlotTemplate(sanyakuCounts, {
    makuuchi: 42,
    juryo: 28,
    makushita,
    sandanme,
    jonidan,
    jonokuchi,
  });

  // ⚡ Bolt Optimization: Pre-calculate rikishi to heya mapping to avoid O(N*M) nested lookups
  const rikishiToHeyaMap = new Map<string, Heya>();
  if (heyaMap) {
    for (const heya of heyaMap.values()) {
      if (heya.rikishiIds) {
        for (const rId of heya.rikishiIds) {
          rikishiToHeyaMap.set(rId, heya);
        }
      }
    }
  }

  // Assign candidates to slots
  const scored = currentBanzuke
    .map((e) => {
      const p = perfById.get(e.rikishiId);
      const move = computeMovementUnits(e, p, demotedOzeki);

      let politicalWeight = 0;
      if (heyaMap && e.rikishiId) {
        const heya = rikishiToHeyaMap.get(e.rikishiId);
        if (heya?.ichimon === "Dewanoumi") politicalWeight = 300;
        else if (heya?.ichimon === "Nishonoseki") politicalWeight = 250;
        else if (heya?.ichimon) politicalWeight = 100;
      }

      const oldKey = positionKey(e);
      const desiredKey = oldKey - move * 1_000 - politicalWeight;
      return {
        entry: e,
        oldKey,
        desiredKey,
        eligibleBestTier: bestTierAllowed(e, p, updatedOzekiKadoban[e.rikishiId], demotedOzeki),
      };
    })
    .sort((a, b) => {
      // Primary sort: Desired Key (Movement + Political Weight)
      if (a.desiredKey !== b.desiredKey) {
        return a.desiredKey - b.desiredKey;
      }

      // Secondary sort: Tiebreak Hierarchy
      // Level 1: Previous Slot Closeness (oldKey)
      // Level 2: H2H
      // Level 3: SOS Proxy
      return resolveBanzukeTie(a as BanzukeCandidate, b as BanzukeCandidate, world, perfById);
    });

  const assigned: BanzukeEntry[] = [];
  const used = new Set<string>();

  for (const slot of fullTemplate) {
    // 1. Try to find the best candidate who is ELIGIBLE for this tier
    let idx = scored.findIndex(
      (cand) =>
        !used.has(cand.entry.rikishiId) &&
        RANK_HIERARCHY[slot.position.rank].tier >= cand.eligibleBestTier
    );

    // 2. FALLBACK: If no eligible candidate found, take the absolute next best available candidate
    // to ensure division quotas are met (as requested by user).
    if (idx === -1) {
      idx = scored.findIndex((cand) => !used.has(cand.entry.rikishiId));
    }

    if (idx !== -1) {
      const winner = scored.splice(idx, 1)[0];
      used.add(winner.entry.rikishiId);
      assigned.push({ ...winner.entry, division: slot.division, position: slot.position });
    }
  }

  const events: MovementEvent[] = banzukeMovementEvents(
    currentBanzuke,
    assigned,
    updatedOzekiKadoban,
    previousOzekiKadoban
  );
  return { newBanzuke: assigned, events, updatedOzekiKadoban, sanyakuCounts };
}

/**
 * Generates movement events (promotion, demotion, lateral, status) by comparing old and new banzuke assignments.
 *
 * @param {BanzukeEntry[]} old - The previous banzuke roster.
 * @param {BanzukeEntry[]} assigned - The new banzuke roster.
 * @param {OzekiKadobanMap} nextOzeki - The new Ozeki kadoban statuses.
 * @param {OzekiKadobanMap} prevOzeki - The previous Ozeki kadoban statuses.
 * @returns {MovementEvent[]} List of movement events to be logged.
 */
function banzukeMovementEvents(
  old: BanzukeEntry[],
  assigned: BanzukeEntry[],
  nextOzeki: OzekiKadobanMap,
  prevOzeki: OzekiKadobanMap
): MovementEvent[] {
  const events: MovementEvent[] = [];
  const oldById = new Map(old.map((e) => [e.rikishiId, e]));

  for (const e of assigned) {
    const o = oldById.get(e.rikishiId);
    if (!o) continue;
    const from = `${o.division}:${formatRank(o.position)}`;
    const to = `${e.division}:${formatRank(e.position)}`;
    if (from === to) continue;

    const fromTier = RANK_HIERARCHY[o.position.rank].tier;
    const toTier = RANK_HIERARCHY[e.position.rank].tier;
    let kind: MovementEvent["kind"] = "lateral";
    if (toTier < fromTier || divisionTier(e.division) < divisionTier(o.division))
      kind = "promotion";
    else if (toTier > fromTier || divisionTier(e.division) > divisionTier(o.division))
      kind = "demotion";

    events.push({
      rikishiId: e.rikishiId,
      from,
      to,
      kind,
      description: `${kind === "promotion" ? "Promoted" : kind === "demotion" ? "Demoted" : "Moved"}: ${from} → ${to}`,
    });
  }

  for (const [id, state] of Object.entries(nextOzeki)) {
    const oldState = prevOzeki[id];
    if (
      !oldState ||
      (oldState.isKadoban === state.isKadoban &&
        oldState.consecutiveMakeKoshi === state.consecutiveMakeKoshi)
    )
      continue;
    events.push({
      rikishiId: id,
      from: `kadoban:${oldState.isKadoban}`,
      to: `kadoban:${state.isKadoban}`,
      kind: "status",
      description:
        state.consecutiveMakeKoshi >= 2
          ? "Ozeki demoted."
          : state.isKadoban
            ? "Kadoban status set."
            : "Kadoban status cleared.",
    });
  }
  return events;
}

/**
 * Computes the required counts for Sanyaku slots (Yokozuna, Ozeki, Sekiwake, Komusubi) based on performance.
 * Ensures a minimum of 2 for Ozeki, Sekiwake, and Komusubi.
 *
 * @param {BanzukeEntry[]} current - The current banzuke entries.
 * @param {Map<string, BashoPerformance>} perfById - Map of performances.
 * @param {Set<string>} demoted - Set of rikishi IDs who were demoted from Ozeki.
 * @returns {BanzukeUpdateResult["sanyakuCounts"]} The counts for each Sanyaku rank.
 */
function computeVariableSanyakuCounts(
  current: BanzukeEntry[],
  perfById: Map<string, BashoPerformance>,
  demoted: Set<string>
): BanzukeUpdateResult["sanyakuCounts"] {
  const m = current.filter((e) => e.division === "makuuchi");
  const yCount = Math.min(
    6,
    m.filter((e) => e.position.rank === "yokozuna").length +
      m.filter((e) => e.position.rank === "ozeki" && !!perfById.get(e.rikishiId)?.promoteToYokozuna)
        .length
  );
  let oCount = Math.max(
    2,
    m.filter((e) => e.position.rank === "ozeki" && !demoted.has(e.rikishiId)).length +
      m.filter(
        (e) => e.position.rank === "sekiwake" && (perfById.get(e.rikishiId)?.wins ?? 0) >= 11
      ).length
  );
  let sCount = Math.max(
    2,
    Math.min(
      6,
      2 +
        demoted.size +
        m.filter(
          (e) => e.position.rank === "komusubi" && (perfById.get(e.rikishiId)?.wins ?? 0) >= 10
        ).length
    )
  );
  let kCount = Math.max(
    2,
    Math.min(
      6,
      2 +
        m.filter(
          (e) =>
            e.position.rank === "maegashira" &&
            (!!perfById.get(e.rikishiId)?.yusho ||
              ((e.position.rankNumber ?? 99) <= 4 && (perfById.get(e.rikishiId)?.wins ?? 0) >= 10))
        ).length
    )
  );

  // Balanced trim if needed
  while (yCount + oCount + sCount + kCount > 20) {
    if (kCount > 2) kCount--;
    else if (sCount > 2) sCount--;
    else if (oCount > 2) oCount--;
    else break;
  }

  return {
    yokozuna: yCount,
    ozeki: oCount,
    sekiwake: sCount,
    komusubi: kCount,
    maegashira: Math.max(0, 42 - (yCount + oCount + sCount + kCount)),
  };
}
