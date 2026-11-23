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
} from "@/engine/types/banzuke";
export type { BanzukeEntry, BashoPerformance };
import {
  isSanyakuRank,
  isYokozunaOrOzekiRank,
  isLowerSanyakuRank,
  isSekitoriDivision,
} from "@/constants/engine/rankDisplay";
import type { Rikishi } from "@/engine/types/rikishi";
import type { Heya } from "@/engine/types/heya";

interface BanzukeChange {
  rikishiId: string;
  oldPosition: RankPosition | null;
  newPosition: RankPosition;
  change: "up" | "down" | "none" | "new";
}

// Re-export helpers and local logic

import {
  formatRank,
  resolveBanzukeTie,
  type BanzukeCandidate,
} from "@/engine/banzuke/banzukeHelpers";
import type { WorldState } from "@/engine/types/world";
import { getOzekiStatus, type OzekiKadobanMap } from "@/engine/banzuke/ozekiLogic";
import { bestTierAllowed } from "@/engine/banzuke/promotionLogic";
import {
  CROSS_DIVISION_WIN_BONUS,
  MAKUSHITA_PROMOTION_ZONE,
  SEKITORI_INCUMBENT_BONUS,
} from "@/constants/engine/banzuke";
import { deliberateBanzukeMovement } from "@/engine/banzuke/banzukeCommittee";
import type { CommitteeDecision } from "@/engine/committee/committee";
import { rngForWorld } from "@/engine/core/rng";
import { buildFullSlotTemplate } from "@/engine/banzuke/banzukeTemplate";
import { toKeyedMap } from "@/engine/utils/index";

/** Options for banzuke compilation (e.g. optional Jonokuchi slot cap for banzuke-gai overflow). */
export interface BanzukeUpdateOptions {
  maxJonokuchiSlots?: number;
}

