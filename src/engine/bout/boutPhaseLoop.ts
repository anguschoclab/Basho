// boutPhaseLoop.ts — Internal phase simulation for bout physics engine.
// All functions here are non-exported (private to this module).
// Called exclusively from resolveBoutPhysics in boutPhysics.ts.

import { rngFromSeed, SeededRNG } from "../rng";
import type { Rikishi } from "../types/rikishi";
import type { BoutResult, BashoState, BoutLogEntry } from "../types/basho";
import type { Side } from "../types/banzuke";
import type { KimariteId, GrappleState, HandPosition } from "../types/combat";
import { EDGE_THRESHOLD } from "../types/combat-spatial";
import type {
  CombatPhase,
  EngineStateV2,
  EngineSnapshot,
  PushBattleState,
  BeltBattleState,
} from "../types/combat-spatial";
import {
  initPhysicalBody,
  isBodyFalling,
  tawaraBounceResistance,
  classifyFallKimarite,
  classifyBeltFallKimarite,
  classifyEdgeExitKimarite,
} from "./boutSpatial";
import { initBeltBattle, evolveGripGeometry } from "./boutGrip";
import { evaluateKimariteAttempt } from "./kimariteClassifier";
import {
  stat,
  jitter,
  computeTachiaiPower,
  tachiaiPowerWithMatchupPenalty,
  h2hConfidence,
  boutFatigueIncrement,
  edgeCrisisRecoveryChance,
  type BoutContext,
} from "./boutUtils";
import {
  MAX_BOUT_TICKS,
  BELT_THRESHOLD_MAX,
  BELT_BIAS_DIVISOR,
  MASS_ADVANTAGE_MULTIPLIER,
  CONTEST_LINE_JITTER_MULTIPLIER,
  DISPLACEMENT_PER_FORCE,
  MIN_FORCE_AFTER_FATIGUE,
  FATIGUE_PENALTY_PER_POINT,
  TORQUE_VELOCITY_MULTIPLIER,
} from "../../constants/engine/physics";


// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

function initEngineStateV2(bout: BoutContext, east: Rikishi, west: Rikishi): EngineStateV2 {
  // Seed initial boutFatigue from tournament day — fighters arrive progressively
  // more worn down as the basho advances. Day 1 = fresh (0); Day 15 = ~11% extra
  // force penalty for an average-stamina fighter before the bout even starts.
  const tournamentFatigue = (bout.day - 1) * 5;
  return {
    tick: 0,
    phase: { tag: "approach" },
    east: { ...initPhysicalBody(east, "east"), boutFatigue: tournamentFatigue },
    west: { ...initPhysicalBody(west, "west"), boutFatigue: tournamentFatigue },
    tachiaiWinner: "east", // placeholder; set in resolveTachiaiV2
    grappleState: {
      east: { rightHand: "outside", leftHand: "outside", depth: "standard" },
      west: { rightHand: "outside", leftHand: "outside", depth: "standard" },
      gripAdvantage: "neutral",
    },
  };
}

// ---------------------------------------------------------------------------
// Tachiai
// ---------------------------------------------------------------------------

/**
 * Resolves the initial clash. May early-terminate the bout (henka) by setting
 * phase to "resolved" — callers must check for this before entering the loop.
 */
