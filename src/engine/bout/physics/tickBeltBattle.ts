import type { SeededRNG } from "../../rng";
import type { Rikishi } from "../../types/rikishi";
import type { BoutLogEntry } from "../../types/basho";
import type { Division } from "../../types/banzuke";
import type { KimariteId } from "../../types/combat";
import type { Side } from "../../types/banzuke";
import {
  ANGULAR_TORQUE_SCALE,
  ANGULAR_MAX_VELOCITY,
  ANGULAR_RESTORING_DECAY,
  TORQUE_DISPLACEMENT_MULTIPLIER,
  LATERAL_MAX_OFFSET,
  LATERAL_RESTORING_DECAY,
  LATERAL_ANGULAR_DRIFT_SCALE,
  BELT_BATTLE_VELOCITY_SCALE,
  COG_OFFSET_PER_FORCE,
  BELT_COG_OFFSET_SCALE,
  NARRATIVE_TICK_CADENCE,
  BOUT_FATIGUE_MULTIPLIER,
  CLOCK_MULTIPLIER,
  TORQUE_EDGE_CRISIS_THRESHOLD,
  COUNTER_TORQUE_REDUCTION,
  TORQUE_BONUS_FACTOR,
} from "../../../constants/engine/physics";
import { EDGE_THRESHOLD } from "../../types/combat-spatial";
import type { EngineStateV2 } from "../../types/combat-spatial";
import { isBodyFalling, classifyBeltFallKimarite } from "../boutSpatial";
import { evolveGripGeometry } from "../boutGrip";
import { evaluateKimariteAttempt } from "../kimariteClassifier";
import { stat, boutFatigueIncrement, type SideTactics } from "../boutUtils";
import { buildEdgeCrisis } from "./edgeCrisis";

type BeltState = EngineStateV2["phase"] extends infer P
  ? P extends { tag: "belt_battle"; state: infer S; push: infer Pu }
    ? { belt: S; push: Pu }
    : never
  : never;

/** Log grip-class and depth transition events (1.1). */
function logGripTransitions(
  belt: BeltState["belt"],
  prev: { eastGrip: unknown; westGrip: unknown; eastDepth: unknown; westDepth: unknown },
  st: EngineStateV2,
  boutLog: BoutLogEntry[]
): void {
  if (belt.eastGripClass !== prev.eastGrip || belt.westGripClass !== prev.westGrip) {
    boutLog.push({
      phase: "grip_transition",
      clock: st.tick * CLOCK_MULTIPLIER,
      data: {
        type: "grip_class_shift",
        eastGripFrom: prev.eastGrip,
        eastGripTo: belt.eastGripClass,
        westGripFrom: prev.westGrip,
        westGripTo: belt.westGripClass,
        eastRightInside: belt.eastRight?.isInside ?? false,
        eastLeftInside: belt.eastLeft?.isInside ?? false,
        westRightInside: belt.westRight?.isInside ?? false,
        westLeftInside: belt.westLeft?.isInside ?? false,
      },
    });
  }
  if (belt.eastDepth !== prev.eastDepth || belt.westDepth !== prev.westDepth) {
    boutLog.push({
      phase: "grip_transition",
      clock: st.tick * CLOCK_MULTIPLIER,
      data: {
        type: "depth_change",
        eastDepthFrom: prev.eastDepth,
        eastDepthTo: belt.eastDepth,
        westDepthFrom: prev.westDepth,
        westDepthTo: belt.westDepth,
      },
    });
  }
}

/**
 * Archetype-specific bout behavior (2.1) + body type behavior (5.1):
 * apply beltTorqueBonus to torque. In-bout counter-tactic activation (2.2):
 * when the defender's counterFamily matches the engagement family ("belt"),
 * reduce the attacker's effective torque.
 */
