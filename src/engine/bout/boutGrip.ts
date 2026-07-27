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
} from "../../constants/engine/physics";
import { deriveGripClass } from "./boutSpatial";
import { stat } from "./boutUtils";

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

  const eastLeft: HandGrip = {
    armReach: DEFAULT_ARM_REACH,
    isInside: false,
    leverArm: LEVER_ARM_BASE,
    gripStrength: rngVariation(),
    isBlocked: false,
  };

  const eastRight: HandGrip = {
    armReach: DEFAULT_ARM_REACH,
    isInside: false,
    leverArm: LEVER_ARM_BASE,
    gripStrength: rngVariation(),
    isBlocked: false,
  };

  const westLeft: HandGrip = {
    armReach: DEFAULT_ARM_REACH,
    isInside: false,
    leverArm: LEVER_ARM_BASE,
    gripStrength: rngVariation(),
    isBlocked: false,
  };

  const westRight: HandGrip = {
    armReach: DEFAULT_ARM_REACH,
    isInside: false,
    leverArm: LEVER_ARM_BASE,
    gripStrength: rngVariation(),
    isBlocked: false,
  };

  // Tachiai winner gets inside arm advantage on their preferred side.
  // Handedness note: east faces west (facingAngle = π), so east's "migi" (right) hand
  // reaches across to grip west's left side (inside arm for east = right hand).
  if (tachiaiWinner === "east") {
    if (preferredGripEast === "migi") {
      eastRight.armReach = ARM_REACH_DEEP_THRESHOLD;
      eastRight.isInside = true;
      eastRight.leverArm = LEVER_ARM_TACHIAI_WIN;
    } else if (preferredGripEast === "hidari") {
      eastLeft.armReach = ARM_REACH_DEEP_THRESHOLD;
      eastLeft.isInside = true;
      eastLeft.leverArm = LEVER_ARM_TACHIAI_WIN;
    } else {
      // No preference — tachiai momentum gives one random inside arm
      const useRight = rng.next() < GRIP_RANDOM_CHANCE;
      if (useRight) {
        eastRight.armReach = INITIAL_ARM_REACH;
        eastRight.isInside = true;
        eastRight.leverArm = LEVER_ARM_TACHIAI_PARTIAL;
      } else {
        eastLeft.armReach = INITIAL_ARM_REACH;
        eastLeft.isInside = true;
        eastLeft.leverArm = LEVER_ARM_TACHIAI_PARTIAL;
      }
    }
  } else {
    if (preferredGripWest === "migi") {
      westRight.armReach = ARM_REACH_DEEP_THRESHOLD;
      westRight.isInside = true;
      westRight.leverArm = LEVER_ARM_TACHIAI_WIN;
    } else if (preferredGripWest === "hidari") {
      westLeft.armReach = ARM_REACH_DEEP_THRESHOLD;
      westLeft.isInside = true;
      westLeft.leverArm = LEVER_ARM_TACHIAI_WIN;
    } else {
      // No preference — tachiai momentum gives one random inside arm
      const useRight = rng.next() < GRIP_RANDOM_CHANCE;
      if (useRight) {
        westRight.armReach = INITIAL_ARM_REACH;
        westRight.isInside = true;
        westRight.leverArm = LEVER_ARM_TACHIAI_PARTIAL;
      } else {
        westLeft.armReach = INITIAL_ARM_REACH;
        westLeft.isInside = true;
        westLeft.leverArm = LEVER_ARM_TACHIAI_PARTIAL;
      }
    }
  }

  const eastGripClass = deriveGripClass(eastLeft, eastRight);
  const westGripClass = deriveGripClass(westLeft, westRight);

  // Apply preferredGripDepth — deep/maemitsu fighters start with higher lever arms
  const eastGripDepth = east.combatProfile?.preferredGripDepth ?? "standard";
  const westGripDepth = west.combatProfile?.preferredGripDepth ?? "standard";

  // deep/maemitsu fighters start with superior lever arm geometry regardless of tachiai outcome.
  // Values exceed the tachiai-winner inside-arm bonus (0.29) so deep grippers always lead.
  const applyDepthLeverArm = (
    left: typeof eastLeft,
    right: typeof eastRight,
    depth: typeof eastGripDepth
  ) => {
    if (depth === "deep") {
      const lever = LEVER_ARM_DEEP;
      if (left) {
        left.leverArm = lever;
      }
      if (right) {
        right.leverArm = lever;
      }
    } else if (depth === "maemitsu") {
      const lever = LEVER_ARM_MAEMITSU;
      if (left) {
        left.leverArm = lever;
      }
      if (right) {
        right.leverArm = lever;
      }
    }
    // standard stays at whatever the tachiai-winner code set
  };

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

  // Arm reach increases when technique margin > 12
  if (techniqueMargin > GRIP_DEEPEN_MARGIN) {
    if (belt.eastLeft && !belt.eastLeft.isBlocked) {
      belt.eastLeft.armReach = Math.min(
        MAX_ARM_REACH,
        belt.eastLeft.armReach + ARM_REACH_INCREMENT * rngFactor
      );
    }
    if (belt.eastRight && !belt.eastRight.isBlocked) {
      belt.eastRight.armReach = Math.min(
        MAX_ARM_REACH,
        belt.eastRight.armReach + ARM_REACH_INCREMENT * rngFactor
      );
    }
  } else if (techniqueMargin < -GRIP_DEEPEN_MARGIN) {
    if (belt.westLeft && !belt.westLeft.isBlocked) {
      belt.westLeft.armReach = Math.min(
        MAX_ARM_REACH,
        belt.westLeft.armReach + ARM_REACH_INCREMENT * rngFactor
      );
    }
    if (belt.westRight && !belt.westRight.isBlocked) {
      belt.westRight.armReach = Math.min(
        MAX_ARM_REACH,
        belt.westRight.armReach + ARM_REACH_INCREMENT * rngFactor
      );
    }
  }

  // Grip depth evolution based on technique margin
  // When technique margin > 15, winner can deepen grip
  if (techniqueMargin > GRIP_DEEPEN_TECHNIQUE_MARGIN) {
    if (belt.eastDepth === "standard") {
      belt.eastDepth = "deep";
      // Update lever arms for deeper grip
      if (belt.eastLeft) belt.eastLeft.leverArm = LEVER_ARM_DEEP;
      if (belt.eastRight) belt.eastRight.leverArm = LEVER_ARM_DEEP;
    } else if (belt.eastDepth === "deep") {
      belt.eastDepth = "maemitsu";
      // Update lever arms for maemitsu grip
      if (belt.eastLeft) belt.eastLeft.leverArm = LEVER_ARM_MAEMITSU;
      if (belt.eastRight) belt.eastRight.leverArm = LEVER_ARM_MAEMITSU;
    }
  } else if (techniqueMargin < -GRIP_DEEPEN_TECHNIQUE_MARGIN) {
    if (belt.westDepth === "standard") {
      belt.westDepth = "deep";
      if (belt.westLeft) belt.westLeft.leverArm = LEVER_ARM_DEEP;
      if (belt.westRight) belt.westRight.leverArm = LEVER_ARM_DEEP;
    } else if (belt.westDepth === "deep") {
      belt.westDepth = "maemitsu";
      if (belt.westLeft) belt.westLeft.leverArm = LEVER_ARM_MAEMITSU;
      if (belt.westRight) belt.westRight.leverArm = LEVER_ARM_MAEMITSU;
    }
  }

  // Grip strength decays with fatigue
  const eastFatigueDecay = 1 - eastFatigue * 0.003;
  const westFatigueDecay = 1 - westFatigue * 0.003;

  // Grip degradation under pressure (1.8): the losing side's grip degrades faster
  // due to defensive strain and being forced backwards
  const torqueDiff = belt.torqueEast - belt.torqueWest;
  const PRESSURE_GRIP_DECAY = 0.001;
  const PRESSURE_THRESHOLD = 20;
  const eastPressureDecay = torqueDiff < -PRESSURE_THRESHOLD ? Math.abs(torqueDiff) * PRESSURE_GRIP_DECAY : 0;
  const westPressureDecay = torqueDiff > PRESSURE_THRESHOLD ? torqueDiff * PRESSURE_GRIP_DECAY : 0;

  const eastTotalDecay = eastFatigueDecay - eastPressureDecay;
  const westTotalDecay = westFatigueDecay - westPressureDecay;

  if (belt.eastLeft) belt.eastLeft.gripStrength *= Math.max(0.5, eastTotalDecay);
  if (belt.eastRight) belt.eastRight.gripStrength *= Math.max(0.5, eastTotalDecay);
  if (belt.westLeft) belt.westLeft.gripStrength *= Math.max(0.5, westTotalDecay);
  if (belt.westRight) belt.westRight.gripStrength *= Math.max(0.5, westTotalDecay);

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
