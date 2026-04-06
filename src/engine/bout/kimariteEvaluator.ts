/**
 * src/engine/bout/kimariteEvaluator.ts
 * ======================================
 * Post-physics kimarite override. After resolveBoutPhysics() determines a
 * winner, determineKimarite() evaluates every KimariteStrategy condition
 * against a FinalBoutState constructed from the bout's EngineSnapshot and
 * the rikishi attribute values, then returns the highest-weight matching
 * technique ID.
 */

import type { BoutResult } from "../types/basho";
import type { Rikishi } from "../types/rikishi";
import type { Stance, GrappleState } from "../types/combat";
import type { FinalBoutState } from "../types/kimariteStrategy";
import { KIMARITE_STRATEGIES } from "./kimariteStrategy";
import { KIMARITE_REGISTRY } from "../kimarite";

// ── EngineSnapshot ─────────────────────────────────────────────────────────

/**
 * Minimal slice of EngineState that kimariteEvaluator needs.
 * Extracted from resolveBoutPhysics before the result is returned.
 */
export interface EngineSnapshot {
  stance: Stance;
  grappleState: GrappleState;
  balanceEast: number;
  balanceWest: number;
}

// ── Grip derivation ────────────────────────────────────────────────────────

function deriveGrip(
  side: "east" | "west",
  stance: Stance,
  grapple: GrappleState
): FinalBoutState["grip"] {
  const ga = grapple.gripAdvantage;

  if (side === "east") {
    if (ga === "moro_zashi_east") return "morozashi";
    if (ga === "east_strong") return "uwate";
    if (ga === "west_strong") return "shitate";
    if (ga === "moro_zashi_west") return "none";
  } else {
    if (ga === "moro_zashi_west") return "morozashi";
    if (ga === "west_strong") return "uwate";
    if (ga === "east_strong") return "shitate";
    if (ga === "moro_zashi_east") return "none";
  }

  // Neutral grip advantage — derive from final stance
  if (stance === "no-grip" || stance === "push-dominant") return "none";
  return "shitate"; // belt-dominant, migi-yotsu, hidari-yotsu
}

// ── Edge-distance estimate ─────────────────────────────────────────────────

/** Returns 0 if the current kimarite is a force-out type, otherwise a rough
 *  center-distance estimate derived from bout duration. */
function estimateEdgeDistance(boutResult: BoutResult): number {
  const k = KIMARITE_REGISTRY.find((k) => k.id === boutResult.kimarite);
  const isForceOut =
    k?.kimariteClass === "force_out" || k?.kimariteClass === "slap_pull";
  if (isForceOut) return 0;
  // Longer bouts drift toward the center; cap at 15 (units match strategy thresholds)
  return Math.min(boutResult.duration * 0.5, 15);
}

// ── FinalBoutState builder ─────────────────────────────────────────────────

function buildFinalBoutState(
  side: "east" | "west",
  rikishi: Rikishi,
  isWinner: boolean,
  boutResult: BoutResult,
  snapshot: EngineSnapshot
): FinalBoutState {
  const runtimeBalance =
    side === "east" ? snapshot.balanceEast : snapshot.balanceWest;

  return {
    grip: deriveGrip(side, snapshot.stance, snapshot.grappleState),
    style: rikishi.style,
    power: rikishi.power ?? 50,
    balanceResistance: rikishi.balance ?? 50,
    forwardMomentum: isWinner ? boutResult.duration : 0,
    offensiveOutput: isWinner ? 1 : 0,
    balance: isWinner ? Math.max(runtimeBalance, 1) : 0,
    stamina: Math.max(0, 1 - (rikishi.fatigue ?? 0) / 100),
    edgeDistance: estimateEdgeDistance(boutResult),
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Determines the most contextually appropriate kimarite for a completed bout.
 *
 * @param boutResult      Result from resolveBoutPhysics (contains current kimarite).
 * @param winnerRikishi   The winning rikishi.
 * @param loserRikishi    The losing rikishi.
 * @param engineSnapshot  Optional engine state at the moment the bout ended.
 *                        If omitted, boutResult.kimarite is returned unchanged.
 * @returns The id of the selected kimarite technique.
 */
export function determineKimarite(
  boutResult: BoutResult,
  winnerRikishi: Rikishi,
  loserRikishi: Rikishi,
  engineSnapshot?: EngineSnapshot
): string {
  if (!engineSnapshot) return boutResult.kimarite;

  const winnerSide = boutResult.winner;
  const loserSide = winnerSide === "east" ? "west" : "east";

  const winnerState = buildFinalBoutState(
    winnerSide,
    winnerRikishi,
    true,
    boutResult,
    engineSnapshot
  );
  const loserState = buildFinalBoutState(
    loserSide,
    loserRikishi,
    false,
    boutResult,
    engineSnapshot
  );

  const ctx = { edgeDistance: loserState.edgeDistance };

  // Filter strategies whose condition evaluates to true
  const eligible = KIMARITE_STRATEGIES.filter((s) => {
    try {
      return s.condition(winnerState, loserState, ctx);
    } catch {
      return false;
    }
  });

  if (eligible.length === 0) return boutResult.kimarite;

  // Return the highest-weight matching strategy
  eligible.sort((a, b) => b.weight - a.weight);
  return eligible[0].id;
}