function computeTorqueAdvantage(
  east: Rikishi,
  west: Rikishi,
  belt: BeltState["belt"],
  st: EngineStateV2,
  boutLog: BoutLogEntry[]
): number {
  const eastTorqueBonus =
    ((east.combatProfile?.archetypeBehavior?.beltTorqueBonus ?? 0) +
      (east.combatProfile?.bodyTypeBehavior?.beltTorqueBonus ?? 0)) /
    100;
  const westTorqueBonus =
    ((west.combatProfile?.archetypeBehavior?.beltTorqueBonus ?? 0) +
      (west.combatProfile?.bodyTypeBehavior?.beltTorqueBonus ?? 0)) /
    100;
  // Apply torque bonus as additive bonus rather than multiplier to preserve simulation balance
  let torqueAdvantage =
    (belt.torqueEast - belt.torqueWest) *
    (1 + (eastTorqueBonus - westTorqueBonus) * TORQUE_BONUS_FACTOR);

  let counterActivated = false;
  let counterSide: Side | null = null;
  if (
    west.combatProfile?.counterFamily === "belt" &&
    east.combatProfile?.counterFamily !== "belt"
  ) {
    torqueAdvantage *= 1 - COUNTER_TORQUE_REDUCTION;
    counterActivated = true;
    counterSide = "west";
  } else if (
    east.combatProfile?.counterFamily === "belt" &&
    west.combatProfile?.counterFamily !== "belt"
  ) {
    torqueAdvantage *= 1 + COUNTER_TORQUE_REDUCTION;
    counterActivated = true;
    counterSide = "east";
  }
  if (counterActivated && counterSide && st.tick % NARRATIVE_TICK_CADENCE === 0) {
    boutLog.push({
      phase: "counter_tactic",
      clock: st.tick * CLOCK_MULTIPLIER,
      data: {
        event: "counter_tactic",
        side: counterSide,
        counterFamily: "belt",
        attackerFamily: "belt",
        torqueReduction: COUNTER_TORQUE_REDUCTION,
      },
    });
  }
  return torqueAdvantage;
}

// --- 1.75D Grip → Rotation ---
/** Angular velocity from torque advantage, rotation, restoring decay,
 *  and residual torque → linear displacement/CoG. */
function integrateAngular(
  st: EngineStateV2,
  belt: BeltState["belt"],
  push: BeltState["push"],
  torqueAdvantage: number
): void {
  const deltaAngle = Math.max(
    -ANGULAR_MAX_VELOCITY,
    Math.min(ANGULAR_MAX_VELOCITY, torqueAdvantage * ANGULAR_TORQUE_SCALE)
  );

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
  const residualTorqueEast =
    Math.max(0, belt.torqueWest - belt.torqueEast) * TORQUE_DISPLACEMENT_MULTIPLIER;
  const residualTorqueWest =
    Math.max(0, belt.torqueEast - belt.torqueWest) * TORQUE_DISPLACEMENT_MULTIPLIER;

  // Apply residual torque to CoG — only the losing side destabilises.
  // Belt grapples collapse more slowly than push exchanges (BELT_COG_OFFSET_SCALE).
  if (torqueAdvantage > 0) {
    st.west.cogOffset += Math.abs(torqueAdvantage) * COG_OFFSET_PER_FORCE * BELT_COG_OFFSET_SCALE;
  } else if (torqueAdvantage < 0) {
    st.east.cogOffset += Math.abs(torqueAdvantage) * COG_OFFSET_PER_FORCE * BELT_COG_OFFSET_SCALE;
  }

  // Positional displacement from residual torque
  push.eastLeadFoot += residualTorqueEast;
  push.westLeadFoot -= residualTorqueWest;
}

// --- 1.75D Lateral integration ---
/** Lateral drift from angular displacement + PhysicalBody sync. */
function integrateLateralAndSync(
  st: EngineStateV2,
  push: BeltState["push"],
  torqueAdvantage: number
): void {
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
  // Loser's outward velocity sign matches the direction they are pushed:
  // east retreats toward +x, west toward −x.
  st.east.velocityX =
    torqueAdvantage < 0 ? Math.abs(torqueAdvantage) * BELT_BATTLE_VELOCITY_SCALE : 0;
  st.west.velocityX = torqueAdvantage > 0 ? -torqueAdvantage * BELT_BATTLE_VELOCITY_SCALE : 0;
  st.east.velocityZ = push.eastLateralMomentum;
  st.west.velocityZ = push.westLateralMomentum;
}

