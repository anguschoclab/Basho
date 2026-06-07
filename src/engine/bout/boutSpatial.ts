import { SeededRNG } from "../rng";
import type { Rikishi } from "../types/rikishi";
import type { Side } from "../types/banzuke";
import type { KimariteId } from "../types/combat";
import { TAWARA_RADIUS, SHIKIRISEN_OFFSET } from "../types/combat-spatial";
import type {
  PhysicalBody,
  HandGrip,
  GripClass,
  PushBattleState,
  BeltBattleState,
  EdgeCrisisState,
  EngineStateV2,
} from "../types/combat-spatial";
import { stat } from "./boutUtils";
import {
  MASS_BASE_OFFSET,
  MASS_WEIGHT_MULTIPLIER,
  DEFAULT_WEIGHT_STAT,
  DEFAULT_HEIGHT_STAT,
  HEIGHT_TO_METERS,
  COG_HEIGHT_FRACTION,
  BASE_FOOT_SPREAD,
  FOOT_SPREAD_BALANCE_VARIATION,
  TOE_POSITION_EDGE_THRESHOLD,
  EDGE_DISTANCE_AT_TOE,
  ARM_REACH_DEEP_THRESHOLD,
  MOMENTUM_THRESHOLD_OSHITAOSHI,
  TORQUE_THRESHOLD_HIGH,
  TORQUE_THRESHOLD_MODERATE,
  VELOCITY_EDGE_EXIT_THRESHOLD,
  TSUKIDASHI_PROBABILITY_THRESHOLD,
  TAWARA_BOUNCE_RESISTANCE_HEEL,
  UTCHARI_ESCAPE_ANGLE_THRESHOLD,
  UTCHARI_MIN_TICKS_IN_CRISIS,
  OKURIDASHI_PRESSURE_Z_THRESHOLD,
  OKURITAOSHI_PRESSURE_Z_THRESHOLD,
} from "../../constants/engine/physics";

export function initPhysicalBody(rikishi: Rikishi, side: Side): PhysicalBody {
  const x = side === "east" ? SHIKIRISEN_OFFSET : -SHIKIRISEN_OFFSET;
  const facingAngle = 0; // 1.75D: neutral facing; rotation comes from torque, not initial bias
  const mass = MASS_BASE_OFFSET + stat(rikishi, "weight", DEFAULT_WEIGHT_STAT) * MASS_WEIGHT_MULTIPLIER;
  const cogHeight = stat(rikishi, "height", DEFAULT_HEIGHT_STAT) * HEIGHT_TO_METERS * COG_HEIGHT_FRACTION;
  const footSpread = BASE_FOOT_SPREAD + (stat(rikishi, "balance") / 100) * FOOT_SPREAD_BALANCE_VARIATION;

  return {
    x,
    z: 0,
    facingAngle,
    mass,
    cogHeight,
    cogOffset: 0,
    footSpread,
    leadingFootX: x,
    velocityX: 0,
    velocityZ: 0,
    isFalling: false,
    boutFatigue: 0,
  };
}

export function isBodyFalling(body: PhysicalBody): boolean {
  const maxOffset = body.footSpread / 2;
  return Math.abs(body.cogOffset) > maxOffset;
}

export function isOutOfRing(body: PhysicalBody): boolean {
  const dist = Math.sqrt(body.x * body.x + body.z * body.z);
  return dist > TAWARA_RADIUS;
}

export function tawaraBounceResistance(toePos: number): number {
  if (toePos < 0) return 0;
  if (toePos < TOE_POSITION_EDGE_THRESHOLD) return EDGE_DISTANCE_AT_TOE;
  if (toePos < 1.0) return TAWARA_BOUNCE_RESISTANCE_HEEL;
  return 0;
}



export function deriveGripClass(left: HandGrip | null, right: HandGrip | null): GripClass {
  const insideCount = (left?.isInside ? 1 : 0) + (right?.isInside ? 1 : 0);

  // Both arms inside = morozashi (most dominant grip)
  if (insideCount === 2) return "morozashi";
  // One arm inside: deep reach = uwate (dominant inside), shallow = shitate (weaker inside)
  if (insideCount === 1) {
    const insideGrip = left?.isInside ? left : right;
    return (insideGrip?.armReach ?? 0) > ARM_REACH_DEEP_THRESHOLD ? "uwate" : "shitate";
  }
  if (left || right) return "outside";
  return "none";
}