/** Defines the structure for banzuke update result. */
interface BanzukeUpdateResult {
  newBanzuke: BanzukeEntry[];
  events: MovementEvent[];
  updatedOzekiKadoban: OzekiKadobanMap;
  /** Committee deliberation records per rikishi (votes + rationale). */
  deliberations: Map<string, CommitteeDecision>;
  sanyakuCounts: {
    yokozuna: number;
    ozeki: number;
    sekiwake: number;
    komusubi: number;
    maegashira: number;
  };
  /** §3 banzuke-gai — rikishi dropped off the printed banzuke (full jonokuchi kyujo or slot overflow). */
  banzukeGai?: string[];
  banzukeGaiReasons?: Record<string, "kyujo" | "overflow">;
  /** WS-13 — pre-publication announcements: Y/Ō and Ms→Juryo only. */
  earlyAnnouncements: Array<{ rikishiId: string; kind: string }>;
  /** WS-13 — Juryo→Makuuchi moves stay embargoed until the banzuke reveal. */
  embargoedMovements: Array<{ rikishiId: string }>;
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
    const aSanyaku =
      isSanyakuRank(a.newPosition?.rank ?? "") || isSanyakuRank(a.oldPosition?.rank ?? "");
    const bSanyaku =
      isSanyakuRank(b.newPosition?.rank ?? "") || isSanyakuRank(b.oldPosition?.rank ?? "");

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
  heyaMap?: Map<string, Heya>,
  options?: BanzukeUpdateOptions
): BanzukeUpdateResult {
  const { updatedOzekiKadoban, demotedOzeki, reclaimableOzeki } = resolveOzekiStatuses(
    currentBanzuke,
    perfById,
    previousOzekiKadoban,
    world
  );

  // §3 banzuke-gai — Jonokuchi rikishi with a full 0-0-7 absence drop off the printed banzuke.
  const banzukeGai: string[] = [];
  const banzukeGaiReasons: Record<string, "kyujo" | "overflow"> = {};
  const banzukeGaiEvents: MovementEvent[] = [];
  const eligibleBanzuke: BanzukeEntry[] = [];
  for (const e of currentBanzuke) {
    const p = perfById.get(e.rikishiId);
    const isFullJonokuchiKyujo =
      e.division === "jonokuchi" &&
      (p?.wins ?? 0) === 0 &&
      (p?.losses ?? 0) === 0 &&
      (p?.absences ?? 0) >= 7 &&
      (p?.draws ?? 0) === 0;
    if (isFullJonokuchiKyujo) {
      banzukeGai.push(e.rikishiId);
      banzukeGaiReasons[e.rikishiId] = "kyujo";
      const from = `${e.division}:${formatRank(e.position)}`;
      banzukeGaiEvents.push({
        rikishiId: e.rikishiId,
        from,
        to: "banzuke-gai",
        kind: "demotion",
        description: `Demoted: ${from} → Banzuke-gai (full Jonokuchi absence)`,
      });
    } else {
      eligibleBanzuke.push(e);
    }
  }

  const sanyakuCounts = computeVariableSanyakuCounts(eligibleBanzuke, perfById, demotedOzeki);
  const fullTemplate = computeDivisionTemplate(
    eligibleBanzuke,
    sanyakuCounts,
    options?.maxJonokuchiSlots
  );

  const scoredAll = scoreBanzukeCandidates(
    eligibleBanzuke,
    perfById,
    world,
    updatedOzekiKadoban,
    demotedOzeki,
    reclaimableOzeki,
    heyaMap
  );

  let scored = scoredAll;
  if (options?.maxJonokuchiSlots !== undefined) {
    scored = trimJonokuchiOverCap(
      scoredAll,
      options.maxJonokuchiSlots,
      banzukeGai,
      banzukeGaiReasons,
      banzukeGaiEvents
    );
  }

  let assigned = assignBanzukeSlots(scored, fullTemplate, demotedOzeki);

  // Demand-driven tail: the sheet never drops an active rikishi for lack
  // of a slot. Entries left unassigned — whether from boundary gates or
  // template overflow — extend the unprinted jonokuchi tail; they must
  // NOT be absorbed by vacuum-promoting anyone across the sekitori
  // boundaries (WS-11 fallback gates).
  if (assigned.length < scored.length) {
    const template = extendJonokuchiTail(
      fullTemplate,
      scored.length - assigned.length
    );
    assigned = assignBanzukeSlots(scored, template, demotedOzeki);
  }
  markOverflowBanzukeGai(assigned, scored, banzukeGai, banzukeGaiReasons, banzukeGaiEvents);

  const events: MovementEvent[] = [
    ...banzukeMovementEvents(
      eligibleBanzuke,
      assigned,
      updatedOzekiKadoban,
      previousOzekiKadoban,
      demotedOzeki
    ),
    ...banzukeGaiEvents,
  ];

  // WS-13 — early-announcement classes: only Y/Ō promotions and Ms→Juryo
  // promotions are announced before the banzuke reveal; Juryo→Makuuchi
  // stays embargoed until publication.
  const prevById = new Map(eligibleBanzuke.map((e) => [e.rikishiId, e]));
  const earlyAnnouncements: Array<{ rikishiId: string; kind: string }> = [];
  const embargoedMovements: Array<{ rikishiId: string }> = [];
  for (const a of assigned) {
    const prev = prevById.get(a.rikishiId);
    if (!prev) continue;
    const newRank = a.position.rank;
    const oldRank = prev.position.rank;
    if (
      (newRank === "yokozuna" && oldRank !== "yokozuna") ||
      (newRank === "ozeki" && oldRank !== "ozeki")
    ) {
      earlyAnnouncements.push({ rikishiId: a.rikishiId, kind: "sanyaku_promotion" });
    } else if (prev.division === "makushita" && a.division === "juryo") {
      earlyAnnouncements.push({ rikishiId: a.rikishiId, kind: "juryo_promotion" });
    } else if (prev.division === "juryo" && a.division === "makuuchi") {
      embargoedMovements.push({ rikishiId: a.rikishiId });
    }
  }

  return {
    newBanzuke: assigned,
    events,
    updatedOzekiKadoban,
    sanyakuCounts,
    deliberations: new Map(scored.map((s) => [s.entry.rikishiId, s.decision])),
    earlyAnnouncements,
    embargoedMovements,
    ...(banzukeGai.length > 0 ? { banzukeGai, banzukeGaiReasons } : {}),
  };
}