/** Narrative cadence log entry every NARRATIVE_TICK_CADENCE ticks. */
function logBeltCadence(
  st: EngineStateV2,
  belt: BeltState["belt"],
  push: BeltState["push"],
  torqueAdvantage: number,
  boutLog: BoutLogEntry[]
): void {
  if (st.tick % NARRATIVE_TICK_CADENCE === 0) {
    boutLog.push({
      phase: "engagement",
      clock: st.tick * CLOCK_MULTIPLIER,
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
        eastGripClass: belt.eastGripClass,
        westGripClass: belt.westGripClass,
        eastDepth: belt.eastDepth,
        westDepth: belt.westDepth,
        eastTorque: belt.torqueEast,
        westTorque: belt.torqueWest,
        eastFatigue: st.east.boutFatigue,
        westFatigue: st.west.boutFatigue,
      },
    });
  }
}

/** Kimarite attempt, body-fall check, and edge-crisis transition. */
function resolveBeltOutcome(
  rng: SeededRNG,
  east: Rikishi,
  west: Rikishi,
  st: EngineStateV2,
  belt: BeltState["belt"],
  push: BeltState["push"],
  torqueAdvantage: number,
  division: Division,
  meta: { tone: string; drift: Record<string, number> },
  tactics?: SideTactics
): { winner?: Side; kimarite?: KimariteId } | undefined {
  // Mid-fight kimarite attempt
  const attempt = evaluateKimariteAttempt(east, west, push, belt, st, rng, division, meta, tactics);
  if (attempt) {
    const succeeded = rng.next() < attempt.successProbability;
    if (succeeded) {
      return { winner: attempt.side, kimarite: attempt.technique };
    }
  }

  // Body fall check
  if (isBodyFalling(st.east)) {
    return { winner: "west", kimarite: classifyBeltFallKimarite(belt, st, "east", rng) };
  }
  if (isBodyFalling(st.west)) {
    return { winner: "east", kimarite: classifyBeltFallKimarite(belt, st, "west", rng) };
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

export function tickBeltBattle(
  rng: SeededRNG,
  east: Rikishi,
  west: Rikishi,
  st: EngineStateV2,
  boutLog: BoutLogEntry[],
  division: Division,
  meta: { tone: string; drift: Record<string, number> },
  tactics?: SideTactics
): { winner?: Side; kimarite?: KimariteId } | undefined {
  if (st.phase.tag !== "belt_battle") return undefined;

  const belt = st.phase.state;
  const push = st.phase.push;

  // Accumulate per-tick exertion — rate governed by stamina
  st.east.boutFatigue += boutFatigueIncrement(stat(east, "stamina"));
  st.west.boutFatigue += boutFatigueIncrement(stat(west, "stamina"));

  // Evolve grip geometry (arm reach, depth, grip strength decay)
  const eastBoutFatigue = st.east.boutFatigue * BOUT_FATIGUE_MULTIPLIER;
  const westBoutFatigue = st.west.boutFatigue * BOUT_FATIGUE_MULTIPLIER;
  const prev = {
    eastGrip: belt.eastGripClass,
    westGrip: belt.westGripClass,
    eastDepth: belt.eastDepth,
    westDepth: belt.westDepth,
  };
  evolveGripGeometry(rng, east, west, belt, eastBoutFatigue, westBoutFatigue);

  // Log grip transition events (1.1)
  logGripTransitions(belt, prev, st, boutLog);

  const torqueAdvantage = computeTorqueAdvantage(east, west, belt, st, boutLog);

  integrateAngular(st, belt, push, torqueAdvantage);
  integrateLateralAndSync(st, push, torqueAdvantage);

  logBeltCadence(st, belt, push, torqueAdvantage, boutLog);

  return resolveBeltOutcome(rng, east, west, st, belt, push, torqueAdvantage, division, meta, tactics);
}