function resolveTachiaiV2(
  rng: SeededRNG,
  bout: BoutContext,
  east: Rikishi,
  west: Rikishi,
  st: EngineStateV2
): void {
  st.phase = { tag: "tachiai", impactVelocity: 8.0, contactAngle: 0 };

  // Tachiai power: power 50%, speed 30%, aggression 20% + jitter
  // Apply 8% penalty when opponent's style is in the rikishi's weakAgainstStyles list
  // Add h2h confidence bonus: (wins/total - 0.5)*8 when >= 3 prior meetings
  const eastPower =
    tachiaiPowerWithMatchupPenalty(east, west) + h2hConfidence(east, west.id) + jitter(rng, 8);
  const westPower =
    tachiaiPowerWithMatchupPenalty(west, east) + h2hConfidence(west, east.id) + jitter(rng, 8);
  const tachiaiWinner: Side = eastPower >= westPower ? "east" : "west";
  st.tachiaiWinner = tachiaiWinner;

  // CR-02: Henka resolution — must check before phase loop
  const henkaSide: Side | null =
    bout.playerTactic === "HENKA"
      ? (bout.playerSide ?? null)
      : bout.cpuTacticOverride === "HENKA"
        ? bout.playerSide === "east"
          ? "west"
          : "east"
        : null;

  if (henkaSide !== null) {
    const trickster = henkaSide === "east" ? east : west;
    const opponent = henkaSide === "east" ? west : east;
    // High-aggression opponents overcommit → more vulnerable to henka
    const henkaScore =
      stat(trickster, "technique") +
      computeTachiaiPower(opponent, { henkaVulnerabilityMode: true }) +
      jitter(rng, 8);
    const defenseScore = stat(opponent, "balance") + jitter(rng, 8);

    if (henkaScore > defenseScore) {
      st.phase = {
        tag: "resolved",
        winner: henkaSide,
        exitVector: { x: henkaSide === "east" ? 1 : -1, z: 0 },
        technique: "hatakikomi",
      };
      return;
    }
  }

  // Decide push vs belt battle (biased by combatProfile)
  const eastBeltBias = east.combatProfile?.familyPreferences?.belt ?? 25;
  const westBeltBias = west.combatProfile?.familyPreferences?.belt ?? 25;
  const beltThreshold = Math.min(BELT_THRESHOLD_MAX, (eastBeltBias + westBeltBias) / BELT_BIAS_DIVISOR);
  const useBelt = rng.next() < beltThreshold;

  const initialPush: PushBattleState = {
    contestLine: 0,
    eastForce: eastPower,
    westForce: westPower,
    eastLeadFoot: st.east.x,
    westLeadFoot: st.west.x,
    eastMomentum: eastPower,
    westMomentum: westPower,
  };

  if (useBelt) {
    const belt = initBeltBattle(rng, east, west, tachiaiWinner);
    st.phase = { tag: "belt_battle", state: belt, push: initialPush };
  } else {
    st.phase = { tag: "push_battle", state: initialPush };
  }
}

// ---------------------------------------------------------------------------
// Phase tick handlers
// ---------------------------------------------------------------------------

