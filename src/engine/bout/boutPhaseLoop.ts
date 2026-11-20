// boutPhaseLoop.ts — Orchestrator for bout physics engine.
// Phase tick handlers have been extracted into the physics/ directory.

import { rngFromSeed, type SeededRNG } from "@/engine/core/rng";
import type { Rikishi } from "@/engine/types/rikishi";
import type { BoutResult, BashoState, BoutLogEntry } from "@/engine/types/basho";
import type { Side } from "@/engine/types/banzuke";
import type { KimariteId, DrawOutcomeType } from "@/engine/types/combat";
import {
  MAX_BOUT_TICKS,
  POST_RESOLUTION_REVERSAL_CHANCE,
  ISAMIASHI_INSTABILITY_THRESHOLD,
  CLOCK_MULTIPLIER,
} from "@/constants/engine/physics";
import {
  MOMENTUM_SCORE_FACTOR,
  MOMENTUM_DOMINANT_THRESHOLD,
  FATIGUE_LOG_TICK_1,
  FATIGUE_LOG_TICK_2,
  INSTABILITY_FLOOR,
  MIZU_IRI_FIRST_TICK,
  MIZU_IRI_SECOND_TICK,
  MIZU_IRI_MAX_BREAKS,
  MIZU_IRI_TORQUE_BALANCE,
  MIZU_IRI_RING_MARGIN,
  MIZU_IRI_FATIGUE_RECOVERY,
  HIKIWAKE_MAX_INSTABILITY_GAP,
} from "@/constants/engine/bout";
import { RING_RADIUS, type EngineStateV2 } from "@/engine/types/combat-spatial";
import {
  sideTactics,
  skillTieBreak,
  type BoutContext,
  type SideTactics,
} from "@/engine/bout/boutUtils";

import { initEngineStateV2 } from "@/engine/bout/physics/initState";
import { resolveTachiaiV2 } from "@/engine/bout/physics/tachiai";
import { tickPushBattle } from "@/engine/bout/physics/tickPushBattle";
import { tickBeltBattle } from "@/engine/bout/physics/tickBeltBattle";
import { tickEdgeCrisis } from "@/engine/bout/physics/edgeCrisis";
import { buildBoutResultV2 } from "@/engine/bout/physics/resultBuilders";
import { tryShinitai } from "@/engine/bout/shinitai";
import { maybeClassifyHiwaza, HIWAZA_IDS } from "@/engine/bout/hiwaza";

const MAX_TICKS = MAX_BOUT_TICKS;

/**
 * Per-tick bookkeeping: accumulate momentum from the push/belt force
 * differential, log dominance sign-flips, and snapshot fatigue at the two
 * designated ticks. Extracted from the phase loop for the LOC budget.
 */
function trackTickMomentumAndFatigue(st: EngineStateV2, boutLog: BoutLogEntry[]): void {
  // --- Momentum tracking (1.4) ---
  // Accumulate momentum based on force differential from push/belt state
  let forceDiff = 0;
  if (st.phase.tag === "push_battle") {
    forceDiff = st.phase.state.eastForce - st.phase.state.westForce;
  } else if (st.phase.tag === "belt_battle") {
    forceDiff = st.phase.state.torqueEast - st.phase.state.torqueWest;
  }
  st.momentumScore += forceDiff * MOMENTUM_SCORE_FACTOR;

  // Detect momentum shift (sign flip)
  const currentDominant: Side | null =
    st.momentumScore > MOMENTUM_DOMINANT_THRESHOLD
      ? "east"
      : st.momentumScore < -MOMENTUM_DOMINANT_THRESHOLD
        ? "west"
        : null;
  if (currentDominant && st.prevDominantSide && currentDominant !== st.prevDominantSide) {
    boutLog.push({
      phase: "momentum_shift",
      clock: st.tick * CLOCK_MULTIPLIER,
      data: {
        prevDominantSide: st.prevDominantSide,
        newDominantSide: currentDominant,
        magnitude: Math.abs(st.momentumScore),
      },
    });
  }
  if (currentDominant) st.prevDominantSide = currentDominant;

  // --- Fatigue snapshot logging (1.2) ---
  if (st.tick === FATIGUE_LOG_TICK_1 || st.tick === FATIGUE_LOG_TICK_2) {
    boutLog.push({
      phase: "fatigue",
      clock: st.tick * CLOCK_MULTIPLIER,
      data: {
        eastFatigue: st.east.boutFatigue,
        westFatigue: st.west.boutFatigue,
        fatigueDelta: Math.abs(st.east.boutFatigue - st.west.boutFatigue),
      },
    });
  }
}