export function classifyFallKimarite(
  push: PushBattleState,
  _st: EngineStateV2,
  fallenSide: Side
): KimariteId {
  const momentum = fallenSide === "east" ? push.eastMomentum : push.westMomentum;
  if (momentum > MOMENTUM_THRESHOLD_OSHITAOSHI) return "oshitaoshi";
  return "tsukitaoshi";
}

export function classifyBeltFallKimarite(
  belt: BeltBattleState,
  _st: EngineStateV2,
  fallenSide: Side
): KimariteId {
  const winnerSide = fallenSide === "east" ? "west" : "east";
  const winnerTorque = winnerSide === "east" ? belt.torqueEast : belt.torqueWest;
  const winnerGrip = fallenSide === "east" ? belt.westGripClass : belt.eastGripClass;

  if (winnerTorque > TORQUE_THRESHOLD_HIGH) {
    // High-torque throw: uwate (outside arm over) or shitate (inside arm under)
    return winnerGrip === "uwate" || winnerGrip === "morozashi" ? "uwatenage" : "shitatenage";
  }

  // E2: kotenage (arm-lock throw) when winner has shitate grip and moderate torque
  if (winnerGrip === "shitate" && winnerTorque > TORQUE_THRESHOLD_MODERATE && winnerTorque <= TORQUE_THRESHOLD_HIGH) {
    return "kotenage";
  }

  // E2: sukuinage (underarm throw) when winner has uwate grip and moderate torque
  if (winnerGrip === "uwate" && winnerTorque > TORQUE_THRESHOLD_MODERATE && winnerTorque <= TORQUE_THRESHOLD_HIGH) {
    return "sukuinage";
  }

  return "yoritaoshi";
}

export function classifyEdgeExitKimarite(
  crisis: EdgeCrisisState,
  st: EngineStateV2,
  rng: SeededRNG
): KimariteId {
  // Called when the fighter FAILS to escape.
  // 1.75D: classify using escapeAngle, opponentPressureZ, and lateral offset.
  const fromBelt = st.phase.tag === "edge_crisis" && st.phase.prev === "belt_battle";
  const crisisSide = crisis.side;
  const defenderSide = crisisSide === "east" ? "west" : "east";
  const defenderBody = defenderSide === "east" ? st.east : st.west;

  // 1.75D: utchari — defender pivoted at edge with high escapeAngle but still lost
  if (crisis.escapeAngle > UTCHARI_ESCAPE_ANGLE_THRESHOLD && crisis.ticksInCrisis >= UTCHARI_MIN_TICKS_IN_CRISIS) {
    return "utchari";
  }

  // 1.75D: okuridashi when defender has lateral momentum (off-axis overrun)
  if (Math.abs(crisis.opponentPressureZ) > OKURIDASHI_PRESSURE_Z_THRESHOLD && Math.abs(defenderBody.velocityX) > VELOCITY_EDGE_EXIT_THRESHOLD) {
    return "okuridashi";
  }

  // 1.75D: okuritaoshi when belt-driven with lateral component
  if (fromBelt && Math.abs(crisis.opponentPressureZ) > OKURITAOSHI_PRESSURE_Z_THRESHOLD) {
    return "okuritaoshi";
  }

  // E1: okuridashi when defender has positive momentum while exiting (overruns edge)
  if (Math.abs(defenderBody.velocityX) > VELOCITY_EDGE_EXIT_THRESHOLD) {
    return "okuridashi";
  }

  if (fromBelt) {
    // Belt-driven edge exit: walk-out (yorikiri) or throw-down (yoritaoshi)
    return crisis.ticksInCrisis > 4 ? "yoritaoshi" : "yorikiri";
  }

  // Push-driven edge exit: clean push-out or thrust variant
  if (crisis.ticksInCrisis <= 2) return "oshidashi";
  return rng.next() < TSUKIDASHI_PROBABILITY_THRESHOLD ? "tsukidashi" : "oshidashi";
}