function tickPushBattle(
  rng: SeededRNG,
  east: Rikishi,
  west: Rikishi,
  st: EngineStateV2,
  division: import("../types/banzuke").Division,
  meta: { tone: string; drift: Record<string, number> }
): { winner?: Side; kimarite?: import("../types/combat").KimariteId } | undefined {
  if (st.phase.tag !== "push_battle") return undefined;

  const push = st.phase.state;

  // --- Fix Bug 1 & 2: Force-differential physics ---
  // Per-tick jitter breaks ties; only the LOSING fighter retreats and destabilises.
  // FIXED: Separate deterministic force differential from jitter to prevent tie-breaking.

  // Accumulate per-tick exertion — rate governed by stamina
  st.east.boutFatigue += boutFatigueIncrement(stat(east, "stamina"));
  st.west.boutFatigue += boutFatigueIncrement(stat(west, "stamina"));

  // Effective fatigue = pre-bout fatigue + in-bout accumulation
  const eastEffFatigue = stat(east, "fatigue") + st.east.boutFatigue * 0.4;
  const westEffFatigue = stat(west, "fatigue") + st.west.boutFatigue * 0.4;

  // Penalty: max 40% reduction (capped at fatigue ~100)
  const eastFatPenalty = Math.max(MIN_FORCE_AFTER_FATIGUE, 1 - eastEffFatigue * FATIGUE_PENALTY_PER_POINT);
  const westFatPenalty = Math.max(MIN_FORCE_AFTER_FATIGUE, 1 - westEffFatigue * FATIGUE_PENALTY_PER_POINT);

  const adjustedEastForce = push.eastForce * eastFatPenalty;
  const adjustedWestForce = push.westForce * westFatPenalty;

  const massAdvantageEast = (st.east.mass - st.west.mass) * MASS_ADVANTAGE_MULTIPLIER; // ~5 N per 20 kg difference

  // Calculate deterministic force differential (no jitter) for directional decisions
  const baseForceDiff = adjustedEastForce - adjustedWestForce + massAdvantageEast;

  // Apply jitter to contestLine for variation, but use baseForceDiff for directional decisions
  const jitteredContestLine = baseForceDiff + jitter(rng, 3);
  push.contestLine += jitteredContestLine * CONTEST_LINE_JITTER_MULTIPLIER;

  // Use absolute baseForceDiff for displacement (jitter affects magnitude via contestLine)
  const displacement = Math.abs(baseForceDiff) * DISPLACEMENT_PER_FORCE; // meters per tick

  // Only retreat/destabilize when there's a real force differential
  if (baseForceDiff > 0) {
    // East dominant — west retreats toward west's tawara (−4.55)
    push.westLeadFoot -= displacement;
    push.eastLeadFoot -= displacement;
    st.west.cogOffset += baseForceDiff * 0.003;
    st.west.velocityX = -baseForceDiff * 0.1;
    st.east.velocityX = -baseForceDiff * 0.1;
  } else if (baseForceDiff < 0) {
    // West dominant — east retreats toward east's tawara (+4.55)
    push.eastLeadFoot += displacement;
    push.westLeadFoot += displacement;
    st.east.cogOffset += Math.abs(baseForceDiff) * 0.003;
    st.east.velocityX = Math.abs(baseForceDiff) * 0.1;
    st.west.velocityX = Math.abs(baseForceDiff) * 0.1;
  }
  // When baseForceDiff === 0, neither retreats or destabilizes (tie)

  // CR-03: Sync PhysicalBody positions so kimariteClassifier reads current state
  st.east.x = push.eastLeadFoot;
  st.west.x = push.westLeadFoot;
  st.east.leadingFootX = push.eastLeadFoot;
  st.west.leadingFootX = push.westLeadFoot;

  // CI-03: Mid-fight kimarite attempt — emergent classification
  const attempt = evaluateKimariteAttempt(east, west, push, null, st, rng, division, meta);
  if (attempt) {
    const succeeded = rng.next() < attempt.successProbability;
    if (succeeded) {
      return { winner: attempt.side, kimarite: attempt.technique };
    }
  }

  // Falling check (extreme CoG offset)
  if (isBodyFalling(st.east)) {
    return { winner: "west", kimarite: classifyFallKimarite(push, st, "east") };
  }
  if (isBodyFalling(st.west)) {
    return { winner: "east", kimarite: classifyFallKimarite(push, st, "west") };
  }

  // CR-04: Boundary check using EDGE_THRESHOLD with signed comparisons
  if (push.eastLeadFoot >= EDGE_THRESHOLD) {
    st.phase = buildEdgeCrisis("east", push, undefined, "push_battle");
  } else if (push.westLeadFoot <= -EDGE_THRESHOLD) {
    st.phase = buildEdgeCrisis("west", push, undefined, "push_battle");
  }

  return undefined;
}