/**
 * Resolves each incumbent ozeki's kadoban status, collecting the demoted set
 * (2+ consecutive make-koshi) and the reclaimable set (wasDemotedFromOzeki).
 */
function resolveOzekiStatuses(
  currentBanzuke: BanzukeEntry[],
  perfById: Map<string, BashoPerformance>,
  previousOzekiKadoban: OzekiKadobanMap,
  world: WorldState
): {
  updatedOzekiKadoban: OzekiKadobanMap;
  demotedOzeki: Set<string>;
  reclaimableOzeki: Set<string>;
} {
  const updatedOzekiKadoban: OzekiKadobanMap = { ...previousOzekiKadoban };
  const demotedOzeki = new Set<string>();

  for (const e of currentBanzuke) {
    if (e.position.rank !== "ozeki") continue;
    const p = perfById.get(e.rikishiId);
    // A completed demotion (consecutiveMakeKoshi >= 2) ends the ozeki
    // tenure — whether finalized last basho or persisted stale from before
    // the cleanup fix. A re-promoted ozeki restarts the make-koshi count
    // so their first make-koshi is kadoban grace, not instant re-demotion.
    const prev = previousOzekiKadoban[e.rikishiId];
    const base = prev && prev.consecutiveMakeKoshi >= 2 ? undefined : prev;
    const next = getOzekiStatus(p?.wins ?? 0, p?.losses ?? 0, p?.absences ?? 0, base);
    if (next.consecutiveMakeKoshi >= 2) {
      // Tenure ends — write a clean entry instead of leaving demotion
      // residue for a future re-promotion to accumulate on.
      updatedOzekiKadoban[e.rikishiId] = {
        isKadoban: false,
        consecutiveMakeKoshi: 0,
      };
      demotedOzeki.add(e.rikishiId);
    } else {
      updatedOzekiKadoban[e.rikishiId] = next;
    }
  }

  // Build set of rikishi who have wasDemotedFromOzeki flag (for Ozeki reclaim logic)
  const reclaimableOzeki = new Set<string>();
  for (const e of currentBanzuke) {
    const r = world.rikishi.get(e.rikishiId);
    if (r?.wasDemotedFromOzeki) reclaimableOzeki.add(e.rikishiId);
  }

  return { updatedOzekiKadoban, demotedOzeki, reclaimableOzeki };
}

/**
 * Dynamic division capacity: scale lower divisions to the active field so no
 * rikishi is frozen out of the banzuke. Makuuchi (42) and juryo (28) are fixed
 * (sekitori tiers); the remaining population is distributed across makushita,
 * sandanme, jonidan, and jonokuchi (the overflow safety net).
 */
function computeDivisionTemplate(
  currentBanzuke: BanzukeEntry[],
  sanyakuCounts: ReturnType<typeof computeVariableSanyakuCounts>,
  maxJonokuchiSlots?: number
): ReturnType<typeof buildFullSlotTemplate> {
  const fieldSize = currentBanzuke.length;
  const elite = 42 + 28; // makuuchi + juryo fixed
  const lowerPopulation = Math.max(0, fieldSize - elite);
  const HEADROOM = 8;
  const makushita = 120; // Fixed at 120 per real sumo
  const sandanme = Math.max(60, Math.ceil(lowerPopulation * 0.25) + HEADROOM);
  const jonidan = Math.max(60, Math.ceil(lowerPopulation * 0.4) + HEADROOM);
  const uncappedJonokuchi =
    Math.max(40, lowerPopulation - (makushita + sandanme + jonidan)) + HEADROOM;
  const jonokuchi =
    maxJonokuchiSlots !== undefined
      ? Math.max(0, Math.min(uncappedJonokuchi, maxJonokuchiSlots))
      : uncappedJonokuchi;
  return buildFullSlotTemplate(sanyakuCounts, {
    makuuchi: 42,
    juryo: 28,
    makushita,
    sandanme,
    jonidan,
    jonokuchi,
  });
}

