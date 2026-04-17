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
  division: Division,
  meta: { tone: string; drift: Record<string, number> }
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
  };

  // Delegate all selection logic to the registry-driven engine
  // This replaces the old hardcoded 'classifyEdgeKimarite', 'classifyBeltKimarite', etc.
  return KimariteSelectionEngine.evaluate(east, west, st, ctx, division, meta, rng);
}
