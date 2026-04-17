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
  type DivisionBanzukeSnapshot,
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
import { assertNever } from "./utils/types";

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

/**
 * Convert BanzukeEntry[] to BanzukeSnapshot format for comparison with historical snapshots.
 */
export function convertBanzukeEntriesToSnapshot(
  entries: BanzukeEntry[],
  year: number,
  bashoNumber: 1 | 2 | 3 | 4 | 5 | 6
): BanzukeSnapshot {
  const divisions: Record<Division, DivisionBanzukeSnapshot> = {
    makuuchi: { division: "makuuchi", slots: [], assignments: [] },
    juryo: { division: "juryo", slots: [], assignments: [] },
    makushita: { division: "makushita", slots: [], assignments: [] },
    sandanme: { division: "sandanme", slots: [], assignments: [] },
    jonidan: { division: "jonidan", slots: [], assignments: [] },
    jonokuchi: { division: "jonokuchi", slots: [], assignments: [] },
  };

  for (const entry of entries) {
    const division = entry.division;
    if (!divisions[division]) continue;

    divisions[division].slots.push(entry.position);
    divisions[division].assignments.push({
      rikishiId: entry.rikishiId,
      position: entry.position,
    });
  }

  return {
    year,
    bashoNumber,
    divisions,
  };
}

/**
 * Compare current banzuke snapshot with previous snapshot to detect rank changes.
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
function divisionTier(d: Division): number {
  switch (d) {
    case "makuuchi":
      return 1;
    case "juryo":
      return 2;
    case "makushita":
      return 3;
    case "sandanme":
      return 4;
    case "jonidan":
      return 5;
    case "jonokuchi":
      return 6;
    default:
      assertNever(d);
  }
}

/**
 * Main entrance to update the entire banzuke after a tournament.
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
  const fullTemplate = buildFullSlotTemplate(sanyakuCounts, {
    makuuchi: 42,
    juryo: 28,
    makushita: 60,
    sandanme: 50,
    jonidan: 40,
    jonokuchi: 20,
  });

  // Assign candidates to slots
  const scored = currentBanzuke
    .map((e) => {
      const p = perfById.get(e.rikishiId);
      const move = computeMovementUnits(e, p, demotedOzeki);

      let politicalWeight = 0;
      if (heyaMap && e.rikishiId) {
        const heya = Array.from(heyaMap.values()).find((h) => h.rikishiIds?.includes(e.rikishiId));
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
    const idx = scored.findIndex(
      (cand) =>
        !used.has(cand.entry.rikishiId) &&
        RANK_HIERARCHY[slot.position.rank].tier >= cand.eligibleBestTier
    );
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
