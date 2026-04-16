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

function stat(r: Rikishi, key: string, fallback = 50): number {
  const v = (r as unknown as Record<string, unknown>)[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export function initPhysicalBody(rikishi: Rikishi, side: Side): PhysicalBody {
  const x = side === "east" ? SHIKIRISEN_OFFSET : -SHIKIRISEN_OFFSET;
  const facingAngle = side === "east" ? Math.PI : 0;
  const mass = 80 + stat(rikishi, "weight", 120) * 1.2;
  const cogHeight = stat(rikishi, "height", 180) * 0.01 * 0.54;
  const footSpread = 0.35 + (stat(rikishi, "balance") / 100) * 0.15;

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
  if (toePos < 0.5) return 15.0;
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
  let force = power * (w.strength || 0.5) + weight * (w.weight || 0.3);
  // Fatigue penalty: -0.4% per fatigue point (same curve as old engine)
  force *= Math.max(0.6, 1 - fatigue * 0.004);

  return Math.max(1, force);
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
  const jitter = (rng.next() - 0.5) * 0.1;
  return baseAngle + jitter;
}

export function deriveGripClass(left: HandGrip | null, right: HandGrip | null): GripClass {
  const insideCount = (left?.isInside ? 1 : 0) + (right?.isInside ? 1 : 0);

  // Both arms inside = morozashi (most dominant grip)
  if (insideCount === 2) return "morozashi";
  // One arm inside: deep reach = uwate (dominant inside), shallow = shitate (weaker inside)
  if (insideCount === 1) {
    const insideGrip = left?.isInside ? left : right;
    return (insideGrip?.armReach ?? 0) > 0.12 ? "uwate" : "shitate";
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
  if (momentum > 15) return "oshitaoshi";
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

  if (winnerTorque > 20) {
    // High-torque throw: uwate (outside arm over) or shitate (inside arm under)
    return winnerGrip === "uwate" || winnerGrip === "morozashi" ? "uwatenage" : "shitatenage";
  }

  // E2: kotenage (arm-lock throw) when winner has shitate grip and moderate torque
  if (winnerGrip === "shitate" && winnerTorque > 10 && winnerTorque <= 20) {
    return "kotenage";
  }

  // E2: sukuinage (underarm throw) when winner has uwate grip and moderate torque
  if (winnerGrip === "uwate" && winnerTorque > 10 && winnerTorque <= 20) {
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
  if (Math.abs(defenderBody.velocityX) > 0.5) {
    return "okuridashi";
  }

  if (fromBelt) {
    // Belt-driven edge exit: walk-out (yorikiri) or throw-down (yoritaoshi)
    return crisis.ticksInCrisis > 4 ? "yoritaoshi" : "yorikiri";
  }

  // Push-driven edge exit: clean push-out or thrust variant
  if (crisis.ticksInCrisis <= 2) return "oshidashi";
  return rng.next() < 0.25 ? "tsukidashi" : "oshidashi";
}