function tickBeltBattle(
  rng: SeededRNG,
  east: Rikishi,
  west: Rikishi,
  st: EngineStateV2,
  division: import("../types/banzuke").Division,
  meta: { tone: string; drift: Record<string, number> }
): { winner?: Side; kimarite?: import("../types/combat").KimariteId } | undefined {
  if (st.phase.tag !== "belt_battle") return undefined;

  const belt = st.phase.state;
  const push = st.phase.push;

  // Accumulate per-tick exertion — rate governed by stamina
  st.east.boutFatigue += boutFatigueIncrement(stat(east, "stamina"));
  st.west.boutFatigue += boutFatigueIncrement(stat(west, "stamina"));

  // Evolve grip geometry (arm reach, depth, grip strength decay)
  // Pass additional in-bout fatigue to grip decay
  const eastBoutFatigue = st.east.boutFatigue * 0.4;
  const westBoutFatigue = st.west.boutFatigue * 0.4;
  evolveGripGeometry(rng, east, west, belt, eastBoutFatigue, westBoutFatigue);

  const torqueAdvantage = belt.torqueEast - belt.torqueWest;

  // Apply torque to CoG — only the losing side destabilises
  if (torqueAdvantage > 0) {
    st.west.cogOffset += torqueAdvantage * 0.003;
  } else if (torqueAdvantage < 0) {
    st.east.cogOffset += Math.abs(torqueAdvantage) * 0.003;
  }
  // When torqueAdvantage === 0, neither destabilizes (tie)

  // Torque translates to positional displacement — only the retreating fighter moves
  const torqueDisplacementEast = Math.max(0, belt.torqueWest - belt.torqueEast) * 0.005;
  const torqueDisplacementWest = Math.max(0, belt.torqueEast - belt.torqueWest) * 0.005;
  push.eastLeadFoot += torqueDisplacementEast; // east retreats when west has more torque
  push.westLeadFoot -= torqueDisplacementWest; // west retreats when east has more torque

  // CR-03: Sync PhysicalBody
  st.east.x = push.eastLeadFoot;
  st.west.x = push.westLeadFoot;
  st.east.leadingFootX = push.eastLeadFoot;
  st.west.leadingFootX = push.westLeadFoot;

  // Set velocityX for classifier (torque-driven movement)
  if (torqueAdvantage > 0) {
    st.west.velocityX = torqueAdvantage * TORQUE_VELOCITY_MULTIPLIER;
    st.east.velocityX = 0;
  } else if (torqueAdvantage < 0) {
    st.east.velocityX = Math.abs(torqueAdvantage) * TORQUE_VELOCITY_MULTIPLIER;
    st.west.velocityX = 0;
  } else {
    // Tie: neither has velocity
    st.east.velocityX = 0;
    st.west.velocityX = 0;
  }

  // CI-03: Mid-fight kimarite attempt
  const attempt = evaluateKimariteAttempt(east, west, push, belt, st, rng, division, meta);
  if (attempt) {
    const succeeded = rng.next() < attempt.successProbability;
    if (succeeded) {
      return { winner: attempt.side, kimarite: attempt.technique };
    }
  }

  // Body fall check
  if (isBodyFalling(st.east)) {
    return { winner: "west", kimarite: classifyBeltFallKimarite(belt, st, "east") };
  }
  if (isBodyFalling(st.west)) {
    return { winner: "east", kimarite: classifyBeltFallKimarite(belt, st, "west") };
  }

  // CR-05A: Edge crisis — the LOSING side (less torque) goes into crisis
  if (Math.abs(torqueAdvantage) > 30) {
    const crisisSide: Side = torqueAdvantage > 0 ? "west" : "east";
    st.phase = buildEdgeCrisis(crisisSide, push, belt, "belt_battle");
  } else if (push.eastLeadFoot >= EDGE_THRESHOLD) {
    st.phase = buildEdgeCrisis("east", push, belt, "belt_battle");
  } else if (push.westLeadFoot <= -EDGE_THRESHOLD) {
    st.phase = buildEdgeCrisis("west", push, belt, "belt_battle");
  }

  return undefined;
}

function buildEdgeCrisis(
  crisisSide: Side,
  push: PushBattleState,
  belt: BeltBattleState | undefined,
  prev: "push_battle" | "belt_battle"
): Extract<CombatPhase, { tag: "edge_crisis" }> {
  const opponentPressure = crisisSide === "east" ? push.westMomentum : push.eastMomentum;

  // Compute initial tawaraToePosition from how far foot is past edge threshold
  const footPos = crisisSide === "east" ? push.eastLeadFoot : Math.abs(push.westLeadFoot);
  const overage = Math.max(0, footPos - EDGE_THRESHOLD);
  // Scale overage (0–0.75m) to toePosition (0–1.0)
  const initialToePos = Math.min(1.0, overage / 0.75);

  return {
    tag: "edge_crisis",
    crisis: {
      side: crisisSide,
      ticksInCrisis: 0,
      recoveryProbability: 0.3,
      tawaraToePosition: initialToePos,
      tawaraBounceForce: tawaraBounceResistance(initialToePos),
      escapeAngle: 0,
      escapeForceAvailable: crisisSide === "east" ? push.eastForce : push.westForce,
      opponentPressureX: opponentPressure,
      opponentPressureZ: 0,
      escaped: false,
    },
    prev,
    savedPush: push,
    savedBelt: belt,
  };
}

