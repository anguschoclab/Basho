import { SeededRNG } from "../rng";
import type { Rikishi } from "../types/rikishi";
import type { Side } from "../types/banzuke";
import type { HandGrip, BeltBattleState } from "../types/combat-spatial";
import {
  LEVER_ARM_BASE,
  LEVER_ARM_TACHIAI_WIN,
  LEVER_ARM_TACHIAI_PARTIAL,
  LEVER_ARM_DEEP,
  LEVER_ARM_MAEMITSU,
  DEFAULT_ARM_REACH,
  ARM_REACH_DEEP_THRESHOLD,
  GRIP_JITTER_RANGE,
  INITIAL_ARM_REACH,
  GRIP_RANDOM_CHANCE,
  GRIP_RNG_FACTOR_MIN,
  GRIP_RNG_FACTOR_RANGE,
  MAX_ARM_REACH,
  ARM_REACH_INCREMENT,
  GRIP_DEEPEN_MARGIN,
  GRIP_DEEPEN_TECHNIQUE_MARGIN,
  GRIP_FATIGUE_DECAY_RATE,
  PRESSURE_GRIP_DECAY_RATE,
  PRESSURE_THRESHOLD,
  GRIP_STRENGTH_FLOOR,
  GRIP_BREAK_THRESHOLD,
  GRIP_BREAK_CHANCE,
  GRIP_BREAK_REACH_REDUCTION,
} from "../../constants/engine/physics";
import { deriveGripClass } from "./boutSpatial";
import { stat } from "./boutUtils";

/** Tachiai winner gets inside arm advantage on their preferred side. */
function applyTachiaiGripAdvantage(
  rng: SeededRNG,
  left: HandGrip,
  right: HandGrip,
  preferredGrip: string
): void {
  if (preferredGrip === "migi") {
    right.armReach = ARM_REACH_DEEP_THRESHOLD;
    right.isInside = true;
    right.leverArm = LEVER_ARM_TACHIAI_WIN;
  } else if (preferredGrip === "hidari") {
    left.armReach = ARM_REACH_DEEP_THRESHOLD;
    left.isInside = true;
    left.leverArm = LEVER_ARM_TACHIAI_WIN;
  } else {
    // No preference — tachiai momentum gives one random inside arm
    const useRight = rng.next() < GRIP_RANDOM_CHANCE;
    const arm = useRight ? right : left;
    arm.armReach = INITIAL_ARM_REACH;
    arm.isInside = true;
    arm.leverArm = LEVER_ARM_TACHIAI_PARTIAL;
  }
}

/**
 * Deep/maemitsu fighters start with superior lever arm geometry regardless of
 * tachiai outcome. Values exceed the tachiai-winner inside-arm bonus (0.29)
 * so deep grippers always lead. Standard stays at whatever the tachiai-winner
 * code set.
 */
function applyDepthLeverArm(
  left: HandGrip | null,
  right: HandGrip | null,
  depth: string
): void {
  const lever = depth === "deep" ? LEVER_ARM_DEEP : depth === "maemitsu" ? LEVER_ARM_MAEMITSU : null;
  if (lever === null) return;
  if (left) left.leverArm = lever;
  if (right) right.leverArm = lever;
}