/**
 * WS-13 — kyūjō landing floors on the positionKey scale (tier*1000 +
 * num*2 + side). An absence-dominated record lands at the top of the next
 * band down: makuuchi → ~J5; juryo → ~Ms15; lower → ~one division.
 */
const KYUJO_LANDING_FLOOR: Record<string, number> = {
  makuuchi: 5010,
  juryo: 7030,
  makushita: 8100,
  sandanme: 9100,
  jonidan: 10080,
};

/**
 * Appends `count` extra jonokuchi tail slots to a slot template —
 * numbering continues from the last printed jonokuchi rank. Jonokuchi
 * is unprinted in real banzuke, so the tail is the only division that
 * can absorb demand without falsifying the sheet.
 */
function extendJonokuchiTail(
  fullTemplate: ReturnType<typeof buildFullSlotTemplate>,
  count: number
): ReturnType<typeof buildFullSlotTemplate> {
  const template = [...fullTemplate];
  let jkNum = 0;
  for (const s of fullTemplate) {
    if (s.position.rank === "jonokuchi") {
      jkNum = Math.max(jkNum, s.position.rankNumber ?? 0);
    }
  }
  let side: "east" | "west" = "east";
  for (let i = 0; i < count; i++) {
    jkNum++;
    template.push({
      division: "jonokuchi",
      position: { rank: "jonokuchi", rankNumber: jkNum, side },
    });
    side = side === "east" ? "west" : "east";
  }
  return template;
}

/**
 * Applies the jonokuchi slot cap: scored candidates past the cap are
 * ejected to banzuke-gai as division overflow rather than occupying
 * tail slots (used by intake-controlled publishing paths).
 */
function trimJonokuchiOverCap(
  scoredAll: ScoredCandidate[],
  maxJonokuchiSlots: number,
  banzukeGai: string[],
  banzukeGaiReasons: Record<string, "kyujo" | "overflow">,
  banzukeGaiEvents: MovementEvent[]
): ScoredCandidate[] {
  const jkTier = RANK_HIERARCHY.jonokuchi.tier;
  const scored: ScoredCandidate[] = [];
  let jkCount = 0;
  for (const s of scoredAll) {
    if (s.eligibleBestTier >= jkTier) {
      jkCount++;
      if (jkCount > maxJonokuchiSlots) {
        banzukeGai.push(s.entry.rikishiId);
        banzukeGaiReasons[s.entry.rikishiId] = "overflow";
        const from = `${s.entry.division}:${formatRank(s.entry.position)}`;
        banzukeGaiEvents.push({
          rikishiId: s.entry.rikishiId,
          from,
          to: "banzuke-gai",
          kind: "demotion",
          description: `Demoted: ${from} → Banzuke-gai (division overflow)`,
        });
        continue;
      }
    }
    scored.push(s);
  }
  return scored;
}

/** Marks scored candidates who received no slot as banzuke-gai overflow. */
function markOverflowBanzukeGai(
  assigned: BanzukeEntry[],
  scored: ScoredCandidate[],
  banzukeGai: string[],
  banzukeGaiReasons: Record<string, "kyujo" | "overflow">,
  banzukeGaiEvents: MovementEvent[]
): void {
  if (assigned.length >= scored.length) return;
  const assignedIds = new Set(assigned.map((a) => a.rikishiId));
  for (const s of scored) {
    if (assignedIds.has(s.entry.rikishiId)) continue;
    banzukeGai.push(s.entry.rikishiId);
    banzukeGaiReasons[s.entry.rikishiId] = "overflow";
    const from = `${s.entry.division}:${formatRank(s.entry.position)}`;
    banzukeGaiEvents.push({
      rikishiId: s.entry.rikishiId,
      from,
      to: "banzuke-gai",
      kind: "demotion",
      description: `Demoted: ${from} → Banzuke-gai (division overflow)`,
    });
  }
}