function tickEdgeCrisis(
  rng: SeededRNG,
  east: Rikishi,
  west: Rikishi,
  st: EngineStateV2,
  boutLog: BoutLogEntry[]
): { winner?: Side; kimarite?: KimariteId; escaped?: true } | undefined {
  if (st.phase.tag !== "edge_crisis") return undefined;

  const crisis = st.phase.crisis;
  const prev = st.phase.prev;
  crisis.ticksInCrisis++;

  // Update tawaraToePosition each tick using real opponent pressure
  const pressureIncrease = crisis.opponentPressureX * 0.02;
  const escapeResistance = crisis.escapeForceAvailable * 0.008;
  crisis.tawaraToePosition = Math.max(
    0,
    Math.min(2.0, crisis.tawaraToePosition + pressureIncrease - escapeResistance)
  );

  // Wire up tawaraBounceResistance from boutSpatial.ts
  const bounceForce = tawaraBounceResistance(crisis.tawaraToePosition);
  crisis.tawaraBounceForce = bounceForce;

  // When fully past tawara (toe > 1.5), no more recovery possible
  if (crisis.tawaraToePosition >= 1.5) {
    const kimarite = classifyEdgeExitKimarite(crisis, st, rng);
    const winner: Side = crisis.side === "east" ? "west" : "east";
    boutLog.push({
      phase: "edge_crisis",
      data: {
        side: crisis.side,
        escaped: false,
        tawaraToePosition: crisis.tawaraToePosition,
        forced: true,
      },
    });
    return { winner, kimarite };
  }

  // Recovery: mental composure (dominant) + balance (secondary) + tawara bounce
  const defenderRikishi = crisis.side === "east" ? east : west;
  const bounceBonus = bounceForce / 100; // 0.15 at heel contact, 0.08 at toe
  const tickDecay = Math.max(0.1, 1 - crisis.ticksInCrisis * 0.05);
  const recoveryChance = edgeCrisisRecoveryChance(
    defenderRikishi,
    crisis.recoveryProbability,
    bounceBonus,
    tickDecay
  );

  const didEscape = rng.next() < recoveryChance;

  // Log this crisis tick for narrative
  boutLog.push({
    phase: "edge_crisis",
    data: {
      side: crisis.side,
      escaped: didEscape,
      recoveryProbability: recoveryChance,
      tawaraToePosition: crisis.tawaraToePosition,
      ticksInCrisis: crisis.ticksInCrisis,
    },
  });

  if (didEscape) {
    // CI-04: Tawara drama — fighter escapes. Restore previous phase with absorbed momentum.
    if (prev === "belt_battle" && st.phase.savedBelt && st.phase.savedPush) {
      const restoredPush: PushBattleState = {
        ...st.phase.savedPush,
        eastMomentum: st.phase.savedPush.eastMomentum * 0.4,
        westMomentum: st.phase.savedPush.westMomentum * 0.4,
      };
      st.phase = { tag: "belt_battle", state: st.phase.savedBelt, push: restoredPush };
    } else if (st.phase.savedPush) {
      const restoredPush: PushBattleState = {
        ...st.phase.savedPush,
        eastMomentum: st.phase.savedPush.eastMomentum * 0.4,
        westMomentum: st.phase.savedPush.westMomentum * 0.4,
      };
      st.phase = { tag: "push_battle", state: restoredPush };
    }

    return { escaped: true };
  }

  // Fighter failed to escape — classify the exit
  const kimarite = classifyEdgeExitKimarite(crisis, st, rng);
  const winner: Side = crisis.side === "east" ? "west" : "east";
  return { winner, kimarite };
}

// ---------------------------------------------------------------------------
// Phase loop
// ---------------------------------------------------------------------------

