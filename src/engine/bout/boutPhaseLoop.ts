// boutPhaseLoop.ts — Internal phase simulation for bout physics engine.
// All functions here are non-exported (private to this module).
// Called exclusively from resolveBoutPhysics in boutPhysics.ts.

import { rngFromSeed, SeededRNG } from "../rng";
import type { Rikishi } from "../types/rikishi";
import type { BoutResult, BashoState, BoutLogEntry } from "../types/basho";
import type { Side } from "../types/banzuke";
import type { KimariteId, GrappleState, HandPosition } from "../types/combat";
import { EDGE_THRESHOLD } from "../types/combat-spatial";
import {
  COG_OFFSET_PER_FORCE,
  TORQUE_DISPLACEMENT_MULTIPLIER,
  ESCAPE_RESISTANCE_MULTIPLIER,
  TOE_OVERAGE_SCALE,
  TOE_POSITION_FORCED_OUT,
  TOE_POSITION_MAX,
  TORQUE_EDGE_CRISIS_THRESHOLD,
  POSITION_REAR_THRESHOLD,
  POSITION_LATERAL_THRESHOLD,
  EDGE_ESCAPE_MOMENTUM_RETENTION,
  POST_RESOLUTION_REVERSAL_CHANCE,
  LATERAL_MAX_OFFSET,
  LATERAL_RESTORING_DECAY,
  LATERAL_IMPULSE_SPEED_SCALE,
  LATERAL_ANGULAR_DRIFT_SCALE,
  OFF_AXIS_FORCE_FALLOFF,
  ENGAGEMENT_ANGLE_GLANCING_THRESHOLD,
  ANGULAR_TORQUE_SCALE,
  ANGULAR_MAX_VELOCITY,
  ANGULAR_RESTORING_DECAY,
  UTCHARI_PIVOT_THRESHOLD,
  NARRATIVE_TICK_CADENCE,
  MIN_FORCE_AFTER_FATIGUE,
  MIN_ABSOLUTE_FORCE,
  FATIGUE_PENALTY_PER_POINT,
  MASS_ADVANTAGE_MULTIPLIER,
  DISPLACEMENT_PER_FORCE,
  CONTEST_LINE_JITTER_MULTIPLIER,
  CRISIS_PRESSURE_MULTIPLIER,
} from "../../constants/engine/physics";
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
  type BoutContext,
} from "./boutUtils";

const MAX_TICKS = 120;

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