export function initBeltBattle(
  rng: SeededRNG,
  east: Rikishi,
  west: Rikishi,
  tachiaiWinner: Side
): BeltBattleState {
  const preferredGripEast = east.combatProfile?.preferredGrip ?? "none";
  const preferredGripWest = west.combatProfile?.preferredGrip ?? "none";

  // Small random variation in initial grip strength, centered on 1.0
  // across a band of width GRIP_JITTER_RANGE (i.e. [0.95, 1.05] for 0.1).
  const rngVariation = () => 1 - GRIP_JITTER_RANGE / 2 + rng.next() * GRIP_JITTER_RANGE;
  const freshGrip = (): HandGrip => ({
    armReach: DEFAULT_ARM_REACH,
    isInside: false,
    leverArm: LEVER_ARM_BASE,
    gripStrength: rngVariation(),
    isBlocked: false,
  });

  const eastLeft = freshGrip();
  const eastRight = freshGrip();
  const westLeft = freshGrip();
  const westRight = freshGrip();

  // Handedness note: east faces west (facingAngle = π), so east's "migi" (right) hand
  // reaches across to grip west's left side (inside arm for east = right hand).
  if (tachiaiWinner === "east") {
    applyTachiaiGripAdvantage(rng, eastLeft, eastRight, preferredGripEast);
  } else {
    applyTachiaiGripAdvantage(rng, westLeft, westRight, preferredGripWest);
  }

  const eastGripClass = deriveGripClass(eastLeft, eastRight);
  const westGripClass = deriveGripClass(westLeft, westRight);

  // Apply preferredGripDepth — deep/maemitsu fighters start with higher lever arms
  const eastGripDepth = east.combatProfile?.preferredGripDepth ?? "standard";
  const westGripDepth = west.combatProfile?.preferredGripDepth ?? "standard";

  applyDepthLeverArm(eastLeft, eastRight, eastGripDepth);
  applyDepthLeverArm(westLeft, westRight, westGripDepth);

  const eastInitialForce = stat(east, "power");
  const westInitialForce = stat(west, "power");
  const torqueEast = computeNetTorque(eastLeft, eastRight, eastInitialForce);
  const torqueWest = computeNetTorque(westLeft, westRight, westInitialForce);

  return {
    eastLeft,
    eastRight,
    westLeft,
    westRight,
    eastGripClass,
    westGripClass,
    eastDepth: eastGripDepth,
    westDepth: westGripDepth,
    torqueEast,
    torqueWest,
    eastAngularAuthority: 0,
    westAngularAuthority: 0,
  };
}

/** Arm reach increases for the side holding a >12 technique margin. */
function deepenArmReach(belt: BeltBattleState, techniqueMargin: number, rngFactor: number): void {
  const increment = (grip: HandGrip | null): void => {
    if (grip && !grip.isBlocked) {
      grip.armReach = Math.min(MAX_ARM_REACH, grip.armReach + ARM_REACH_INCREMENT * rngFactor);
    }
  };
  if (techniqueMargin > GRIP_DEEPEN_MARGIN) {
    increment(belt.eastLeft);
    increment(belt.eastRight);
  } else if (techniqueMargin < -GRIP_DEEPEN_MARGIN) {
    increment(belt.westLeft);
    increment(belt.westRight);
  }
}

/** Grip depth evolution — a >15 technique margin deepens the winner's grip tier. */
function evolveDepthTier(belt: BeltBattleState, techniqueMargin: number): void {
  const deepen = (
    depth: BeltBattleState["eastDepth"],
    left: HandGrip | null,
    right: HandGrip | null
  ): BeltBattleState["eastDepth"] => {
    if (depth === "standard") {
      if (left) left.leverArm = LEVER_ARM_DEEP;
      if (right) right.leverArm = LEVER_ARM_DEEP;
      return "deep";
    }
    if (depth === "deep") {
      if (left) left.leverArm = LEVER_ARM_MAEMITSU;
      if (right) right.leverArm = LEVER_ARM_MAEMITSU;
      return "maemitsu";
    }
    return depth;
  };
  if (techniqueMargin > GRIP_DEEPEN_TECHNIQUE_MARGIN) {
    belt.eastDepth = deepen(belt.eastDepth, belt.eastLeft, belt.eastRight);
  } else if (techniqueMargin < -GRIP_DEEPEN_TECHNIQUE_MARGIN) {
    belt.westDepth = deepen(belt.westDepth, belt.westLeft, belt.westRight);
  }
}

/** Grip strength decay from fatigue + pressure strain on the losing side (1.8). */
function decayGripStrength(
  belt: BeltBattleState,
  eastFatigue: number,
  westFatigue: number
): void {
  // Grip strength decays with fatigue
  const eastFatigueDecay = 1 - eastFatigue * GRIP_FATIGUE_DECAY_RATE;
  const westFatigueDecay = 1 - westFatigue * GRIP_FATIGUE_DECAY_RATE;

  // Grip degradation under pressure (1.8): the losing side's grip degrades faster
  // due to defensive strain and being forced backwards
  const torqueDiff = belt.torqueEast - belt.torqueWest;
  const eastPressureDecay =
    torqueDiff < -PRESSURE_THRESHOLD ? Math.abs(torqueDiff) * PRESSURE_GRIP_DECAY_RATE : 0;
  const westPressureDecay =
    torqueDiff > PRESSURE_THRESHOLD ? torqueDiff * PRESSURE_GRIP_DECAY_RATE : 0;

  const eastTotalDecay = eastFatigueDecay - eastPressureDecay;
  const westTotalDecay = westFatigueDecay - westPressureDecay;

  if (belt.eastLeft) belt.eastLeft.gripStrength *= Math.max(GRIP_STRENGTH_FLOOR, eastTotalDecay);
  if (belt.eastRight) belt.eastRight.gripStrength *= Math.max(GRIP_STRENGTH_FLOOR, eastTotalDecay);
  if (belt.westLeft) belt.westLeft.gripStrength *= Math.max(GRIP_STRENGTH_FLOOR, westTotalDecay);
  if (belt.westRight) belt.westRight.gripStrength *= Math.max(GRIP_STRENGTH_FLOOR, westTotalDecay);
}

