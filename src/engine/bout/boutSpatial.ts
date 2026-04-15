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
  stanceWidth: number,
  fatigue: number
): number {
  const strength = stat(rikishi, "strength");
  const weight = stat(rikishi, "weight");
  const w = action.statWeighting;

  let force = strength * (w.strength || 0) + weight * (w.weight || 0);
  force *= 1 - fatigue * 0.004;
  force *= stanceWidth;

  return Math.max(0, force);
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

  if (insideCount === 2) return "uwate";
  if (insideCount === 1) return "shitate";
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
  const torque = fallenSide === "east" ? belt.torqueEast : belt.torqueWest;
  if (torque > 20) return "uwatenage";
  return "yoritaoshi";
}

export function classifyEdgeExitKimarite(
  crisis: EdgeCrisisState,
  _st: EngineStateV2,
  _rng: SeededRNG
): KimariteId {
  // eslint-disable-line @typescript-eslint/no-unused-vars
  if (crisis.escaped) return "koshikudake";
  if (crisis.recoveryProbability < 0.1) return "yorikiri";
  return "oshidashi";
}
