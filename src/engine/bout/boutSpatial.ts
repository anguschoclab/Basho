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
  classifyPushFallKimarite,
  classifyBeltFallKimariteV2,
  classifyBeltExitKimarite,
  classifyPushExitKimarite,
} from "./terminalKimarite";
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
  VELOCITY_EDGE_EXIT_THRESHOLD,
  TAWARA_BOUNCE_RESISTANCE_HEEL,
  UTCHARI_ESCAPE_ANGLE_THRESHOLD,
  UTCHARI_MIN_TICKS_IN_CRISIS,
  OKURIDASHI_PRESSURE_Z_THRESHOLD,
  OKURITAOSHI_PRESSURE_Z_THRESHOLD,
} from "../../constants/engine/physics";

export function initPhysicalBody(rikishi: Rikishi, side: Side): PhysicalBody {
  const x = side === "east" ? SHIKIRISEN_OFFSET : -SHIKIRISEN_OFFSET;
  const facingAngle = 0; // 1.75D: neutral facing; rotation comes from torque, not initial bias
  const mass =
    MASS_BASE_OFFSET + stat(rikishi, "weight", DEFAULT_WEIGHT_STAT) * MASS_WEIGHT_MULTIPLIER;
  const cogHeight =
    stat(rikishi, "height", DEFAULT_HEIGHT_STAT) * HEIGHT_TO_METERS * COG_HEIGHT_FRACTION;
  const footSpread =
    BASE_FOOT_SPREAD + (stat(rikishi, "balance") / 100) * FOOT_SPREAD_BALANCE_VARIATION;

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
  fallenSide: Side,
  rng: SeededRNG
): KimariteId {
  // Push-side collapse → contextual weighted draw over the pulldown family.
  // Loser overcommitting (high own momentum at the fall) biases toward the
  // momentum-capture techniques (hatakikomi, hikiotoshi, tsukiotoshi).
  const momentum = fallenSide === "east" ? push.eastMomentum : push.westMomentum;
  return classifyPushFallKimarite(rng, {
    loserOvercommitted: momentum > MOMENTUM_THRESHOLD_OSHITAOSHI,
  });
}

export function classifyBeltFallKimarite(
  belt: BeltBattleState,
  st: EngineStateV2,
  fallenSide: Side,
  rng: SeededRNG
): KimariteId {
  const winnerSide = fallenSide === "east" ? "west" : "east";
  const winnerGrip = fallenSide === "east" ? belt.westGripClass : belt.eastGripClass;
  const winnerBody = winnerSide === "east" ? st.east : st.west;

  // Winner desperation: also falling, or driven to the tawara — unlocks the
  // sorite unicorns (winner sacrifices posture to throw) and reversals.
  // Winner desperation: falling, near-falling, or driven to the tawara —
  // unlocks the sorite unicorns (winner sacrifices posture to throw) and
  // the reversal tail (utchari, yobimodoshi, ushiromotare).
  const winnerDesperate =
    Math.abs(winnerBody.cogOffset) > winnerBody.footSpread / 3 ||
    Math.abs(winnerBody.leadingFootX) >= TOE_POSITION_EDGE_THRESHOLD * TAWARA_RADIUS;

  return classifyBeltFallKimariteV2(rng, winnerGrip, winnerDesperate);
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
  if (
    crisis.escapeAngle > UTCHARI_ESCAPE_ANGLE_THRESHOLD &&
    crisis.ticksInCrisis >= UTCHARI_MIN_TICKS_IN_CRISIS
  ) {
    return "utchari";
  }

  // okuridashi: defender beat the attacker to the edge — rear-position
  // pressure plus the defender still moving outward under their own drive.
  if (
    Math.abs(crisis.opponentPressureZ) > OKURIDASHI_PRESSURE_Z_THRESHOLD &&
    Math.abs(defenderBody.velocityX) > VELOCITY_EDGE_EXIT_THRESHOLD
  ) {
    return "okuridashi";
  }

  // okuritaoshi: belt-driven exit with the attacker carrying lateral angle.
  if (fromBelt && Math.abs(crisis.opponentPressureZ) > OKURITAOSHI_PRESSURE_Z_THRESHOLD) {
    return "okuritaoshi";
  }

  // Remaining exits → weighted draw over the contextually-plausible endings
  // (yorikiri-dominant for belt exits, oshidashi/tsukidashi for push exits),
  // weights proportional to real-world makuuchi shares.
  return fromBelt ? classifyBeltExitKimarite(rng) : classifyPushExitKimarite(rng);
}