/** Breaks the weaker (or only) inside grip of a pair — isInside=false, reach reduced. */
function breakInsideGrip(left: HandGrip | null, right: HandGrip | null): void {
  const leftStrength = left?.isInside ? left.gripStrength : 0;
  const rightStrength = right?.isInside ? right.gripStrength : 0;
  let target: HandGrip | null = null;
  if (leftStrength > 0 && rightStrength > 0) {
    // Both inside — break the weaker one
    target = leftStrength <= rightStrength ? left : right;
  } else if (leftStrength > 0) {
    target = left;
  } else if (rightStrength > 0) {
    target = right;
  }
  if (target) {
    target.isInside = false;
    target.armReach = Math.max(
      DEFAULT_ARM_REACH,
      target.armReach - ARM_REACH_INCREMENT * GRIP_BREAK_REACH_REDUCTION
    );
  }
}

/**
 * Grip breaking under pressure (1.8): when torque differential is strongly
 * against a side, the dominant fighter can break the opponent's inside grip —
 * causing grip class downgrade (morozashi → uwate → shitate → outside).
 */
function maybeBreakGrip(rng: SeededRNG, belt: BeltBattleState): void {
  const torqueDiff = belt.torqueEast - belt.torqueWest;
  if (torqueDiff > GRIP_BREAK_THRESHOLD) {
    // East dominant — can break west's inside grips
    if (rng.next() < GRIP_BREAK_CHANCE) {
      breakInsideGrip(belt.westLeft, belt.westRight);
    }
  } else if (torqueDiff < -GRIP_BREAK_THRESHOLD) {
    // West dominant — can break east's inside grips
    if (rng.next() < GRIP_BREAK_CHANCE) {
      breakInsideGrip(belt.eastLeft, belt.eastRight);
    }
  }
}

export function evolveGripGeometry(
  rng: SeededRNG,
  east: Rikishi,
  west: Rikishi,
  belt: BeltBattleState,
  eastBoutFatigue = 0,
  westBoutFatigue = 0
): void {
  const eastTechnique = stat(east, "technique");
  const westTechnique = stat(west, "technique");
  const eastFatigue = (east.fatigue ?? 0) + eastBoutFatigue;
  const westFatigue = (west.fatigue ?? 0) + westBoutFatigue;

  const techniqueMargin = eastTechnique - westTechnique;

  // Random factor in grip evolution
  const rngFactor = GRIP_RNG_FACTOR_MIN + rng.next() * GRIP_RNG_FACTOR_RANGE;

  deepenArmReach(belt, techniqueMargin, rngFactor);
  evolveDepthTier(belt, techniqueMargin);
  decayGripStrength(belt, eastFatigue, westFatigue);
  maybeBreakGrip(rng, belt);

  // Update grip class
  belt.eastGripClass = deriveGripClass(belt.eastLeft, belt.eastRight);
  belt.westGripClass = deriveGripClass(belt.westLeft, belt.westRight);

  // Update torques — use rikishi power as the applied belt force
  const eastForce = stat(east, "power");
  const westForce = stat(west, "power");
  belt.torqueEast = computeNetTorque(belt.eastLeft, belt.eastRight, eastForce);
  belt.torqueWest = computeNetTorque(belt.westLeft, belt.westRight, westForce);
}

export function calculateTorque(grip: HandGrip, force: number): number {
  if (grip.isBlocked) return 0;
  return grip.leverArm * force * grip.gripStrength;
}

export function computeNetTorque(
  left: HandGrip | null,
  right: HandGrip | null,
  force: number
): number {
  let torque = 0;
  if (left) torque += calculateTorque(left, force);
  if (right) torque += calculateTorque(right, force);
  return torque;
}
