/**
 * resolution/officiating.ts
 * =========================
 * Post-physics officiating: kinjite (hansoku) disqualification checks,
 * the fouled-heya scandal, and yaocho (match-fixing) detection.
 * Only active for player bouts to keep long-term sims deterministic.
 */

import type { BoutContext } from "../boutPhysics";
import type { Rikishi } from "../../types/rikishi";
import type { BashoState, BoutResult } from "../../types/basho";
import type { WorldState } from "../../types/world";
import type { BoutTactic } from "../../types/combat";
import type { ImpactBuilder } from "../../core/ImpactBuilder";
import { tryHansoku } from "../kinjite";
import { checkYaocho } from "../yaocho";
import { reportScandal } from "../../systems/governance/ScandalService";

export interface OfficiatingOutcome {
  result: BoutResult;
  /** Heya that loses a rikishi to hansoku, when a foul occurred. */
  fouledHeyaId: string | null;
  /** Whether the bout was a player bout (kinjite/yaocho enabled). */
  enableKinjite: boolean;
  /** Deterministic seed stem used for kinjite and yaocho rolls. */
  hansokuSeed: string;
}

/**
 * Run the kinjite check and, when enabled, merge the fouled-heya scandal
 * and the yaocho detection impact into the bout builder.
 */
export function applyOfficiating(
  bout: BoutContext,
  physicsResult: BoutResult,
  eastBout: Rikishi,
  westBout: Rikishi,
  basho: BashoState,
  eastTactic: BoutTactic | undefined,
  westTactic: BoutTactic | undefined,
  world: WorldState | undefined,
  builder: ImpactBuilder
): OfficiatingOutcome {
  // 1.5. Kinjite (forbidden technique) check — high-aggression/low-technique
  // winner may be disqualified via hansoku, flipping the result.
  // Only active for player bouts (not AutoSim observer mode) to avoid
  // disrupting long-term deterministic simulations.
  const hansokuSeed = `${basho.id ?? "basho"}-${bout.id}-kinjite`;
  const enableKinjite = bout.playerSide !== undefined;
  const { result: hansokuResult, fouledHeyaId } = enableKinjite
    ? tryHansoku(bout, physicsResult, eastBout, westBout, basho, hansokuSeed)
    : { result: physicsResult, fouledHeyaId: null };
  const result = hansokuResult;
  // Record resolved per-side tactics for observability, UI, and tests.
  if (eastTactic || westTactic) {
    result.tactics = { east: eastTactic, west: westTactic };
  }

  // Trigger scandal for the fouled rikishi's heya
  if (fouledHeyaId && world) {
    const scandalImpact = reportScandal(
      world,
      fouledHeyaId,
      "major",
      "Forbidden technique (hansoku) disqualification"
    );
    builder.merge(scandalImpact);
  }

  // 1.6. Yaocho (match-fixing) detection — checks for suspicious patterns
  if (world && enableKinjite) {
    const yaochoImpact = checkYaocho(world, result, basho, bout.day ?? 1, `${hansokuSeed}-yaocho`);
    builder.merge(yaochoImpact);
  }

  return { result, fouledHeyaId, enableKinjite, hansokuSeed };
}
