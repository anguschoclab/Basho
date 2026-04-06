/**
 * src/engine/types/kimariteStrategy.ts
 * =====================================
 * Strategy Pattern types for kimarite (finishing technique) selection.
 *
 * After the physics engine determines a winner, determineKimarite() evaluates
 * all KimariteStrategy condition functions against the FinalBoutState and returns
 * the highest-weight matching technique ID.
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
 * Constructed from BoutResult + rikishi data in kimariteEvaluator.ts.
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
   * Pure evaluation function — no side effects.
   * @param winner  FinalBoutState for the winning rikishi.
   * @param loser   FinalBoutState for the losing rikishi.
   * @param ctx     Bout context (shared values like edge distance).
   */
  condition: (
    winner: FinalBoutState,
    loser: FinalBoutState,
    ctx: { edgeDistance: number }
  ) => boolean;
}