type ScoredCandidate = {
  entry: BanzukeEntry;
  oldKey: number;
  desiredKey: number;
  eligibleBestTier: number;
  decision: CommitteeDecision;
};

/**
 * Scores each banzuke entry by desired position — the banzuke committee's
 * deliberated slot delta ((W−L)/2, kyujo ≈ losses, bounded merit/preference
 * discretion) — plus eligible tier, then sorts by desiredKey with the
 * H2H/SOS tiebreak hierarchy.
 */
function scoreBanzukeCandidates(
  currentBanzuke: BanzukeEntry[],
  perfById: Map<string, BashoPerformance>,
  world: WorldState,
  updatedOzekiKadoban: OzekiKadobanMap,
  demotedOzeki: Set<string>,
  reclaimableOzeki: Set<string>,
  heyaMap?: Map<string, Heya>
): ScoredCandidate[] {
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

  const committeeRng = rngForWorld(world, "banzuke", "committee");

  return currentBanzuke
    .map((e) => {
      const p = perfById.get(e.rikishiId);
      const heya = heyaMap ? rikishiToHeyaMap.get(e.rikishiId) : undefined;
      const { delta: move, decision } = deliberateBanzukeMovement(
        e,
        p,
        demotedOzeki,
        committeeRng,
        heya?.ichimon ?? "none"
      );

      // WS-13 — jōi cushion: junior sanyaku + top maegashira (K–M4) take a
      // bounded demotion on a bad basho, falling less than a deep
      // maegashira on the identical record.
      const joi =
        e.position.rank === "komusubi" ||
        e.position.rank === "sekiwake" ||
        (e.position.rank === "maegashira" && (e.position.rankNumber ?? 99) <= 4);
      const cushionedMove = move < 0 && joi ? move + 1 : move;

      const oldKey = positionKey(e);
      let desiredKey = oldKey - cushionedMove * 1_000;

      // WS-13 — kyūjō landing floor: an absence-dominated record lands in
      // the next band down, not off the printed sheet. Makuuchi 0-0-15 →
      // mid-juryo; juryo → makushita; lower divisions ≈ one division.
      if (p && (p.absences ?? 0) >= 7 && (p.absences ?? 0) >= p.wins + p.losses) {
        const floor = KYUJO_LANDING_FLOOR[e.division];
        if (floor !== undefined) desiredKey = Math.min(desiredKey, floor);
      }

      // WS-11 — promotion claims outrank incumbency: an in-zone makushita
      // promotable's desire scales toward the top of the zone, so Ms1 KK
      // is an effective lock (he beats marginal juryo incumbents) while
      // deep-zone promotables still need a real vacancy.
      if (
        e.position.rank === "makushita" &&
        (e.position.rankNumber ?? 99) <= MAKUSHITA_PROMOTION_ZONE &&
        bestTierAllowed(e, p, updatedOzekiKadoban[e.rikishiId], demotedOzeki, reclaimableOzeki) <= 6
      ) {
        desiredKey -= (MAKUSHITA_PROMOTION_ZONE + 1 - (e.position.rankNumber ?? 99)) * 400;
      }

      // WS-11 — incumbent preference: a sekitori incumbent's drift is
      // damped toward the status quo, so bubble calls (bottom maegashira
      // MK vs a marginal J1 promotable) keep the incumbent. Applied to both
      // directions of drift — it mutes bubble movement, not real records.
      if (RANK_HIERARCHY[e.position.rank].tier <= 6) {
        const drift = desiredKey - oldKey;
        const damped = Math.sign(drift) * Math.max(0, Math.abs(drift) - SEKITORI_INCUMBENT_BONUS);
        desiredKey = oldKey + damped;
      }

      // WS-11 — crossover merit: wins against the opposite sekitori
      // division are direct boundary evidence, applied on top of the
      // damped drift so a proven challenger still wins the bubble call.
      desiredKey -= (p?.crossDivisionWins ?? 0) * CROSS_DIVISION_WIN_BONUS;
      return {
        entry: e,
        oldKey,
        desiredKey,
        decision,
        eligibleBestTier: bestTierAllowed(
          e,
          p,
          updatedOzekiKadoban[e.rikishiId],
          demotedOzeki,
          reclaimableOzeki
        ),
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
      // Level 4: Performance Quality
      return resolveBanzukeTie(a as BanzukeCandidate, b as BanzukeCandidate, world, perfById);
    });
}

/**
 * Bucketed slot assignment: `scored` is sorted by priority, so each
 * candidate's index IS its priority key (lower index = better). Template slots
 * are processed in non-decreasing tier order, so bucket activation is
 * incremental — a candidate becomes eligible once slotTier reaches its
 * eligibleBestTier and stays eligible for all subsequent slots.
 */
function assignBanzukeSlots(
  scored: ScoredCandidate[],
  fullTemplate: ReturnType<typeof buildFullSlotTemplate>,
  demotedOzeki: Set<string>
): BanzukeEntry[] {
  const assigned: BanzukeEntry[] = [];

  const MAX_TIER = 10;
  const buckets: { indices: number[]; ptr: number }[] = Array.from(
    { length: MAX_TIER + 1 },
    () => ({ indices: [], ptr: 0 })
  );
  for (let i = 0; i < scored.length; i++) {
    const t = Math.max(1, Math.min(MAX_TIER, scored[i].eligibleBestTier));
    buckets[t].indices.push(i);
  }

  const taken = new Set<number>();
  const usedRikishiIds = new Set<string>();
  let activatedTier = 0;

  for (const slot of fullTemplate) {
    const slotTier = RANK_HIERARCHY[slot.position.rank].tier;

    // Activate buckets up to slotTier (incremental — only new tiers).
    while (activatedTier < slotTier) {
      activatedTier++;
    }

    // 1. Find best eligible candidate: lowest scored-index among active bucket heads.
    let winnerIdx = -1;
    for (let t = 1; t <= activatedTier; t++) {
      const b = buckets[t];
      while (b.ptr < b.indices.length && taken.has(b.indices[b.ptr])) b.ptr++;
      if (b.ptr < b.indices.length) {
        const candIdx = b.indices[b.ptr];
        if (winnerIdx === -1 || candIdx < winnerIdx) winnerIdx = candIdx;
      }
    }

    // 2. FALLBACK: no eligible candidate — take best available from inactive buckets.
    // Guard: a demoted ozeki must never be re-seated in an ozeki slot via fallback.
    // WS-11 — the two sekitori boundaries are the only hard gates on the
    // slot vacuum: a juryo rikishi who didn't clear J1 never vacuum-
    // promotes into makuuchi, and Ms16+ never promotes into juryo —
    // even into a vacancy. All other slots fill normally.
    if (winnerIdx === -1) {
      const isOzekiSlot = slot.position.rank === "ozeki";
      for (let t = activatedTier + 1; t <= MAX_TIER; t++) {
        const b = buckets[t];
        while (b.ptr < b.indices.length && taken.has(b.indices[b.ptr])) b.ptr++;
        for (let i = b.ptr; i < b.indices.length; i++) {
          const candIdx = b.indices[i];
          if (taken.has(candIdx)) continue;
          const cand = scored[candIdx];
          if (usedRikishiIds.has(cand.entry.rikishiId)) continue;
          if (isOzekiSlot && demotedOzeki.has(cand.entry.rikishiId)) continue;
          // WS-11 — the sekitori boundaries are hard gates: the slot
          // vacuum may never lift a rikishi above his eligibleBestTier
          // into makuuchi or juryo (Ms16+ can NEVER promote; J must
          // clear J1 to rise). Overflow beyond the printed sheet is
          // absorbed by demand-driven tail slots, not promotion.
          if (slotTier <= 6 && cand.eligibleBestTier > slotTier) continue;
          if (winnerIdx === -1 || candIdx < winnerIdx) winnerIdx = candIdx;
          break; // first passing candidate in this bucket = best in bucket
        }
      }
    }

    if (winnerIdx !== -1) {
      taken.add(winnerIdx);
      const winner = scored[winnerIdx];
      usedRikishiIds.add(winner.entry.rikishiId);
      assigned.push({ ...winner.entry, division: slot.division, position: slot.position });
    }
  }

  return assigned;
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
  prevOzeki: OzekiKadobanMap,
  demotedOzeki: Set<string>
): MovementEvent[] {
  const events: MovementEvent[] = [];
  const oldById = toKeyedMap(old, (e) => e.rikishiId);

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

    // Enriched movement narrative (4.1)
    const moveDistance = Math.abs(fromTier - toTier);
    const isJumpPromotion = kind === "promotion" && moveDistance >= 2;
    const fromIsSekitori = isSekitoriDivision(o.division);
    const toIsSekitori = isSekitoriDivision(e.division);
    const isSekitoriPromotion = !fromIsSekitori && toIsSekitori;
    const fromIsSanyaku =
      isYokozunaOrOzekiRank(o.position.rank) || isLowerSanyakuRank(o.position.rank);
    const toIsSanyaku =
      isYokozunaOrOzekiRank(e.position.rank) || isLowerSanyakuRank(e.position.rank);
    const isSanyakuPromotion = !fromIsSanyaku && toIsSanyaku;

    events.push({
      rikishiId: e.rikishiId,
      from,
      to,
      kind,
      description: `${kind === "promotion" ? "Promoted" : kind === "demotion" ? "Demoted" : "Moved"}: ${from} → ${to}`,
      moveDistance,
      isJumpPromotion,
      isSekitoriPromotion,
      isSanyakuPromotion,
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
      description: demotedOzeki.has(id)
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
export function computeVariableSanyakuCounts(
  current: BanzukeEntry[],
  perfById: Map<string, BashoPerformance>,
  demoted: Set<string>
): BanzukeUpdateResult["sanyakuCounts"] {
  let yokozunaCount = 0;
  let promoteToYokozunaCount = 0;
  let ozekiNotDemotedCount = 0;
  let sekiwakePromoteCount = 0;
  let komusubiPromoteCount = 0;
  let maegashiraPromoteCount = 0;

  for (const e of current) {
    if (e.division !== "makuuchi") continue;

    const rank = e.position.rank;
    const perf = perfById.get(e.rikishiId);

    if (rank === "yokozuna") {
      yokozunaCount++;
    } else if (rank === "ozeki") {
      if (perf?.promoteToYokozuna) promoteToYokozunaCount++;
      if (!demoted.has(e.rikishiId)) ozekiNotDemotedCount++;
    } else if (rank === "sekiwake") {
      if ((perf?.wins ?? 0) >= 11) sekiwakePromoteCount++;
    } else if (rank === "komusubi") {
      if ((perf?.wins ?? 0) >= 10) komusubiPromoteCount++;
    } else if (rank === "maegashira") {
      if (perf?.yusho || ((e.position.rankNumber ?? 99) <= 4 && (perf?.wins ?? 0) >= 10)) {
        maegashiraPromoteCount++;
      }
    }
  }

  const yCount = Math.min(6, yokozunaCount + promoteToYokozunaCount);
  let oCount = Math.max(2, Math.min(4, ozekiNotDemotedCount + sekiwakePromoteCount));
  let sCount = Math.max(2, Math.min(6, 2 + demoted.size + komusubiPromoteCount));
  let kCount = Math.max(2, Math.min(6, 2 + maegashiraPromoteCount));

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
