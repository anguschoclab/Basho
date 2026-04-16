/**
 * src/engine/types/kimariteStrategy.ts
 * =====================================
 * Strategy Pattern types for kimarite (finishing technique) selection.
 *
 * Kept for legacy condition functions in KIMARITE_STRATEGIES (V1).
 * The B+ spatial classifier (kimariteClassifier.ts) is the active path.
 * KIMARITE_STRATEGIES_V2 conditions will migrate to spatial logic in a future pass.
 */

export type KimariteCategory =
  | "kihon"
  | "nage"
  | "kake"
  | "sori"
  | "hineri"
  | "tokushu"
  | "hi_waza"
  | "kinjite";

/**
 * Snapshot of both fighters' state at the moment the bout ends.
 * Snapshot of both fighters' state at bout resolution (legacy evaluator format).
 */
export interface FinalBoutState {
  /** Grip classification derived from bout stance + grapple state. */
  grip: "uwate" | "shitate" | "morozashi" | "none";
  /** Primary fighting style of this rikishi. */
  style: "oshi" | "yotsu" | "hybrid";
  /** Raw power stat (0–100). */
  power: number;
  /** Raw balance stat — represents resistance to being thrown (0–100). */
  balanceResistance: number;
  /** Positive = pushing forward into opponent; 0 = neutral. Derived from duration + style. */
  forwardMomentum: number;
  /** Positive = winner was actively attacking on final tick; 0 = no offensive action (hi_waza trigger). */
  offensiveOutput: number;
  /** Balance remaining: 0 = has fallen / lost footing; >0 = stable. */
  balance: number;
  /** Stamina fraction remaining (0.0–1.0). */
  stamina: number;
  /** Estimated ring position: 0 = at tawara (edge), higher = nearer center. */
  edgeDistance: number;
  /** B+ spatial: center of gravity offset from foot spread center (meters). */
  cogOffset?: number;
  /** B+ spatial: distance from ring center (meters). */
  distanceFromCenter?: number;
  /** B+ spatial: whether in edge crisis state. */
  inEdgeCrisis?: boolean;
  /** B+ spatial: grip depth classification. */
  gripDepth?: "shallow" | "standard" | "deep" | "maemitsu";
  /** B+ spatial: net torque applied to opponent. */
  torque?: number;
  /** B+ spatial: position of leading foot from center (meters). */
  leadFootX?: number;
  /** B+ spatial: momentum in X direction (m/s). */
  momentumX?: number;
  /** B+ spatial: grip class. */
  gripClass?: "uwate" | "shitate" | "morozashi" | "outside" | "none";
}

/**
 * B+ Spatial context for kimarite evaluation.
 * Provides cross-fighter spatial relationships.
 */
export interface SpatialBoutContext {
  edgeDistance: number;
  /** East rikishi leading foot position (meters from center). */
  eastLeadFoot: number;
  /** West rikishi leading foot position (meters from center). */
  westLeadFoot: number;
  /** East rikishi center of gravity offset (meters). */
  eastCoGOffset: number;
  /** West rikishi center of gravity offset (meters). */
  westCoGOffset: number;
  /** East rikishi momentum in X direction (m/s). */
  eastMomentumX: number;
  /** West rikishi momentum in X direction (m/s). */
  westMomentumX: number;
  /** East rikishi grip class. */
  eastGrip: "uwate" | "shitate" | "morozashi" | "outside" | "none";
  /** West rikishi grip class. */
  westGrip: "uwate" | "shitate" | "morozashi" | "outside" | "none";
  /** Net torque differential: positive = east advantage (optional — B+ belt battle only). */
  torqueDiff?: number;
  /** True when either fighter's lead foot is near the tawara boundary. */
  atEdge?: boolean;
}

/**
 * A single entry in the exhaustive kimarite strategy registry.
 * The evaluator filters all strategies by condition() === true, then
 * returns the highest-weight match.
 */
export interface KimariteStrategy {
  id: string;
  name: string;
  japaneseName: string;
  category: KimariteCategory;
  /**
   * Selection priority when multiple strategies match.
   * Higher weights take precedence. Range: 1–100.
   */
  weight: number;
  /**
   * B+ spatial: Which combat phases this technique applies to.
   * If undefined, applies to all phases (legacy behavior).
   */
  appliesTo?: ("push_battle" | "belt_battle" | "edge_crisis")[];
  /**
   * Pure evaluation function — no side effects.
   * @param winner  FinalBoutState for the winning rikishi.
   * @param loser   FinalBoutState for the losing rikishi.
   * @param ctx     Bout context (shared values like edge distance).
   */
  condition: (
    winner: FinalBoutState,
    loser: FinalBoutState,
    ctx: { edgeDistance: number } | SpatialBoutContext
  ) => boolean;
}
