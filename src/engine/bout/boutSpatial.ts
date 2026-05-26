import { SeededRNG } from "../rng";
import type { Rikishi } from "../types/rikishi";
import type { Side } from "../types/banzuke";
import type { CombatAction } from "../types/combat";
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
  FORCE_POWER_MULTIPLIER,
  FORCE_WEIGHT_MULTIPLIER,
  MIN_FORCE_AFTER_FATIGUE,
  FATIGUE_PENALTY_PER_POINT,
  MIN_ABSOLUTE_FORCE,
  GRIP_JITTER_RANGE,
  ARM_REACH_DEEP_THRESHOLD,
  MOMENTUM_THRESHOLD_OSHITAOSHI,
  TORQUE_THRESHOLD_HIGH,
  TORQUE_THRESHOLD_MODERATE,
  VELOCITY_EDGE_EXIT_THRESHOLD,
  TSUKIDASHI_PROBABILITY_THRESHOLD,
} from "../../constants/engine/physics";

export function initPhysicalBody(rikishi: Rikishi, side: Side): PhysicalBody {
  const x = side === "east" ? SHIKIRISEN_OFFSET : -SHIKIRISEN_OFFSET;
  const facingAngle = side === "east" ? Math.PI : 0;
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
  const distance = Math.sqrt(body.x * body.x + body.z * body.z);
  return distance > TAWARA_RADIUS;
}

export function tawaraBounceResistance(toePos: number): number {
  if (toePos < 0) return 0;
  if (toePos < TOE_POSITION_EDGE_THRESHOLD) return EDGE_DISTANCE_AT_TOE;
  if (toePos < 1.0) return 8.0;
  return 0;
}

export function computePushForce(
  rikishi: Rikishi,
  action: CombatAction,
  _stanceWidth: number,
  fatigue: number
): number {
  // Rikishi.power is the primary strength stat (not "strength")
  const power = stat(rikishi, "power");
  const weight = stat(rikishi, "weight");
  const w = action.statWeighting;

  // Base force from power + weight contribution; stanceWidth affects CoG stability, not raw force
  let force = power * (w.strength || FORCE_POWER_MULTIPLIER) + weight * (w.weight || FORCE_WEIGHT_MULTIPLIER);
  // Fatigue penalty: -0.4% per fatigue point (same curve as old engine)
  force *= Math.max(MIN_FORCE_AFTER_FATIGUE, 1 - fatigue * FATIGUE_PENALTY_PER_POINT);

  return Math.max(MIN_ABSOLUTE_FORCE, force);
}

export function computePushAngle(
  _action: CombatAction,
  myBody: PhysicalBody,
  opponentBody: PhysicalBody,
  rng: SeededRNG
): number {
  const dx = opponentBody.x - myBody.x;
  const dz = opponentBody.z - myBody.z;
  const baseAngle = Math.atan2(dz, dx);
  const jitter = (rng.next() - 0.5) * GRIP_JITTER_RANGE;
  return baseAngle + jitter;
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
  // This is called when the fighter FAILS to escape (rng failed recoveryProbability).
  // Classify by which phase drove them to the edge and how long they resisted.
  const fromBelt = st.phase.tag === "edge_crisis" && st.phase.prev === "belt_battle";
  const crisisSide = crisis.side;
  const defenderSide = crisisSide === "east" ? "west" : "east";
  const defenderBody = defenderSide === "east" ? st.east : st.west;

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
