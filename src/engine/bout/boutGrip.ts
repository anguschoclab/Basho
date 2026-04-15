import { SeededRNG } from "../rng";
import type { Rikishi } from "../types/rikishi";
import type { Side } from "../types/banzuke";
import type { HandGrip, BeltBattleState } from "../types/combat-spatial";
import { deriveGripClass } from "./boutSpatial";

function stat(r: Rikishi, key: string, fallback = 50): number {
  const v = (r as unknown as Record<string, unknown>)[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export function initBeltBattle(
  rng: SeededRNG,
  east: Rikishi,
  west: Rikishi,
  tachiaiWinner: Side
): BeltBattleState {
  const preferredGripEast = east.combatProfile?.preferredGrip ?? "none";
  const preferredGripWest = west.combatProfile?.preferredGrip ?? "none";

  // Small random variation in initial grip strength
  const rngVariation = () => 0.95 + rng.next() * 0.1;

  const eastLeft: HandGrip = {
    armReach: 0.08,
    isInside: false,
    leverArm: 0.24,
    gripStrength: rngVariation(),
    isBlocked: false,
  };

  const eastRight: HandGrip = {
    armReach: 0.08,
    isInside: false,
    leverArm: 0.24,
    gripStrength: rngVariation(),
    isBlocked: false,
  };

  const westLeft: HandGrip = {
    armReach: 0.08,
    isInside: false,
    leverArm: 0.24,
    gripStrength: rngVariation(),
    isBlocked: false,
  };

  const westRight: HandGrip = {
    armReach: 0.08,
    isInside: false,
    leverArm: 0.24,
    gripStrength: rngVariation(),
    isBlocked: false,
  };

  // Tachiai winner gets inside arm advantage on their preferred side.
  // Handedness note: east faces west (facingAngle = π), so east's "migi" (right) hand
  // reaches across to grip west's left side (inside arm for east = right hand).
  if (tachiaiWinner === "east") {
    if (preferredGripEast === "migi") {
      eastRight.armReach = 0.12;
      eastRight.isInside = true;
      eastRight.leverArm = 0.29;
    } else if (preferredGripEast === "hidari") {
      eastLeft.armReach = 0.12;
      eastLeft.isInside = true;
      eastLeft.leverArm = 0.29;
    } else {
      // No preference — tachiai momentum gives one random inside arm
      const useRight = rng.next() < 0.5;
      if (useRight) {
        eastRight.armReach = 0.1;
        eastRight.isInside = true;
        eastRight.leverArm = 0.27;
      } else {
        eastLeft.armReach = 0.1;
        eastLeft.isInside = true;
        eastLeft.leverArm = 0.27;
      }
    }
  } else {
    if (preferredGripWest === "migi") {
      westRight.armReach = 0.12;
      westRight.isInside = true;
      westRight.leverArm = 0.29;
    } else if (preferredGripWest === "hidari") {
      westLeft.armReach = 0.12;
      westLeft.isInside = true;
      westLeft.leverArm = 0.29;
    } else {
      // No preference — tachiai momentum gives one random inside arm
      const useRight = rng.next() < 0.5;
      if (useRight) {
        westRight.armReach = 0.1;
        westRight.isInside = true;
        westRight.leverArm = 0.27;
      } else {
        westLeft.armReach = 0.1;
        westLeft.isInside = true;
        westLeft.leverArm = 0.27;
      }
    }
  }

  const eastGripClass = deriveGripClass(eastLeft, eastRight);
  const westGripClass = deriveGripClass(westLeft, westRight);

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
    eastDepth: "standard",
    westDepth: "standard",
    torqueEast,
    torqueWest,
  };
}

export function evolveGripGeometry(
  rng: SeededRNG,
  east: Rikishi,
  west: Rikishi,
  belt: BeltBattleState
): void {
  const eastTechnique = stat(east, "technique");
  const westTechnique = stat(west, "technique");
  const eastFatigue = east.fatigue ?? 0;
  const westFatigue = west.fatigue ?? 0;

  const techniqueMargin = eastTechnique - westTechnique;

  // Random factor in grip evolution
  const rngFactor = 0.9 + rng.next() * 0.2;

  // Arm reach increases when technique margin > 12
  if (techniqueMargin > 12) {
    if (belt.eastLeft && !belt.eastLeft.isBlocked) {
      belt.eastLeft.armReach = Math.min(0.15, belt.eastLeft.armReach + 0.005 * rngFactor);
    }
    if (belt.eastRight && !belt.eastRight.isBlocked) {
      belt.eastRight.armReach = Math.min(0.15, belt.eastRight.armReach + 0.005 * rngFactor);
    }
  } else if (techniqueMargin < -12) {
    if (belt.westLeft && !belt.westLeft.isBlocked) {
      belt.westLeft.armReach = Math.min(0.15, belt.westLeft.armReach + 0.005 * rngFactor);
    }
    if (belt.westRight && !belt.westRight.isBlocked) {
      belt.westRight.armReach = Math.min(0.15, belt.westRight.armReach + 0.005 * rngFactor);
    }
  }

  // Grip strength decays with fatigue
  const eastFatigueDecay = 1 - eastFatigue * 0.003;
  const westFatigueDecay = 1 - westFatigue * 0.003;

  if (belt.eastLeft) belt.eastLeft.gripStrength *= eastFatigueDecay;
  if (belt.eastRight) belt.eastRight.gripStrength *= eastFatigueDecay;
  if (belt.westLeft) belt.westLeft.gripStrength *= westFatigueDecay;
  if (belt.westRight) belt.westRight.gripStrength *= westFatigueDecay;

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
