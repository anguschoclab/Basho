/**
 * combat-spatial.ts
 * ===================
 * Spatial types for the B+ combat system.
 * Defines physical body state, grip mechanics, and phase-based combat state machine.
 */

import type { Side } from "../types/banzuke";
import type { KimariteId } from "./combat";
import type { GrappleState } from "./combat";

// ---------------------------------------------------------------------------
// Spatial Constants
// ---------------------------------------------------------------------------

export const RING_RADIUS = 4.55; // meters
export const TAWARA_RADIUS = 4.55; // same — inner edge of tawara
export const SHIKIRISEN_OFFSET = 0.7; // meters from center
export const EDGE_THRESHOLD = 3.8; // meters — edge crisis trigger distance

// ---------------------------------------------------------------------------
// Physical Body Types
// ---------------------------------------------------------------------------

export interface PhysicalBody {
  /** Position in meters from ring center (x = east-west axis, z = north-south axis) */
  x: number;
  z: number;
  /** Facing angle in radians (0 = facing east, π = facing west) */
  facingAngle: number;
  /** Mass in kg (derived from weight stat) */
  mass: number;
  /** Center of gravity height in meters */
  cogHeight: number;
  /** Center of gravity offset from center of foot base (meters) */
  cogOffset: number;
  /** Distance between feet (meters) */
  footSpread: number;
  /** Position of leading foot from center (meters) */
  leadingFootX: number;
  /** Velocity vector (m/s) */
  velocityX: number;
  velocityZ: number;
  /** Is the body falling (cogOffset exceeds footSpread/2)? */
  isFalling: boolean;
}

// ---------------------------------------------------------------------------
// Grip Types
// ---------------------------------------------------------------------------

export interface HandGrip {
  /** Arm reach in meters */
  armReach: number;
  /** Is this arm inside the opponent's arm? */
  isInside: boolean;
  /** Lever arm distance in meters */
  leverArm: number;
  /** Grip strength (0.0–1.0, decays with fatigue) */
  gripStrength: number;
  /** Is this grip blocked (opponent's arm prevents torque)? */
  isBlocked: boolean;
}

export type GripDepthV2 = "shallow" | "standard" | "deep" | "maemitsu";

export type GripClass = "uwate" | "shitate" | "outside" | "none";

export interface BeltBattleState {
  eastLeft: HandGrip | null;
  eastRight: HandGrip | null;
  westLeft: HandGrip | null;
  westRight: HandGrip | null;
  eastGripClass: GripClass;
  westGripClass: GripClass;
  eastDepth: GripDepthV2;
  westDepth: GripDepthV2;
  torqueEast: number;
  torqueWest: number;
}

// ---------------------------------------------------------------------------
// Push Battle Types
// ---------------------------------------------------------------------------

export interface PushBattleState {
  /** Net force on east (positive = east advantage) */
  contestLine: number;
  eastForce: number;
  westForce: number;
  eastLeadFoot: number;
  westLeadFoot: number;
  eastMomentum: number;
  westMomentum: number;
}

// ---------------------------------------------------------------------------
// Edge Crisis Types
// ---------------------------------------------------------------------------

export interface EdgeCrisisState {
  side: Side;
  /** Position of toe at tawara (meters from center) */
  tawaraToePosition: number;
  /** Force pushing toward tawara */
  tawaraBounceForce: number;
  /** Angle of escape attempt (radians) */
  escapeAngle: number;
  /** Available force to escape */
  escapeForceAvailable: number;
  /** Opponent's pressure toward edge */
  opponentPressureX: number;
  opponentPressureZ: number;
  /** Probability of recovery (0.0–1.0) */
  recoveryProbability: number;
  /** How long in crisis (ticks) */
  ticksInCrisis: number;
  /** Whether the rikishi escaped from the edge */
  escaped: boolean;
}

// ---------------------------------------------------------------------------
// Combat Phase Types
// ---------------------------------------------------------------------------

export type CombatPhase =
  | { tag: "approach" }
  | { tag: "tachiai"; impactVelocity: number; contactAngle: number }
  | { tag: "push_battle"; state: PushBattleState }
  | { tag: "belt_battle"; state: BeltBattleState; push: PushBattleState }
  | { tag: "edge_crisis"; crisis: EdgeCrisisState; prev: "push_battle" | "belt_battle" }
  | { tag: "resolved"; winner: Side; exitVector: { x: number; z: number }; technique: KimariteId };

// ---------------------------------------------------------------------------
// Engine State Types
// ---------------------------------------------------------------------------

export interface EngineStateV2 {
  tick: number;
  phase: CombatPhase;
  east: PhysicalBody;
  west: PhysicalBody;
  grappleState: GrappleState;
}

// ---------------------------------------------------------------------------
// Extended Bout Log Types
// ---------------------------------------------------------------------------

export interface BoutLogEntryV2 {
  phase: "approach" | "tachiai" | "push_battle" | "belt_battle" | "edge_crisis" | "resolved";
  tick?: number;
  data: Record<string, unknown>;
  spatialData?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Spatial Context Types
// ---------------------------------------------------------------------------

export interface SpatialBoutContext {
  eastLeadFoot: number;
  westLeadFoot: number;
  eastCoGOffset: number;
  westCoGOffset: number;
  eastMomentumX: number;
  westMomentumX: number;
  eastGrip: GripClass;
  westGrip: GripClass;
}

// ---------------------------------------------------------------------------
// Kimarite Attempt Types
// ---------------------------------------------------------------------------

export interface KimariteAttempt {
  technique: KimariteId;
  side: Side;
  successProbability: number;
  requiredConditions: string[];
}