interface PhaseLoopOutcome {
  winner: Side;
  kimarite: KimariteId | DrawOutcomeType;
  isTimeout: boolean;
  isDraw?: boolean;
  drawType?: DrawOutcomeType;
  mizuIriCount?: number;
}

/** Check whether a deadlocked center-ring belt battle warrants a mizu-iri water break. */
function maybeTriggerMizuIri(
  st: EngineStateV2,
  boutLog: BoutLogEntry[],
  mizuIriCount: number
): boolean {
  if (mizuIriCount >= MIZU_IRI_MAX_BREAKS) return false;
  const triggerTick = mizuIriCount === 0 ? MIZU_IRI_FIRST_TICK : MIZU_IRI_SECOND_TICK;
  if (st.tick !== triggerTick || st.phase.tag !== "belt_battle") return false;

  const { torqueEast, torqueWest } = st.phase.state;
  const torqueScale = Math.max(1, Math.abs(torqueEast) + Math.abs(torqueWest));
  if (Math.abs(torqueEast - torqueWest) > MIZU_IRI_TORQUE_BALANCE * torqueScale) return false;

  const maxDist = RING_RADIUS - MIZU_IRI_RING_MARGIN;
  if (Math.hypot(st.east.x, st.east.z) > maxDist || Math.hypot(st.west.x, st.west.z) > maxDist) {
    return false;
  }

  st.east.boutFatigue *= 1 - MIZU_IRI_FATIGUE_RECOVERY;
  st.west.boutFatigue *= 1 - MIZU_IRI_FATIGUE_RECOVERY;
  st.momentumScore *= 0.25;
  boutLog.push({
    phase: "mizu_iri",
    clock: st.tick * CLOCK_MULTIPLIER,
    data: {
      breakNumber: mizuIriCount + 1,
      eastFatigue: st.east.boutFatigue,
      westFatigue: st.west.boutFatigue,
    },
  });
  return true;
}

/** Resolve a regulation bout that reached MAX_TICKS without a finish. */
function resolveTimeoutOutcome(
  rng: SeededRNG,
  east: Rikishi,
  west: Rikishi,
  st: EngineStateV2,
  boutLog: BoutLogEntry[],
  mizuIriCount: number,
  isPlayoff?: boolean
): PhaseLoopOutcome {
  const eastInstability =
    Math.abs(st.east.cogOffset) / Math.max(INSTABILITY_FLOOR, st.east.footSpread);
  const westInstability =
    Math.abs(st.west.cogOffset) / Math.max(INSTABILITY_FLOOR, st.west.footSpread);

  // Non-playoff stalemate after repeated water breaks resolves to hikiwake draw
  if (
    !isPlayoff &&
    mizuIriCount >= MIZU_IRI_MAX_BREAKS &&
    Math.abs(eastInstability - westInstability) <= HIKIWAKE_MAX_INSTABILITY_GAP
  ) {
    boutLog.push({
      phase: "bout_timeout",
      clock: st.tick * CLOCK_MULTIPLIER,
      data: { eastInstability, westInstability, decisionBasis: "hikiwake_stalemate" },
    });
    return {
      winner: "east",
      kimarite: "hikiwake",
      isTimeout: true,
      isDraw: true,
      drawType: "hikiwake",
      mizuIriCount,
    };
  }

  const shinitaiResult = tryShinitai(eastInstability, westInstability, east, west);
  let winner: Side;
  if (shinitaiResult) {
    winner = shinitaiResult.winner;
    boutLog.push({
      phase: "bout_timeout",
      clock: st.tick * CLOCK_MULTIPLIER,
      data: {
        shinitai: true,
        eastInstability,
        westInstability,
        winner: shinitaiResult.winner,
        decisionBasis: "shinitai_balance_tiebreaker",
      },
    });
  } else {
    winner =
      eastInstability < westInstability
        ? "east"
        : westInstability < eastInstability
          ? "west"
          : skillTieBreak(east, west, "balance", rng);
  }

  const hadBelt =
    st.phase.tag === "belt_battle" ||
    (st.phase.tag === "edge_crisis" && st.phase.prev === "belt_battle");
  const kimarite: KimariteId = hadBelt ? "yorikiri" : "oshidashi";

  if (!shinitaiResult) {
    boutLog.push({
      phase: "bout_timeout",
      clock: st.tick * CLOCK_MULTIPLIER,
      data: {
        eastForce: st.phase.tag === "push_battle" ? st.phase.state.eastForce : 0,
        westForce: st.phase.tag === "push_battle" ? st.phase.state.westForce : 0,
        eastMomentum: st.momentumScore > 0 ? st.momentumScore : 0,
        westMomentum: st.momentumScore < 0 ? Math.abs(st.momentumScore) : 0,
        decisionBasis: eastInstability <= westInstability ? "east_stability" : "west_stability",
      },
    });
  }

  const loser: Side = winner === "east" ? "west" : "east";
  const loserInstability = winner === "east" ? westInstability : eastInstability;

  if (
    loserInstability > ISAMIASHI_INSTABILITY_THRESHOLD &&
    rng.next() < POST_RESOLUTION_REVERSAL_CHANCE
  ) {
    return { winner: loser, kimarite: "isamiashi", isTimeout: true, mizuIriCount };
  }

  if (!hadBelt && rng.next() < POST_RESOLUTION_REVERSAL_CHANCE) {
    return { winner: loser, kimarite: "tsukite", isTimeout: true, mizuIriCount };
  }

  return { winner, kimarite, isTimeout: true, mizuIriCount };
}

