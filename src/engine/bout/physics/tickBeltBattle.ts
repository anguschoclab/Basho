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
  NARRATIVE_TICK_CADENCE,
  BOUT_FATIGUE_MULTIPLIER,
  CLOCK_MULTIPLIER,
  TORQUE_EDGE_CRISIS_THRESHOLD,
} from "../../../constants/engine/physics";
import { EDGE_THRESHOLD } from "../../types/combat-spatial";
import type { EngineStateV2 } from "../../types/combat-spatial";
import { isBodyFalling, classifyBeltFallKimarite } from "../boutSpatial";
import { evolveGripGeometry } from "../boutGrip";
import { evaluateKimariteAttempt } from "../kimariteClassifier";
import { stat, boutFatigueIncrement } from "../boutUtils";
import { buildEdgeCrisis } from "./edgeCrisis";

export function tickBeltBattle(
  rng: SeededRNG,
  east: Rikishi,
  west: Rikishi,
  st: EngineStateV2,
  boutLog: BoutLogEntry[],
  division: Division,
  meta: { tone: string; drift: Record<string, number> },
  playerTactic?: import("../../types/combat").BoutTactic
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
  const prevEastGripClass = belt.eastGripClass;
  const prevWestGripClass = belt.westGripClass;
  const prevEastDepth = belt.eastDepth;
  const prevWestDepth = belt.westDepth;
  evolveGripGeometry(rng, east, west, belt, eastBoutFatigue, westBoutFatigue);

  // Log grip transition events (1.1)
  if (belt.eastGripClass !== prevEastGripClass || belt.westGripClass !== prevWestGripClass) {
    boutLog.push({
      phase: "grip_transition",
      clock: st.tick * CLOCK_MULTIPLIER,
      data: {
        type: "grip_class_shift",
        eastGripFrom: prevEastGripClass,
        eastGripTo: belt.eastGripClass,
        westGripFrom: prevWestGripClass,
        westGripTo: belt.westGripClass,
        eastRightInside: belt.eastRight?.isInside ?? false,
        eastLeftInside: belt.eastLeft?.isInside ?? false,
        westRightInside: belt.westRight?.isInside ?? false,
        westLeftInside: belt.westLeft?.isInside ?? false,
      },
    });
  }
  if (belt.eastDepth !== prevEastDepth || belt.westDepth !== prevWestDepth) {
    boutLog.push({
      phase: "grip_transition",
      clock: st.tick * CLOCK_MULTIPLIER,
      data: {
        type: "depth_change",
        eastDepthFrom: prevEastDepth,
        eastDepthTo: belt.eastDepth,
        westDepthFrom: prevWestDepth,
        westDepthTo: belt.westDepth,
      },
    });
  }

  // Archetype-specific bout behavior (2.1) + body type behavior (5.1): apply beltTorqueBonus to torque
  const eastTorqueBonus = ((east.combatProfile?.archetypeBehavior?.beltTorqueBonus ?? 0) + (east.combatProfile?.bodyTypeBehavior?.beltTorqueBonus ?? 0)) / 100;
  const westTorqueBonus = ((west.combatProfile?.archetypeBehavior?.beltTorqueBonus ?? 0) + (west.combatProfile?.bodyTypeBehavior?.beltTorqueBonus ?? 0)) / 100;
  // Apply torque bonus as additive bonus rather than multiplier to preserve simulation balance
  let torqueAdvantage = (belt.torqueEast - belt.torqueWest) * (1 + (eastTorqueBonus - westTorqueBonus) * 0.5);

  // In-bout counter-tactic activation (2.2): when defender's counterFamily matches
  // the current engagement family ("belt"), reduce attacker's effective torque
  const COUNTER_TORQUE_REDUCTION = 0.1; // 10% torque reduction when countered
  let counterActivated = false;
  let counterSide: Side | null = null;
  if (west.combatProfile?.counterFamily === "belt" && east.combatProfile?.counterFamily !== "belt") {
    torqueAdvantage *= (1 - COUNTER_TORQUE_REDUCTION);
    counterActivated = true;
    counterSide = "west";
  } else if (east.combatProfile?.counterFamily === "belt" && west.combatProfile?.counterFamily !== "belt") {
    torqueAdvantage *= (1 + COUNTER_TORQUE_REDUCTION);
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

  // --- 1.75D Grip → Rotation ---
  // Angular velocity from torque advantage, clamped per tick
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
  st.east.velocityX =
    torqueAdvantage < 0 ? Math.abs(torqueAdvantage) * BELT_BATTLE_VELOCITY_SCALE : 0;
  st.west.velocityX = torqueAdvantage > 0 ? torqueAdvantage * BELT_BATTLE_VELOCITY_SCALE : 0;
  st.east.velocityZ = push.eastLateralMomentum;
  st.west.velocityZ = push.westLateralMomentum;

  // Narrative cadence
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

  // Mid-fight kimarite attempt
  const attempt = evaluateKimariteAttempt(
    east,
    west,
    push,
    belt,
    st,
    rng,
    division,
    meta,
    playerTactic
  );
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