function initEngineStateV2(bout: BoutContext, east: Rikishi, west: Rikishi): EngineStateV2 {
  void bout; // id/day used in seed; kept for signature clarity
  return {
    tick: 0,
    phase: { tag: "approach" },
    east: initPhysicalBody(east, "east"),
    west: initPhysicalBody(west, "west"),
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
  st: EngineStateV2,
  boutLog: BoutLogEntry[]
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

  // Narrative: the opening clash is always worth a line. Intensity scales with
  // how decisive the initial collision was.
  const tachiaiMargin = Math.abs(eastPower - westPower);
  boutLog.push({
    phase: "tachiai",
    clock: 0,
    data: { tachiaiWinner, margin: tachiaiMargin },
  });

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
      // Spatial henka: the trickster sidesteps and the opponent's own charge
      // carries them down. Log it so the narrative can call the trick.
      boutLog.push({
        phase: "tachiai",
        clock: 0,
        data: { event: "henka_success", attackerSide: henkaSide },
      });
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
  const beltThreshold = Math.min(0.7, (eastBeltBias + westBeltBias) / 200);
  const useBelt = rng.next() < beltThreshold;

  // Force/momentum never drop below MIN_ABSOLUTE_FORCE, so a degenerate
  // (near-zero stat) rikishi still has nonzero force — keeps escapeForceAvailable
  // and the force-differential math well-defined. Inert for normal stats
  // (eastPower/westPower are an order of magnitude above the floor).
  const eastForce = Math.max(MIN_ABSOLUTE_FORCE, eastPower);
  const westForce = Math.max(MIN_ABSOLUTE_FORCE, westPower);

  const initialPush: PushBattleState = {
    contestLine: 0,
    eastForce,
    westForce,
    eastLeadFoot: st.east.x,
    westLeadFoot: st.west.x,
    eastMomentum: eastForce,
    westMomentum: westForce,
    eastLateral: 0,
    westLateral: 0,
    eastLateralMomentum: 0,
    westLateralMomentum: 0,
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
  boutLog: BoutLogEntry[],
  division: import("../types/banzuke").Division,
  meta: { tone: string; drift: Record<string, number> }
): { winner?: Side; kimarite?: import("../types/combat").KimariteId } | undefined {
  if (st.phase.tag !== "push_battle") return undefined;

  const push = st.phase.state;

  // --- Force-differential physics ---
  // Per-tick jitter breaks ties; only the LOSING fighter retreats and destabilises.

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

  const massAdvantageEast = (st.east.mass - st.west.mass) * MASS_ADVANTAGE_MULTIPLIER;
  const jitteredForceDiff =
    adjustedEastForce - adjustedWestForce + massAdvantageEast + jitter(rng, 3);
  const displacement = Math.abs(jitteredForceDiff) * DISPLACEMENT_PER_FORCE;

  push.contestLine += jitteredForceDiff * CONTEST_LINE_JITTER_MULTIPLIER;

  // --- 1.75D Lateral integration ---
  // The defender can slip off-axis only when the attacker OVER-COMMITS (drives
  // with a large force differential). The slip is scaled by the defender's speed,
  // normalized to the 0–1 stat scale so it lives on the metre-scale lateral axis.
  // A balanced push (small force diff) produces no slip — fighters stay on the
  // contest line and the exchange reads as straight oshi-zumo.
  const lateralOffsetDiff = push.eastLateral - push.westLateral;
  const isGlancing = Math.abs(lateralOffsetDiff) > ENGAGEMENT_ANGLE_GLANCING_THRESHOLD;
  const forceFalloff = isGlancing ? OFF_AXIS_FORCE_FALLOFF : 1.0;

  if (jitteredForceDiff > 0) {
    // East dominant — west retreats toward west's tawara
    push.westLeadFoot -= displacement * forceFalloff;
    st.west.cogOffset += Math.abs(jitteredForceDiff) * COG_OFFSET_PER_FORCE;
    st.east.velocityX = jitteredForceDiff * 0.1;
    st.west.velocityX = 0;
    // Defender (west) drifts off the contest line, scaled by speed. Small per tick:
    // only a genuinely fast fighter accumulates enough over a sustained bout to
    // turn the exchange glancing; slow fighters stay square.
    push.westLateralMomentum += (stat(west, "speed") / 100) * LATERAL_IMPULSE_SPEED_SCALE;
  } else if (jitteredForceDiff < 0) {
    // West dominant — east retreats toward east's tawara
    push.eastLeadFoot += displacement * forceFalloff;
    st.east.cogOffset += Math.abs(jitteredForceDiff) * COG_OFFSET_PER_FORCE;
    st.west.velocityX = Math.abs(jitteredForceDiff) * 0.1;
    st.east.velocityX = 0;
    push.eastLateralMomentum += (stat(east, "speed") / 100) * LATERAL_IMPULSE_SPEED_SCALE;
  }

  // Integrate lateral position
  push.eastLateral += push.eastLateralMomentum;
  push.westLateral += push.westLateralMomentum;

  // Clamp lateral offset
  push.eastLateral = Math.max(-LATERAL_MAX_OFFSET, Math.min(LATERAL_MAX_OFFSET, push.eastLateral));
  push.westLateral = Math.max(-LATERAL_MAX_OFFSET, Math.min(LATERAL_MAX_OFFSET, push.westLateral));

  // Apply restoring decay
  push.eastLateral *= LATERAL_RESTORING_DECAY;
  push.westLateral *= LATERAL_RESTORING_DECAY;
  push.eastLateralMomentum *= LATERAL_RESTORING_DECAY;
  push.westLateralMomentum *= LATERAL_RESTORING_DECAY;

  // Sync PhysicalBody
  st.east.x = push.eastLeadFoot;
  st.west.x = push.westLeadFoot;
  st.east.z = push.eastLateral;
  st.west.z = push.westLateral;
  st.east.leadingFootX = push.eastLeadFoot;
  st.west.leadingFootX = push.westLeadFoot;
  st.east.velocityZ = push.eastLateralMomentum;
  st.west.velocityZ = push.westLateralMomentum;

  // Narrative cadence
  if (st.tick % NARRATIVE_TICK_CADENCE === 0) {
    boutLog.push({
      phase: "engagement",
      clock: st.tick * 2,
      data: {
        // A glancing exchange (large lateral offset) reads as a speed/evasion
        // beat rather than a straight oshi push, so route it to the speed family
        // and credit the fighter who slipped off-axis (the defender).
        tick: st.tick,
        family: isGlancing ? "speed" : "push",
        attackerSide: isGlancing
          ? jitteredForceDiff >= 0
            ? "west"
            : "east"
          : jitteredForceDiff >= 0
            ? "east"
            : "west",
        forceDiff: jitteredForceDiff,
        lateralOffsetDiff,
        engagementAngle: Math.abs(lateralOffsetDiff),
        eastLateral: push.eastLateral,
        westLateral: push.westLateral,
      },
    });
  }

  // Mid-fight kimarite attempt
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

  // Boundary check
  if (push.eastLeadFoot >= EDGE_THRESHOLD) {
    st.phase = buildEdgeCrisis("east", push, undefined, "push_battle", st);
  } else if (push.westLeadFoot <= -EDGE_THRESHOLD) {
    st.phase = buildEdgeCrisis("west", push, undefined, "push_battle", st);
  }

  return undefined;
}

function tickBeltBattle(
  rng: SeededRNG,
  east: Rikishi,
  west: Rikishi,
  st: EngineStateV2,
  boutLog: BoutLogEntry[],
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
  const eastBoutFatigue = st.east.boutFatigue * 0.4;
  const westBoutFatigue = st.west.boutFatigue * 0.4;
  evolveGripGeometry(rng, east, west, belt, eastBoutFatigue, westBoutFatigue);

  const torqueAdvantage = belt.torqueEast - belt.torqueWest;

  // --- 1.75D Grip → Rotation ---
  // Angular velocity from torque advantage, clamped per tick
  const deltaAngle = Math.max(-ANGULAR_MAX_VELOCITY, Math.min(ANGULAR_MAX_VELOCITY, torqueAdvantage * ANGULAR_TORQUE_SCALE));

  if (torqueAdvantage > 0) {
    // East has torque advantage → west rotates (loses angle)
    st.west.facingAngle -= deltaAngle;
    belt.eastAngularAuthority = deltaAngle;
    belt.westAngularAuthority = 0;
  } else if (torqueAdvantage < 0) {
    // West has torque advantage → east rotates
    st.east.facingAngle += deltaAngle;
    belt.westAngularAuthority = -deltaAngle;
    belt.eastAngularAuthority = 0;
  } else {
    belt.eastAngularAuthority = 0;
    belt.westAngularAuthority = 0;
  }

  // Apply angular restoring decay toward 0 (neutral facing)
  st.east.facingAngle *= ANGULAR_RESTORING_DECAY;
  st.west.facingAngle *= ANGULAR_RESTORING_DECAY;

  // Residual torque after rotation goes to linear displacement
  const residualTorqueEast = Math.max(0, belt.torqueWest - belt.torqueEast) * TORQUE_DISPLACEMENT_MULTIPLIER;
  const residualTorqueWest = Math.max(0, belt.torqueEast - belt.torqueWest) * TORQUE_DISPLACEMENT_MULTIPLIER;

  // Apply residual torque to CoG — only the losing side destabilises
  if (torqueAdvantage > 0) {
    st.west.cogOffset += Math.abs(torqueAdvantage) * COG_OFFSET_PER_FORCE;
  } else if (torqueAdvantage < 0) {
    st.east.cogOffset += Math.abs(torqueAdvantage) * COG_OFFSET_PER_FORCE;
  }

  // Positional displacement from residual torque
  push.eastLeadFoot += residualTorqueEast;
  push.westLeadFoot -= residualTorqueWest;

  // --- 1.75D Lateral integration ---
  // Lateral drift from angular displacement (rotation pushes fighters off-center)
  const eastAnglePush = st.east.facingAngle * LATERAL_ANGULAR_DRIFT_SCALE;
  const westAnglePush = st.west.facingAngle * LATERAL_ANGULAR_DRIFT_SCALE;
  push.eastLateralMomentum += eastAnglePush;
  push.westLateralMomentum += westAnglePush;

  push.eastLateral += push.eastLateralMomentum;
  push.westLateral += push.westLateralMomentum;

  push.eastLateral = Math.max(-LATERAL_MAX_OFFSET, Math.min(LATERAL_MAX_OFFSET, push.eastLateral));
  push.westLateral = Math.max(-LATERAL_MAX_OFFSET, Math.min(LATERAL_MAX_OFFSET, push.westLateral));

  push.eastLateral *= LATERAL_RESTORING_DECAY;
  push.westLateral *= LATERAL_RESTORING_DECAY;
  push.eastLateralMomentum *= LATERAL_RESTORING_DECAY;
  push.westLateralMomentum *= LATERAL_RESTORING_DECAY;

  // Sync PhysicalBody
  st.east.x = push.eastLeadFoot;
  st.west.x = push.westLeadFoot;
  st.east.z = push.eastLateral;
  st.west.z = push.westLateral;
  st.east.leadingFootX = push.eastLeadFoot;
  st.west.leadingFootX = push.westLeadFoot;
  st.east.velocityX = torqueAdvantage < 0 ? Math.abs(torqueAdvantage) * 0.05 : 0;
  st.west.velocityX = torqueAdvantage > 0 ? torqueAdvantage * 0.05 : 0;
  st.east.velocityZ = push.eastLateralMomentum;
  st.west.velocityZ = push.westLateralMomentum;

  // Narrative cadence
  if (st.tick % NARRATIVE_TICK_CADENCE === 0) {
    boutLog.push({
      phase: "engagement",
      clock: st.tick * 2,
      data: {
        tick: st.tick,
        family: "belt",
        attackerSide: torqueAdvantage >= 0 ? "east" : "west",
        torqueAdvantage,
        eastAngularAuthority: belt.eastAngularAuthority,
        westAngularAuthority: belt.westAngularAuthority,
        eastFacingAngle: st.east.facingAngle,
        westFacingAngle: st.west.facingAngle,
        eastLateral: push.eastLateral,
        westLateral: push.westLateral,
      },
    });
  }

  // Mid-fight kimarite attempt
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

  // Edge crisis — the LOSING side (less torque) goes into crisis
  if (Math.abs(torqueAdvantage) > TORQUE_EDGE_CRISIS_THRESHOLD) {
    const crisisSide: Side = torqueAdvantage > 0 ? "west" : "east";
    st.phase = buildEdgeCrisis(crisisSide, push, belt, "belt_battle", st);
  } else if (push.eastLeadFoot >= EDGE_THRESHOLD) {
    st.phase = buildEdgeCrisis("east", push, belt, "belt_battle", st);
  } else if (push.westLeadFoot <= -EDGE_THRESHOLD) {
    st.phase = buildEdgeCrisis("west", push, belt, "belt_battle", st);
  }

  return undefined;
}

function buildEdgeCrisis(
  crisisSide: Side,
  push: PushBattleState,
  belt: BeltBattleState | undefined,
  prev: "push_battle" | "belt_battle",
  st: EngineStateV2
): Extract<CombatPhase, { tag: "edge_crisis" }> {
  const opponentPressure = crisisSide === "east" ? push.westMomentum : push.eastMomentum;

  // Compute initial tawaraToePosition from how far foot is past edge threshold
  const footPos = crisisSide === "east" ? push.eastLeadFoot : Math.abs(push.westLeadFoot);
  const overage = Math.max(0, footPos - EDGE_THRESHOLD);
  const initialToePos = Math.min(1.0, overage / TOE_OVERAGE_SCALE);

  // 1.75D: escapeAngle derived from defender's facingAngle (rotation = pivoting at edge)
  const defender = crisisSide === "east" ? st.east : st.west;
  const escapeAngle = Math.abs(defender.facingAngle);

  // 1.75D: opponentPressureZ from attacker's lateral momentum
  const opponentPressureZ = crisisSide === "east" ? push.westLateralMomentum : push.eastLateralMomentum;

  return {
    tag: "edge_crisis",
    crisis: {
      side: crisisSide,
      ticksInCrisis: 0,
      recoveryProbability: 0.3,
      tawaraToePosition: initialToePos,
      tawaraBounceForce: tawaraBounceResistance(initialToePos),
      escapeAngle,
      escapeForceAvailable: crisisSide === "east" ? push.eastForce : push.westForce,
      opponentPressureX: opponentPressure,
      opponentPressureZ,
      escaped: false,
    },
    prev,
    savedPush: push,
    savedBelt: belt,
  };
}

function tickEdgeCrisis(
  rng: SeededRNG,
  _east: Rikishi,
  _west: Rikishi,
  st: EngineStateV2,
  boutLog: BoutLogEntry[]
): { winner?: Side; kimarite?: KimariteId; escaped?: true } | undefined {
  if (st.phase.tag !== "edge_crisis") return undefined;

  const crisis = st.phase.crisis;
  const prev = st.phase.prev;
  crisis.ticksInCrisis++;

  // Update tawaraToePosition each tick using real opponent pressure (X + Z)
  const pressureIncrease = crisis.opponentPressureX * CRISIS_PRESSURE_MULTIPLIER + Math.abs(crisis.opponentPressureZ) * 0.01;
  const escapeResistance = crisis.escapeForceAvailable * ESCAPE_RESISTANCE_MULTIPLIER;
  crisis.tawaraToePosition = Math.max(
    0,
    Math.min(TOE_POSITION_MAX, crisis.tawaraToePosition + pressureIncrease - escapeResistance)
  );

  const bounceForce = tawaraBounceResistance(crisis.tawaraToePosition);
  crisis.tawaraBounceForce = bounceForce;

  // When fully past tawara, no more recovery possible
  if (crisis.tawaraToePosition >= TOE_POSITION_FORCED_OUT) {
    const kimarite = classifyEdgeExitKimarite(crisis, st, rng);
    const winner: Side = crisis.side === "east" ? "west" : "east";
    boutLog.push({
      phase: "edge_crisis",
      data: {
        side: crisis.side,
        escaped: false,
        tawaraToePosition: crisis.tawaraToePosition,
        escapeAngle: crisis.escapeAngle,
        opponentPressureZ: crisis.opponentPressureZ,
        forced: true,
      },
    });
    return { winner, kimarite };
  }

  // 1.75D: Physics-driven escape — angular authority projected along escapeAngle vs opponent pressure
  const defender = crisis.side === "east" ? st.east : st.west;
  const angularEscapePower = Math.abs(defender.facingAngle) * 50; // rough projection scaling
  const totalPressure = crisis.opponentPressureX + Math.abs(crisis.opponentPressureZ);
  const canEscape = angularEscapePower >= totalPressure;

  // Seeded jitter as tie-breaker when close
  const escapeMargin = angularEscapePower - totalPressure;
  const didEscape = canEscape && (escapeMargin > 2 || rng.next() < 0.5 + escapeMargin * 0.05);

  // Log this crisis tick for narrative
  boutLog.push({
    phase: "edge_crisis",
    data: {
      side: crisis.side,
      escaped: didEscape,
      tawaraToePosition: crisis.tawaraToePosition,
      escapeAngle: crisis.escapeAngle,
      opponentPressureZ: crisis.opponentPressureZ,
      tawaraBounceForce: bounceForce,
      ticksInCrisis: crisis.ticksInCrisis,
    },
  });

  if (didEscape) {
    // Tawara drama — fighter escapes. Restore previous phase with absorbed momentum.
    if (prev === "belt_battle" && st.phase.savedBelt && st.phase.savedPush) {
      const restoredPush: PushBattleState = {
        ...st.phase.savedPush,
        eastMomentum: st.phase.savedPush.eastMomentum * EDGE_ESCAPE_MOMENTUM_RETENTION,
        westMomentum: st.phase.savedPush.westMomentum * EDGE_ESCAPE_MOMENTUM_RETENTION,
      };
      st.phase = { tag: "belt_battle", state: st.phase.savedBelt, push: restoredPush };
    } else if (st.phase.savedPush) {
      const restoredPush: PushBattleState = {
        ...st.phase.savedPush,
        eastMomentum: st.phase.savedPush.eastMomentum * EDGE_ESCAPE_MOMENTUM_RETENTION,
        westMomentum: st.phase.savedPush.westMomentum * EDGE_ESCAPE_MOMENTUM_RETENTION,
      };
      st.phase = { tag: "push_battle", state: restoredPush };
    }

    // High-angle pivot at edge = utchari classification on escape
    if (crisis.escapeAngle > UTCHARI_PIVOT_THRESHOLD) {
      boutLog.push({
        phase: "edge_crisis",
        data: { event: "utchari_pivot", side: crisis.side, escapeAngle: crisis.escapeAngle },
      });
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

  for (let i = 0; i < MAX_TICKS; i++) {
    st.tick++;

    const pushResult = tickPushBattle(rng, east, west, st, boutLog, division, meta);
    if (pushResult?.winner && pushResult?.kimarite) {
      return { winner: pushResult.winner, kimarite: pushResult.kimarite };
    }

    const beltResult = tickBeltBattle(rng, east, west, st, boutLog, division, meta);
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
  // Very rare (1.5% each) post-resolution reversals where "winner" loses due to own mistake
  const loser: Side = winner === "east" ? "west" : "east";
  const loserInstability = winner === "east" ? westInstability : eastInstability;

  // isamiashi: false start - only if loser was very unstable (near falling)
  if (loserInstability > 0.9 && rng.next() < POST_RESOLUTION_REVERSAL_CHANCE) {
    return { winner: loser, kimarite: "isamiashi" };
  }

  // tsukite: missed thrust - only if bout was push-dominant (no belt)
  if (!hadBelt && rng.next() < POST_RESOLUTION_REVERSAL_CHANCE) {
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
  const excitementScore = Math.min(100, Math.round(st.tick / 3 + edgeCrisisEscapes * 20));

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
    avgFoot > POSITION_REAR_THRESHOLD ? "rear" : avgFoot > POSITION_LATERAL_THRESHOLD ? "lateral" : "front";

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
  const boutLog: BoutLogEntry[] = [];
  resolveTachiaiV2(rng, bout, east, west, st, boutLog);

  const effectiveMeta = meta || { tone: "classic", drift: {} };
  const division = east.division || west.division || "makushita";

  const { winner, kimarite } = runPhaseLoop(rng, east, west, st, boutLog, division, effectiveMeta);

  const result = buildBoutResultV2(bout, east, west, st, winner, kimarite, boutLog);
  const engineSnapshot = buildEngineSnapshotV2(st, winner);

  return { result, engineSnapshot };
}