function runPhaseLoop(
  rng: SeededRNG,
  east: Rikishi,
  west: Rikishi,
  st: EngineStateV2,
  boutLog: BoutLogEntry[],
  division: import("../types/banzuke").Division,
  meta: { tone: string; drift: Record<string, number> }
): { winner: Side; kimarite: KimariteId } {
  // CR-02: Henka may have resolved the bout at tachiai
  if (st.phase.tag === "resolved") {
    return { winner: st.phase.winner, kimarite: st.phase.technique };
  }

  for (let i = 0; i < MAX_BOUT_TICKS; i++) {
    st.tick++;

    const pushResult = tickPushBattle(rng, east, west, st, division, meta);
    if (pushResult?.winner && pushResult?.kimarite) {
      return { winner: pushResult.winner, kimarite: pushResult.kimarite };
    }

    const beltResult = tickBeltBattle(rng, east, west, st, division, meta);
    if (beltResult?.winner && beltResult?.kimarite) {
      return { winner: beltResult.winner, kimarite: beltResult.kimarite };
    }

    const crisisResult = tickEdgeCrisis(rng, east, west, st, boutLog);
    // ...
    if (crisisResult?.winner && crisisResult?.kimarite) {
      return { winner: crisisResult.winner, kimarite: crisisResult.kimarite };
    }
  }

  // Timeout — most stable rikishi wins (smallest cogOffset relative to footSpread)
  const eastInstability = Math.abs(st.east.cogOffset) / Math.max(0.01, st.east.footSpread);
  const westInstability = Math.abs(st.west.cogOffset) / Math.max(0.01, st.west.footSpread);
  const winner: Side = eastInstability <= westInstability ? "east" : "west";

  const hadBelt =
    st.phase.tag === "belt_battle" ||
    (st.phase.tag === "edge_crisis" && st.phase.prev === "belt_battle");
  const kimarite: KimariteId = hadBelt ? "yorikiri" : "oshidashi";

  // CI-05: Rare hi_waza reversals (isamiashi, tsukite)
  // "Winner" loses due to their own mistake. Probability scales inversely with the
  // loser's composure stats — a high-mental, high-balance fighter rarely steps out
  // accidentally; a green recruit at the tawara is much more prone to it.
  const loser: Side = winner === "east" ? "west" : "east";
  const loserInstability = winner === "east" ? westInstability : eastInstability;
  const loserRikishi = loser === "east" ? east : west;

  // isamiashi: steps out while overcommitting — mental + balance reduce chance
  // Range: ~0.75% (elite stats) to ~1.35% (low stats)
  const isamiashiChance =
    0.015 * (1 - (stat(loserRikishi, "mental") + stat(loserRikishi, "balance")) / 400);
  if (loserInstability > 0.9 && rng.next() < isamiashiChance) {
    return { winner: loser, kimarite: "isamiashi" };
  }

  // tsukite: thrust hand touches down — technique + mental reduce chance
  const tsukiteChance =
    0.015 * (1 - (stat(loserRikishi, "technique") + stat(loserRikishi, "mental")) / 400);
  if (!hadBelt && rng.next() < tsukiteChance) {
    return { winner: loser, kimarite: "tsukite" };
  }

  return { winner, kimarite };
}

// ---------------------------------------------------------------------------
// Result builders
// ---------------------------------------------------------------------------

function buildBoutResultV2(
  bout: BoutContext,
  east: Rikishi,
  west: Rikishi,
  st: EngineStateV2,
  winner: Side,
  kimarite: KimariteId,
  boutLog: BoutLogEntry[]
): BoutResult {
  const duration = Math.max(1, st.tick * 2);

  // Compute composite excitement score:
  //   - Bout length: up to 40 points (120 ticks max → ~40)
  //   - Each tawara escape: +20 points (dramatic near-defeats)
  //   - Grip reversals (inside→outside swaps in log): +10 points each
  const edgeCrisisEscapes = boutLog.filter(
    (e) => e.phase === "edge_crisis" && (e.data as Record<string, unknown>)?.escaped === true
  ).length;
  // Duration contributes up to 70 points (full 120-tick marathon = 70).
  // Each tawara escape adds 20 (dramatic near-defeats). Cap at 100.
  const excitementScore = Math.min(
    100,
    Math.round((st.tick / MAX_BOUT_TICKS) * 70 + edgeCrisisEscapes * 20)
  );

  const resolvedStance =
    st.phase.tag === "belt_battle" ||
    (st.phase.tag === "edge_crisis" && st.phase.prev === "belt_battle") ||
    st.phase.tag === "resolved"
      ? "belt-dominant"
      : "push-dominant";

  const winnerRikishi = winner === "east" ? east : west;
  const loserRikishi = winner === "east" ? west : east;
  const winnerRankNum = winnerRikishi.rankNumber ?? 99;
  const loserRankNum = loserRikishi.rankNumber ?? 99;
  const upset = winnerRankNum > loserRankNum;

  return {
    boutId: bout.id,
    winner,
    winnerRikishiId: winnerRikishi.id,
    loserRikishiId: loserRikishi.id,
    kimarite: kimarite as BoutResult["kimarite"],
    kimariteName: kimarite,
    stance: resolvedStance,
    tachiaiWinner: st.tachiaiWinner,
    duration,
    excitementScore,
    upset,
    isKinboshi: false, // set by boutResolver
    log: boutLog,
    kenshoEnvelopes: 0,
  };
}

/**
 * Build EngineSnapshot from final spatial state.
 * Provides real derived values for position, advantage, balance.
 */
