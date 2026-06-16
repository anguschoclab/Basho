import type { Rikishi } from "../types/rikishi";
import { SeededRNG } from "../rng";
import type { Division } from "../types/banzuke";
import type {
  PushBattleState,
  BeltBattleState,
  EngineStateV2,
  KimariteAttempt,
  SpatialBoutContext,
} from "../types/combat-spatial";
import { EDGE_THRESHOLD } from "../types/combat-spatial";
import { KimariteSelectionEngine } from "./KimariteSelectionEngine";

/**
 * Evaluates whether a kimarite technique can be attempted mid-fight
 * based on the current spatial state and combat actions.
 *
 * Refactored for P0-E: Delegated to KimariteSelectionEngine for
 * exhaustive registry-based selection and execution difficulty.
 */
export function evaluateKimariteAttempt(
  east: Rikishi,
  west: Rikishi,
  push: PushBattleState | null,
  belt: BeltBattleState | null,
  st: EngineStateV2,
  rng: SeededRNG,
  division?: Division,
  meta?: { tone: string; drift: Record<string, number> },
  playerTactic?: import("../types/combat").BoutTactic
): KimariteAttempt | null {
  // Build spatial context
  const torqueDiff = belt ? belt.torqueEast - belt.torqueWest : 0;

  const ctx: SpatialBoutContext = {
    eastLeadFoot: st.east.leadingFootX,
    westLeadFoot: st.west.leadingFootX,
    eastCoGOffset: st.east.cogOffset,
    westCoGOffset: st.west.cogOffset,
    eastMomentumX: st.east.velocityX,
    westMomentumX: st.west.velocityX,
    eastGrip: belt?.eastGripClass ?? "none",
    westGrip: belt?.westGripClass ?? "none",
    torqueDiff,
    atEdge:
      Math.abs(st.east.leadingFootX) > EDGE_THRESHOLD ||
      Math.abs(st.west.leadingFootX) > EDGE_THRESHOLD,
    lateralOffsetDiff: push ? push.eastLateral - push.westLateral : 0,
    engagementAngle: Math.abs(st.east.facingAngle - st.west.facingAngle),
    angularAdvantage: belt ? belt.eastAngularAuthority - belt.westAngularAuthority : 0,
  };

  const stClone: EngineStateV2 = {
    ...st,
    phase:
      st.phase.tag === "belt_battle" && belt
        ? { ...st.phase, state: belt }
        : st.phase.tag === "push_battle" && push
          ? { ...st.phase, state: push }
          : st.phase,
  };

  // Delegate all selection logic to the registry-driven engine
  // This replaces the old hardcoded 'classifyEdgeKimarite', 'classifyBeltKimarite', etc.
  return KimariteSelectionEngine.evaluate(east, west, stClone, ctx, division, meta, rng, playerTactic);
}