function runPhaseLoop(
  rng: SeededRNG,
  east: Rikishi,
  west: Rikishi,
  st: EngineStateV2,
  boutLog: BoutLogEntry[],
  division: import("@/engine/types/banzuke").Division,
  meta: { tone: string; drift: Record<string, number> },
  tactics?: SideTactics,
  isPlayoff?: boolean
): PhaseLoopOutcome {
  // CR-02: Henka may have resolved the bout at tachiai
  if (st.phase.tag === "resolved") {
    return { winner: st.phase.winner, kimarite: st.phase.technique, isTimeout: false };
  }

  let mizuIriCount = 0;
  for (let i = 0; i < MAX_TICKS; i++) {
    st.tick++;
    trackTickMomentumAndFatigue(st, boutLog);
    if (!isPlayoff && maybeTriggerMizuIri(st, boutLog, mizuIriCount)) {
      mizuIriCount++;
    }

    const pushResult = tickPushBattle(rng, east, west, st, boutLog, division, meta, tactics);
    if (pushResult?.winner && pushResult?.kimarite) {
      return {
        winner: pushResult.winner,
        kimarite: pushResult.kimarite,
        isTimeout: false,
        mizuIriCount,
      };
    }

    const beltResult = tickBeltBattle(rng, east, west, st, boutLog, division, meta, tactics);
    if (beltResult?.winner && beltResult?.kimarite) {
      return {
        winner: beltResult.winner,
        kimarite: beltResult.kimarite,
        isTimeout: false,
        mizuIriCount,
      };
    }

    const crisisResult = tickEdgeCrisis(rng, east, west, st, boutLog);
    if (crisisResult?.winner && crisisResult?.kimarite) {
      return {
        winner: crisisResult.winner,
        kimarite: crisisResult.kimarite,
        isTimeout: false,
        mizuIriCount,
      };
    }
  }

  return resolveTimeoutOutcome(rng, east, west, st, boutLog, mizuIriCount, isPlayoff);
}

// ---------------------------------------------------------------------------
export function resolveBoutPhysicsImpl(
  bout: BoutContext,
  east: Rikishi,
  west: Rikishi,
  basho: BashoState,
  meta?: { tone: string; drift: Record<string, number> }
): { result: BoutResult } {
  // Order-independent seed: the same pair produces the same bout regardless
  // of which rikishi is listed east vs west — removes a measurable ~5-6%
  // positional win bias caused by east.id always leading the seed string.
  const seed = `${basho.id ?? "basho"}-${basho.year ?? 0}-${bout.day}-${[east.id, west.id].sort().join("-")}`;
  const rng = rngFromSeed(seed, "bout", "root");

  const st = initEngineStateV2(bout, east, west);
  const boutLog: BoutLogEntry[] = [];
  resolveTachiaiV2(rng, bout, east, west, st, boutLog, basho);

  const effectiveMeta = meta || { tone: "classic", drift: {} };
  const division = east.division || west.division || "makushita";

  const resolved = runPhaseLoop(
    rng,
    east,
    west,
    st,
    boutLog,
    division,
    effectiveMeta,
    sideTactics(bout),
    bout.isPlayoff
  );
  const { winner, isTimeout, isDraw, drawType, mizuIriCount } = resolved;
  let { kimarite } = resolved;

  const hiwaza =
    isDraw || HIWAZA_IDS.has(kimarite as KimariteId)
      ? null
      : maybeClassifyHiwaza(winner, east, west, st, rng);
  if (hiwaza) {
    kimarite = hiwaza;
    boutLog.push({
      phase: "finish",
      clock: st.tick * CLOCK_MULTIPLIER,
      description: `Hiwaza: ${hiwaza}`,
      data: { hiwaza: true, loserSelfDefeat: true },
    });
  }

  const result = buildBoutResultV2(bout, east, west, st, winner, kimarite, boutLog, isTimeout, {
    isDraw,
    drawType,
    mizuIriCount,
  });

  return { result };
}
