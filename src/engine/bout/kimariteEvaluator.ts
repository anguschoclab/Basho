/**
 * src/engine/bout/kimariteEvaluator.ts
 * ======================================
 * Post-physics kimarite override. After resolveBoutPhysics() determines a
 * winner, determineKimarite() evaluates every KimariteStrategy condition
 * against a FinalBoutState constructed from the bout's EngineSnapshot and
 * the rikishi attribute values, then returns a stochastic weighted selection
 * from the top-N matching techniques.
 *
 * v4.1 fixes:
 *   - loser.forwardMomentum now reflects actual over-commitment (was hardcoded 0)
 *   - offensiveOutput is now fractional 0-1 (was binary — broke passive-win kimarite)
 *   - edgeDistance now derived from real balance ratios (not bout duration proxy)
 *   - determineKimarite uses seeded weighted draw (was always highest-weight-wins)
 *   - EngineSnapshot enriched with position, advantage streak, loser action data
 */

import type { BoutResult } from "../types/basho";
import type { Rikishi } from "../types/rikishi";
import type { Stance, GrappleState, TacticalFamily } from "../types/combat";
import type { Position, Advantage } from "./boutPhysics";
import type { FinalBoutState } from "../types/kimariteStrategy";
import { KIMARITE_STRATEGIES } from "./kimariteStrategy";
import { rngFromSeed } from "../rng";

// ── EngineSnapshot ─────────────────────────────────────────────────────────

/**
 * Enriched slice of EngineState extracted by resolveBoutPhysics.
 * All fields needed by kimariteEvaluator to produce a realistic distribution.
 */
export interface EngineSnapshot {
  stance: Stance;
  grappleState: GrappleState;
  balanceEast: number;
  balanceWest: number;
  // v4.1 additions:
  position: Position;
  advantage: Advantage;
  winnerConsecutiveAdvantage: number; // ticks where winner held continuous advantage
  loserLastActionFamily?: TacticalFamily; // push/speed = over-committing
  finalLoserBalanceDrain: number;         // damage on fatal tick
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

/**
 * Derives edge distance from remaining balance ratios rather than the old
 * `duration * 0.5` proxy (which produced wildly incorrect values).
 *
 * Low remaining loser balance → at edge (being pushed out).
 * High remaining loser balance → center ring (threw or dominated from center).
 */
function estimateEdgeDistance(
  loserBalance: number,
  winnerBalance: number
): number {
  // Loser balance at/near 0 = being driven to edge. Higher = center win.
  // Scale: 0 (at tawara) to 15+ (center ring).
  const loserPct = Math.max(0, loserBalance) / 100; // normalize to 0-1
  return Math.min(15, loserPct * 20); // 0 balance → 0 distance, 75+ balance → 15
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
  const opponentBalance =
    side === "east" ? snapshot.balanceWest : snapshot.balanceEast;

  // over-committing: loser was attacking (push/speed family) when they lost
  const loserWasOverCommitting =
    !isWinner &&
    (snapshot.loserLastActionFamily === "push" ||
      snapshot.loserLastActionFamily === "speed");

  // passive win: winner's advantage was minimal (< 2 ticks consecutive)
  const wasPassiveWin =
    isWinner && snapshot.winnerConsecutiveAdvantage <= 2;

  return {
    grip: deriveGrip(side, snapshot.stance, snapshot.grappleState),
    style: rikishi.style,
    power: rikishi.power ?? 50,
    balanceResistance: rikishi.balance ?? 50,

    // forwardMomentum: winner gets streak count; loser gets 1 if they were pushing, else 0
    forwardMomentum: isWinner
      ? snapshot.winnerConsecutiveAdvantage
      : loserWasOverCommitting ? 1 : 0,

    // offensiveOutput: 0 = passive win (utchari, isamiashi eligible), 1 = dominant
    offensiveOutput: isWinner
      ? wasPassiveWin ? 0 : Math.min(1, snapshot.winnerConsecutiveAdvantage / 5)
      : 0,

    balance: isWinner ? Math.max(runtimeBalance, 1) : 0,
    stamina: Math.max(0, 1 - ((rikishi.fatigue ?? 0) / 100)),

    // edgeDistance: derived from actual balance (not duration guess)
    edgeDistance: estimateEdgeDistance(
      isWinner ? opponentBalance : runtimeBalance,
      isWinner ? runtimeBalance : opponentBalance
    ),
  };
}

// ── Seeded stochastic selection ───────────────────────────────────────────

/**
 * Weighted random draw from eligible kimarite strategies using a seeded RNG
 * derived from the boutId. Fully deterministic but produces variety across
 * different bouts rather than always returning highest-weight.
 *
 * Pulls from the top 5 eligible strategies to keep selection meaningful.
 */
function stochasticKimariteSelect(
  eligible: typeof KIMARITE_STRATEGIES,
  boutId: string
): string {
  if (eligible.length === 0) return "";

  // Sort by weight and take top 5
  const sorted = [...eligible].sort((a, b) => b.weight - a.weight);
  const top = sorted.slice(0, Math.min(5, sorted.length));

  const totalWeight = top.reduce((s, k) => s + k.weight, 0);

  // Seeded draw — deterministic per boutId but varied across bouts
  const rng = rngFromSeed(boutId, "kimarite", "select");
  const roll = rng.next() * totalWeight;

  let cumulative = 0;
  for (const k of top) {
    cumulative += k.weight;
    if (roll < cumulative) return k.id;
  }
  return top[0].id;
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

  // Stochastic weighted draw (seeded by boutId for determinism)
  const selectedId = stochasticKimariteSelect(eligible, boutResult.boutId);
  return selectedId || boutResult.kimarite;
}