function buildEngineSnapshotV2(st: EngineStateV2, winner: Side): EngineSnapshot {
  const beltPhase = st.phase.tag === "belt_battle" ? st.phase : null;
  const grappleState: GrappleState = beltPhase
    ? deriveGrappleStateFromBelt(beltPhase.state)
    : st.grappleState;
  st.grappleState = grappleState;

  const resolvedStance =
    st.phase.tag === "belt_battle" ||
    (st.phase.tag === "edge_crisis" && st.phase.prev === "belt_battle")
      ? ("belt-dominant" as const)
      : ("push-dominant" as const);

  // Derive position from average foot position
  const avgFoot = (Math.abs(st.east.leadingFootX) + Math.abs(st.west.leadingFootX)) / 2;
  const position: "front" | "lateral" | "rear" =
    avgFoot > 3.5 ? "rear" : avgFoot > 2.0 ? "lateral" : "front";

  // Derive advantage from CoG stability differential
  const advantage: "none" | "east" | "west" =
    st.east.cogOffset < st.west.cogOffset - 0.05
      ? "east"
      : st.west.cogOffset < st.east.cogOffset - 0.05
        ? "west"
        : "none";

  return {
    stance: resolvedStance,
    grappleState,
    balanceEast: Math.max(0, Math.min(100, 100 - Math.abs(st.east.cogOffset) * 10)),
    balanceWest: Math.max(0, Math.min(100, 100 - Math.abs(st.west.cogOffset) * 10)),
    position,
    advantage,
    winnerConsecutiveAdvantage: st.tick,
    loserLastActionFamily: undefined,
    finalLoserBalanceDrain:
      winner === "east" ? Math.abs(st.west.cogOffset) * 10 : Math.abs(st.east.cogOffset) * 10,
  };
}

/** Maps B+ BeltBattleState to legacy GrappleState. */
function deriveGrappleStateFromBelt(belt: BeltBattleState): GrappleState {
  const toHandPos = (grip: { isInside: boolean; isBlocked: boolean } | null): HandPosition =>
    grip === null ? "outside" : grip.isBlocked ? "blocked" : grip.isInside ? "inside" : "outside";

  const eastInsideCount = (belt.eastLeft?.isInside ? 1 : 0) + (belt.eastRight?.isInside ? 1 : 0);
  const westInsideCount = (belt.westLeft?.isInside ? 1 : 0) + (belt.westRight?.isInside ? 1 : 0);

  const gripAdvantage: GrappleState["gripAdvantage"] =
    eastInsideCount >= 2
      ? "moro_zashi_east"
      : westInsideCount >= 2
        ? "moro_zashi_west"
        : eastInsideCount > westInsideCount
          ? "east_strong"
          : westInsideCount > eastInsideCount
            ? "west_strong"
            : "neutral";

  const eastDepth =
    belt.eastDepth === "maemitsu" ? "maemitsu" : belt.eastDepth === "deep" ? "deep" : "standard";
  const westDepth =
    belt.westDepth === "maemitsu" ? "maemitsu" : belt.westDepth === "deep" ? "deep" : "standard";

  return {
    east: {
      rightHand: toHandPos(belt.eastRight),
      leftHand: toHandPos(belt.eastLeft),
      depth: eastDepth,
    },
    west: {
      rightHand: toHandPos(belt.westRight),
      leftHand: toHandPos(belt.westLeft),
      depth: westDepth,
    },
    gripAdvantage,
  };
}

// ---------------------------------------------------------------------------
// Public entry point (called from boutPhysics.ts barrel)
// ---------------------------------------------------------------------------

export function resolveBoutPhysicsImpl(
  bout: BoutContext,
  east: Rikishi,
  west: Rikishi,
  basho: BashoState,
  meta?: { tone: string; drift: Record<string, number> }
): { result: BoutResult; engineSnapshot: EngineSnapshot } {
  const seed = `${basho.id ?? "basho"}-${basho.year ?? 0}-${bout.day}-${east.id}-${west.id}`;
  const rng = rngFromSeed(seed, "bout", "root");

  const st = initEngineStateV2(bout, east, west);
  resolveTachiaiV2(rng, bout, east, west, st);

  const effectiveMeta = meta || { tone: "classic", drift: {} };
  const division = east.division || west.division || "makushita";

  const boutLog: BoutLogEntry[] = [];
  const { winner, kimarite } = runPhaseLoop(rng, east, west, st, boutLog, division, effectiveMeta);

  const result = buildBoutResultV2(bout, east, west, st, winner, kimarite, boutLog);
  const engineSnapshot = buildEngineSnapshotV2(st, winner);

  return { result, engineSnapshot };
}
